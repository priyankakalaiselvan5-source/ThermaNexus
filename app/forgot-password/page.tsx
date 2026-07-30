'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Snowflake, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Password reset instructions sent');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Snowflake className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold">ThermaNeXus</p>
            <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
          </div>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <p className="text-sm text-muted-foreground">
              {sent ? 'Check your email for reset instructions' : 'Enter your email to receive reset instructions'}
            </p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent reset instructions to<br /><span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
                <Link href="/login"><Button variant="outline" className="w-full gap-2"><ArrowLeft className="h-4 w-4" /> Back to login</Button></Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@organization.ai" required />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary text-white gap-2" disabled={loading}>
                  {loading ? 'Sending...' : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
                </Button>
                <Link href="/login"><Button variant="ghost" className="w-full gap-2"><ArrowLeft className="h-4 w-4" /> Back to login</Button></Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
