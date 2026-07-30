'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Users, Search, Star, Phone, Mail, MapPin, Plus, Truck,
  Award, ShieldCheck, Navigation, Pencil, Trash2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/use-notifications';
import type { Driver } from '@/types';

interface VehicleOption {
  id: string;
  registration_number: string;
  status: string;
}

export default function DriversPage() {
  const { profile } = useAuth();
  const { addCRUDNotification } = useNotifications();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [deleteDriver, setDeleteDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    employee_id: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '',
    city: '',
    state: '',
    experience_years: '0',
    vehicle_assigned: '',
    status: 'available',
  });

  const loadDrivers = useCallback(async () => {
    const { data } = await supabase.from('drivers').select('*').order('rating', { ascending: false });
    if (data) setDrivers(data as Driver[]);
    setLoading(false);
  }, []);

  const loadVehicles = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('id, registration_number, status').order('registration_number');
    if (data) setVehicles(data);
  }, []);

  useEffect(() => {
    loadDrivers();
    loadVehicles();

    const sub = supabase
      .channel('drivers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => loadDrivers())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadDrivers, loadVehicles]);

  const filtered = drivers.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.employee_id?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: drivers.length,
    onDuty: drivers.filter(d => d.status === 'on_duty').length,
    available: drivers.filter(d => d.status === 'available').length,
    avgRating: drivers.length > 0 ? (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length) : 0,
  };

  function resetForm() {
    setForm({
      name: '', employee_id: '', phone: '', email: '', license_number: '',
      license_expiry: '', city: '', state: '', experience_years: '0',
      vehicle_assigned: '', status: 'available',
    });
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(driver: Driver) {
    setForm({
      name: driver.name,
      employee_id: driver.employee_id || '',
      phone: driver.phone || '',
      email: driver.email || '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry || '',
      city: driver.city || '',
      state: driver.state || '',
      experience_years: String(driver.experience_years || 0),
      vehicle_assigned: driver.vehicle_assigned || '',
      status: driver.status,
    });
    setEditDriver(driver);
  }

  async function handleSave(isEdit: boolean) {
    if (!form.name.trim()) {
      toast.error('Driver name is required');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        name: form.name.trim(),
        employee_id: form.employee_id.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        license_number: form.license_number.trim() || null,
        license_expiry: form.license_expiry || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        experience_years: parseInt(form.experience_years) || 0,
        vehicle_assigned: form.vehicle_assigned || null,
        status: form.status,
      };

      if (isEdit && editDriver) {
        const { error } = await supabase.from('drivers').update(data).eq('id', editDriver.id);
        if (error) throw error;
        toast.success('Driver updated successfully');
        setEditDriver(null);
      } else {
        const { error } = await supabase.from('drivers').insert(data);
        if (error) throw error;
        toast.success('Driver added successfully');
        addCRUDNotification('driver_added', 'Driver Added', `${data.name.trim()} has been added to the fleet.`);
        setAddOpen(false);
      }

      resetForm();
      await loadDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteDriver) return;

    setDeleting(true);
    try {
      // Check if driver has active shipments
      const { data: activeShipments } = await supabase
        .from('shipments')
        .select('id')
        .eq('driver_id', deleteDriver.id)
        .in('status', ['in_transit', 'dispatched', 'emergency'])
        .limit(1);

      if (activeShipments && activeShipments.length > 0) {
        toast.error('Cannot delete driver with active shipments. Reassign shipments first.');
        setDeleteDriver(null);
        return;
      }

      const { error } = await supabase.from('drivers').delete().eq('id', deleteDriver.id);
      if (error) throw error;

      toast.success('Driver deleted successfully');
      setDeleteDriver(null);
      await loadDrivers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete driver');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage driver profiles and assignments"
        icon={Users}
        action={<Button size="sm" className="gradient-primary text-white gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Driver</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Drivers', value: stats.total, icon: Users, color: 'text-primary bg-primary/10' },
          { label: 'On Duty', value: stats.onDuty, icon: Navigation, color: 'text-accent bg-accent/10' },
          { label: 'Available', value: stats.available, icon: ShieldCheck, color: 'text-success bg-success/10' },
          { label: 'Avg Rating', value: stats.avgRating, decimals: 1, icon: Star, color: 'text-warning bg-warning/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value.toFixed(s.decimals || 0)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or employee ID..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="on_duty">On Duty</SelectItem>
                <SelectItem value="off_duty">Off Duty</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading drivers...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No drivers found</CardContent></Card>
        ) : filtered.map(d => (
          <Card key={d.id} className="transition-all hover:shadow-premium-lg">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white">
                  {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.employee_id}</p>
                  <div className="mt-1.5"><StatusBadge status={d.status} /></div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDriver(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{d.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Deliveries</p>
                  <p className="font-semibold">{d.total_deliveries}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Safe Rate</p>
                  <p className="font-semibold text-success">
                    {d.total_deliveries > 0 ? ((d.safe_deliveries / d.total_deliveries) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Experience</p>
                  <p className="font-semibold">{d.experience_years || 0} yrs</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                {d.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {d.phone}
                  </div>
                )}
                {d.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {d.email}
                  </div>
                )}
                {d.city && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {d.city}, {d.state}
                  </div>
                )}
                {d.vehicle_assigned && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-3 w-3" /> {d.vehicle_assigned}
                  </div>
                )}
                {d.license_number && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="h-3 w-3" /> License: {d.license_number} (Exp: {formatDate(d.license_expiry)})
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Driver Dialog */}
      <Dialog open={addOpen || editDriver !== null} onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditDriver(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {editDriver ? 'Edit Driver' : 'Add Driver'}
            </DialogTitle>
            <DialogDescription>
              {editDriver ? `Update driver information for ${editDriver.name}` : 'Add a new driver to the fleet'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Driver ID / Employee ID</Label>
                <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>License Number</Label>
                <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} placeholder="DL-2025-00123" />
              </div>
              <div className="space-y-1.5">
                <Label>License Expiry</Label>
                <Input type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Experience (Years)</Label>
                <Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Assigned</Label>
                <Select value={form.vehicle_assigned} onValueChange={(v) => setForm({ ...form, vehicle_assigned: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vehicle assigned</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.registration_number}>{v.registration_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status / Availability</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_duty">On Duty</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditDriver(null); }}>Cancel</Button>
            <Button onClick={() => handleSave(editDriver !== null)} disabled={saving} className="gradient-primary text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving...' : editDriver ? 'Update Driver' : 'Add Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDriver !== null} onOpenChange={(v) => { if (!v) setDeleteDriver(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Driver
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDriver?.name}</strong> ({deleteDriver?.employee_id})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDriver(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Deleting...' : 'Delete Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
