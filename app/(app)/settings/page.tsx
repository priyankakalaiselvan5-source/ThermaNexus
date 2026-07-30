'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, User, Bell, Shield, Globe, Key,
  Building2, Lock, Mail, Phone, Save, Download, Eye, EyeOff,
  Smartphone, MessageSquare, Send, Slack, Users, Loader2, Camera,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/nav';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'driver', label: 'Driver' },
  { value: 'hospital', label: 'Hospital' },
];

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: 'administrator',
    theme: 'light' as 'light' | 'dark',
    language: 'en',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [notifications, setNotifications] = useState({
    email: true, sms: true, push: true, whatsapp: false, slack: false, teams: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        role: profile.role || 'administrator',
        theme: profile.dark_mode ? 'dark' : 'light',
        language: profile.language || 'en',
      });
      setAvatarUrl(profile.avatar_url || null);
      if (profile.notification_preferences) {
        setNotifications({
          email: profile.notification_preferences.email ?? true,
          sms: profile.notification_preferences.sms ?? true,
          push: profile.notification_preferences.push ?? true,
          whatsapp: profile.notification_preferences.whatsapp ?? false,
          slack: profile.notification_preferences.slack ?? false,
          teams: profile.notification_preferences.teams ?? false,
        });
      }
    }
  }, [profile]);

  const initials = (formData.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format';
    if (formData.phone && !/^[\d\s\+\-\(\)]+$/.test(formData.phone)) errs.phone = 'Invalid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (saving) return;
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }
    if (!profile?.id) {
      toast.error('Not logged in');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          company: formData.company.trim(),
          role: formData.role,
          dark_mode: formData.theme === 'dark',
          language: formData.language,
          notification_preferences: notifications,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile?.id) {
      toast.error('Not logged in');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${profile.id}/avatar-${Date.now()}.${ext}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          const oldPath = avatarUrl.split('/avatars/')[1];
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch {
          // ignore deletion errors
        }
      }

      setUploadProgress(25);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setUploadProgress(80);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast.success('Profile photo updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={SettingsIcon}
        action={
          <Button
            size="sm"
            className="gradient-primary text-white gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="theme" className="text-xs">Theme</TabsTrigger>
          <TabsTrigger value="org" className="text-xs">Organization</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                    ) : (
                      <><Camera className="h-3.5 w-3.5" /> Upload Photo</>
                    )}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full gradient-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {errors.name && <p className="text-xs text-critical">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {errors.email && <p className="text-xs text-critical">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {errors.phone && <p className="text-xs text-critical">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-colors',
                      formData.theme === 'light' ? 'border-primary' : 'border-border'
                    )}
                  >
                    <div className="h-16 rounded-lg bg-white border border-border" />
                    <p className="mt-2 text-sm font-semibold">Light</p>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-colors',
                      formData.theme === 'dark' ? 'border-primary' : 'border-border'
                    )}
                  >
                    <div className="h-16 rounded-lg bg-slate-900" />
                    <p className="mt-2 text-sm font-semibold">Dark</p>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => setFormData({ ...formData, language: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.native} ({l.label})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Organization Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2"><Label>Type</Label><Input defaultValue="Government" disabled /></div>
                <div className="space-y-2"><Label>Country</Label><Input defaultValue="India" /></div>
                <div className="space-y-2"><Label>State</Label><Input defaultValue="Delhi" /></div>
                <div className="space-y-2"><Label>Contact Email</Label><Input type="email" defaultValue="ops@mohlogistics.gov.in" /></div>
                <div className="space-y-2"><Label>Contact Phone</Label><Input defaultValue="+91 11 2456 7890" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 'email', label: 'Email Notifications', desc: 'Receive alerts via email', icon: Mail },
                { id: 'sms', label: 'SMS Notifications', desc: 'Receive alerts via SMS', icon: Smartphone },
                { id: 'push', label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
                { id: 'whatsapp', label: 'WhatsApp', desc: 'Send alerts via WhatsApp', icon: MessageSquare },
                { id: 'slack', label: 'Slack', desc: 'Post to Slack channel', icon: Slack },
                { id: 'teams', label: 'Microsoft Teams', desc: 'Post to Teams channel', icon: Users },
              ].map(n => (
                <div key={n.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <n.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications[n.id as keyof typeof notifications]}
                    onCheckedChange={(v) => setNotifications({ ...notifications, [n.id]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="rounded-xl bg-secondary/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-semibold">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add extra security to your account</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Badge variant="outline" className="justify-center gap-1 py-2 text-success"><Shield className="h-3 w-3" /> HIPAA Ready</Badge>
                <Badge variant="outline" className="justify-center gap-1 py-2 text-success"><Lock className="h-3 w-3" /> GDPR Ready</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">API Keys</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {['Gemini AI API', 'Groq API', 'Supabase API', 'OpenStreetMap API'].map(api => (
                <div key={api} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{api}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-0.5 text-xs">
                            {showApiKey ? 'sk-proj-abc123xyz789' : '••••••••••••••••'}
                          </code>
                          <button onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground">
                            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Rotate</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
