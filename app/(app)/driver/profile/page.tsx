'use client';

import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User, Phone, Mail, CreditCard, Truck, Star, Package, CheckCircle2, MapPin,
} from 'lucide-react';

export default function DriverProfilePage() {
  const { profile } = useAuth();
  const initials = (profile?.name || 'Driver').split(' ').map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Profile"
        description="Your driver information"
        icon={User}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <Avatar className="mx-auto h-24 w-24">
              <AvatarFallback className="gradient-primary text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold">{profile?.name || 'Driver'}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <Badge variant="outline" className="mt-3 bg-primary/10 text-primary">Driver</Badge>
            <div className="mt-4 flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-warning text-warning" />
              <span className="text-lg font-bold">4.8</span>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Full Name</span>
                  </div>
                  <p className="mt-1 font-medium">{profile?.name || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Phone</span>
                  </div>
                  <p className="mt-1 font-medium">{profile?.phone || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Email</span>
                  </div>
                  <p className="mt-1 font-medium">{profile?.email || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">License Number</span>
                  </div>
                  <p className="mt-1 font-medium">DL-0420190012345</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vehicle & Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Assigned Vehicle</span>
                  </div>
                  <p className="mt-1 font-medium">MH04SC1234 - Tata Ace</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Base City</span>
                  </div>
                  <p className="mt-1 font-medium">Mumbai, Maharashtra</p>
                </div>
                <div className="rounded-xl bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Today's Deliveries</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">3</p>
                </div>
                <div className="rounded-xl bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Safe Deliveries</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">247</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
