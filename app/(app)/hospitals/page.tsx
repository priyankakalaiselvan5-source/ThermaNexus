'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNotifications } from '@/hooks/use-notifications';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Building2, Search, MapPin, Phone, Mail, Bed, Snowflake, Plus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Hospital } from '@/types';

const STATUS_OPTIONS = ['active', 'inactive', 'emergency_only'];

interface NewHospitalForm {
  name: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  beds: string;
  cold_storage_capacity: string;
  emergency_available: boolean;
  status: string;
}

const EMPTY_FORM: NewHospitalForm = {
  name: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  beds: '100',
  cold_storage_capacity: '500',
  emergency_available: true,
  status: 'active',
};

export default function HospitalsPage() {
  const { addCRUDNotification } = useNotifications();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewHospitalForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof NewHospitalForm, string>>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('hospitals').select('*').order('name');
      if (data) setHospitals(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = hospitals.filter(h =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase())
  );

  function setField<K extends keyof NewHospitalForm>(key: K, value: NewHospitalForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof NewHospitalForm, string>> = {};
    if (!form.name.trim()) errs.name = 'Hospital name is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (form.latitude && isNaN(Number(form.latitude))) errs.latitude = 'Invalid latitude';
    if (form.longitude && isNaN(Number(form.longitude))) errs.longitude = 'Invalid longitude';
    if (form.contact_phone && !/^[+\d\s()-]{7,15}$/.test(form.contact_phone)) errs.contact_phone = 'Invalid phone number';
    if (!form.beds || isNaN(Number(form.beds)) || Number(form.beds) < 1) errs.beds = 'Valid bed count required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      address: form.address.trim() || null,
      beds: Number(form.beds),
      cold_storage_capacity: Number(form.cold_storage_capacity) || 0,
      emergency_available: form.emergency_available,
      status: form.status,
    };
    const { data, error } = await supabase.from('hospitals').insert([payload]).select().single();
    setSaving(false);
    if (error) {
      toast.error('Failed to add hospital: ' + error.message);
      return;
    }
    setHospitals(prev => [...prev, data as Hospital].sort((a, b) => a.name.localeCompare(b.name)));
    addCRUDNotification('hospital_added', 'Hospital Added', `${payload.name} (${payload.city}) added to the network.`);
    toast.success(`${payload.name} added successfully!`);
    setShowDialog(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospitals"
        description="Connected hospital network"
        icon={Building2}
        action={
          <Button size="sm" className="gradient-primary text-white gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" /> Add Hospital
          </Button>
        }
      />

      {/* Add Hospital Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Add New Hospital
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Hospital Name *</Label>
                <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="AIIMS New Delhi" className={cn(errors.name && 'border-critical')} />
                {errors.name && <p className="text-xs text-critical">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="New Delhi" className={cn(errors.city && 'border-critical')} />
                {errors.city && <p className="text-xs text-critical">{errors.city}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>State *</Label>
                <Input value={form.state} onChange={e => setField('state', e.target.value)} placeholder="Delhi" className={cn(errors.state && 'border-critical')} />
                {errors.state && <p className="text-xs text-critical">{errors.state}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input type="number" step="0.0001" value={form.latitude} onChange={e => setField('latitude', e.target.value)} placeholder="28.6139" className={cn(errors.latitude && 'border-critical')} />
                {errors.latitude && <p className="text-xs text-critical">{errors.latitude}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input type="number" step="0.0001" value={form.longitude} onChange={e => setField('longitude', e.target.value)} placeholder="77.2090" className={cn(errors.longitude && 'border-critical')} />
                {errors.longitude && <p className="text-xs text-critical">{errors.longitude}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Emergency Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => setField('contact_phone', e.target.value)} placeholder="+91 11 2658 8500" className={cn(errors.contact_phone && 'border-critical')} />
                {errors.contact_phone && <p className="text-xs text-critical">{errors.contact_phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => setField('contact_email', e.target.value)} placeholder="contact@hospital.gov.in" />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Ansari Nagar East, New Delhi – 110029" />
              </div>

              <div className="space-y-1.5">
                <Label>Total Beds *</Label>
                <Input type="number" value={form.beds} onChange={e => setField('beds', e.target.value)} placeholder="500" className={cn(errors.beds && 'border-critical')} />
                {errors.beds && <p className="text-xs text-critical">{errors.beds}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Cold Storage (litres)</Label>
                <Input type="number" value={form.cold_storage_capacity} onChange={e => setField('cold_storage_capacity', e.target.value)} placeholder="1000" />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Switch checked={form.emergency_available} onCheckedChange={v => setField('emergency_available', v)} />
                <Label className="cursor-pointer">Emergency Available 24/7</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setErrors({}); }}>Cancel</Button>
            <Button className="gradient-primary text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Add Hospital'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or city..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No hospitals found</CardContent></Card>
        ) : filtered.map(h => (
          <Card key={h.id} className="transition-all hover:shadow-premium-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-critical/10">
                    <Building2 className="h-5 w-5 text-critical" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.city}, {h.state}</p>
                  </div>
                </div>
                <StatusBadge status={h.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-secondary/50 p-2">
                  <Bed className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-1 text-sm font-bold">{h.beds}</p>
                  <p className="text-[10px] text-muted-foreground">Beds</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-2">
                  <Snowflake className="mx-auto h-4 w-4 text-accent" />
                  <p className="mt-1 text-sm font-bold">{h.cold_storage_capacity}</p>
                  <p className="text-[10px] text-muted-foreground">Cold L</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-2">
                  <Activity className="mx-auto h-4 w-4 text-success" />
                  <p className="mt-1 text-sm font-bold">{h.emergency_available ? 'Yes' : 'No'}</p>
                  <p className="text-[10px] text-muted-foreground">Emergency</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                {h.address && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {h.address}</div>}
                {h.contact_phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {h.contact_phone}</div>}
                {h.contact_email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {h.contact_email}</div>}
                {h.latitude && h.longitude && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3 text-primary" /> {Number(h.latitude).toFixed(4)}, {Number(h.longitude).toFixed(4)}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
