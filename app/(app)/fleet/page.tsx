'use client';

import { useMemo, useState } from 'react';
import { useData } from '@/hooks/use-data';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { PageHeader, StatusBadge } from '@/components/ui/page-components';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Truck, Search, Battery, Wrench, Cpu, MapPin, Activity, Plus,
  Navigation, Snowflake, Pencil, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import type { Vehicle } from '@/types';

const VEHICLE_TYPES = ['refrigerated_truck', 'van', 'mini_truck', 'tempo', 'motorcycle'];
const REFRIGERATION_TYPES = ['single_zone', 'dual_zone', 'multi_zone', 'cryogenic', 'passive_cooling'];
const STATUS_OPTIONS = ['available', 'in_use', 'maintenance', 'breakdown'];

interface NewVehicleForm {
  registration_number: string;
  type: string;
  capacity_kg: string;
  cooling_system: string;
  driver_id: string;
  current_location: string;
  status: string;
  make: string;
  model: string;
  year: string;
  min_temp_capacity: string;
  max_temp_capacity: string;
  last_maintenance_date: string;
}

const EMPTY_FORM: NewVehicleForm = {
  registration_number: '',
  type: 'refrigerated_truck',
  capacity_kg: '1000',
  cooling_system: 'single_zone',
  driver_id: '',
  current_location: '',
  status: 'available',
  make: '',
  model: '',
  year: String(new Date().getFullYear()),
  min_temp_capacity: '-20',
  max_temp_capacity: '8',
  last_maintenance_date: '',
};

export default function FleetPage() {
  const { vehicles, drivers, loading, createVehicle, updateVehicle, deleteVehicle } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewVehicleForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof NewVehicleForm, string>>>({});

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const driverOptions = useMemo(() => drivers.map(d => ({ id: d.id, name: d.name })), [drivers]);

  const filtered = useMemo(() => vehicles.filter(v => {
    if (search) {
      const q = search.toLowerCase();
      const matchesReg = v.registration_number?.toLowerCase().includes(q);
      const matchesMake = v.make?.toLowerCase().includes(q);
      const matchesLoc = v.current_location?.toLowerCase().includes(q);
      if (!matchesReg && !matchesMake && !matchesLoc) return false;
    }
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    return true;
  }), [vehicles, search, statusFilter]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    inUse: vehicles.filter(v => v.status === 'in_use').length,
    available: vehicles.filter(v => v.status === 'available').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance' || v.status === 'breakdown').length,
  }), [vehicles]);

  function setField(key: keyof NewVehicleForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof NewVehicleForm, string>> = {};
    if (!form.registration_number.trim()) errs.registration_number = 'Vehicle number is required';
    if (!form.type) errs.type = 'Vehicle type is required';
    if (!form.capacity_kg || isNaN(Number(form.capacity_kg))) errs.capacity_kg = 'Valid capacity is required';
    if (!form.cooling_system) errs.cooling_system = 'Refrigeration type is required';
    if (!form.status) errs.status = 'Status is required';
    if (Number(form.min_temp_capacity) >= Number(form.max_temp_capacity)) errs.min_temp_capacity = 'Min temp must be less than max';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function openAdd() {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditingVehicle(v);
    setForm({
      registration_number: v.registration_number ?? '',
      type: v.type ?? 'refrigerated_truck',
      capacity_kg: v.capacity_kg != null ? String(v.capacity_kg) : '1000',
      cooling_system: v.cooling_system ?? 'single_zone',
      driver_id: v.driver_id ?? '',
      current_location: v.current_location ?? '',
      status: v.status ?? 'available',
      make: v.make ?? '',
      model: v.model ?? '',
      year: v.year != null ? String(v.year) : String(new Date().getFullYear()),
      min_temp_capacity: v.min_temp_capacity != null ? String(v.min_temp_capacity) : '-20',
      max_temp_capacity: v.max_temp_capacity != null ? String(v.max_temp_capacity) : '8',
      last_maintenance_date: v.last_maintenance_date ?? '',
    });
    setErrors({});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      registration_number: form.registration_number.trim().toUpperCase(),
      type: form.type,
      capacity_kg: Number(form.capacity_kg),
      cooling_system: form.cooling_system,
      driver_id: form.driver_id || null,
      current_location: form.current_location.trim() || null,
      status: form.status,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: Number(form.year) || null,
      min_temp_capacity: Number(form.min_temp_capacity),
      max_temp_capacity: Number(form.max_temp_capacity),
      last_maintenance_date: form.last_maintenance_date || null,
    };

    try {
      if (editingVehicle) {
        const updated = await updateVehicle(editingVehicle.id, payload);
        if (!updated) throw new Error('Update failed');
        toast.success(`Vehicle ${payload.registration_number} updated successfully!`);
      } else {
        const insertPayload = { ...payload, battery_level: 100, gps_enabled: true, iot_sensors_enabled: true };
        const created = await createVehicle(insertPayload);
        if (!created) throw new Error('Create failed');
        toast.success(`Vehicle ${payload.registration_number} added successfully!`);
      }
      closeDialog();
    } catch {
      toast.error('Could not save vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await deleteVehicle(deleteTarget.id);
      if (!ok) throw new Error('Delete failed');
      toast.success(`Vehicle ${deleteTarget.registration_number} deleted successfully!`);
    } catch {
      toast.error('Could not delete vehicle. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        description="Manage vehicles and cooling systems"
        icon={Truck}
        action={
          <Button size="sm" className="gradient-primary text-white gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        }
      />

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Vehicle Number *</Label>
                <Input value={form.registration_number} onChange={e => setField('registration_number', e.target.value)} placeholder="MH-12-AB-1234" className={cn(errors.registration_number && 'border-critical')} />
                {errors.registration_number && <p className="text-xs text-critical">{errors.registration_number}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Vehicle Type *</Label>
                <Select value={form.type} onValueChange={v => setField('type', v)}>
                  <SelectTrigger className={cn(errors.type && 'border-critical')}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Capacity (kg) *</Label>
                <Input type="number" value={form.capacity_kg} onChange={e => setField('capacity_kg', e.target.value)} placeholder="1000" className={cn(errors.capacity_kg && 'border-critical')} />
                {errors.capacity_kg && <p className="text-xs text-critical">{errors.capacity_kg}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Refrigeration Type *</Label>
                <Select value={form.cooling_system} onValueChange={v => setField('cooling_system', v)}>
                  <SelectTrigger className={cn(errors.cooling_system && 'border-critical')}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFRIGERATION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assign Driver</Label>
                <Select value={form.driver_id || '__none__'} onValueChange={v => setField('driver_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {driverOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Current Location</Label>
                <Input value={form.current_location} onChange={e => setField('current_location', e.target.value)} placeholder="Delhi" />
              </div>

              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={v => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Make</Label>
                <Input value={form.make} onChange={e => setField('make', e.target.value)} placeholder="Tata" />
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input value={form.model} onChange={e => setField('model', e.target.value)} placeholder="Ace EV" />
              </div>

              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2024" />
              </div>

              <div className="space-y-1.5">
                <Label>Last Maintenance Date</Label>
                <Input type="date" value={form.last_maintenance_date} onChange={e => setField('last_maintenance_date', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Min Temp (°C) *</Label>
                <Input type="number" value={form.min_temp_capacity} onChange={e => setField('min_temp_capacity', e.target.value)} placeholder="-20" className={cn(errors.min_temp_capacity && 'border-critical')} />
                {errors.min_temp_capacity && <p className="text-xs text-critical">{errors.min_temp_capacity}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Max Temp (°C) *</Label>
                <Input type="number" value={form.max_temp_capacity} onChange={e => setField('max_temp_capacity', e.target.value)} placeholder="8" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button className="gradient-primary text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.registration_number}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-critical text-white hover:bg-critical/90"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Vehicles', value: stats.total, icon: Truck, color: 'text-primary bg-primary/10' },
          { label: 'In Use', value: stats.inUse, icon: Navigation, color: 'text-accent bg-accent/10' },
          { label: 'Available', value: stats.available, icon: Activity, color: 'text-success bg-success/10' },
          { label: 'Maintenance', value: stats.maintenance, icon: Wrench, color: 'text-warning bg-warning/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by registration, make, or location..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading vehicles...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No vehicles found</CardContent></Card>
        ) : filtered.map(v => (
          <Card key={v.id} className="transition-all hover:shadow-premium-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground">{v.registration_number}</p>
                  <p className="text-xs text-muted-foreground">{v.make ?? 'Unknown'} {v.model ?? ''} · {v.year ?? '—'}</p>
                </div>
                <StatusBadge status={v.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Battery</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Battery className={cn('h-4 w-4', (v.battery_level ?? 0) < 50 ? 'text-warning' : 'text-success')} />
                    <span className="text-sm font-semibold">{Number(v.battery_level ?? 0).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', (v.battery_level ?? 0) < 30 ? 'bg-critical' : (v.battery_level ?? 0) < 60 ? 'bg-warning' : 'bg-success')} style={{ width: `${v.battery_level ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Cooling</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium">{(v.cooling_system ?? 'unknown').replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Temp Range</p>
                  <p className="text-sm font-semibold">{v.min_temp_capacity ?? '—'}° to {v.max_temp_capacity ?? '—'}°C</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Last Service</p>
                  <p className="text-sm font-medium">{formatDate(v.last_maintenance_date)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <Badge variant="outline" className="gap-1 text-xs capitalize">{(v.type ?? 'unknown').replace(/_/g, ' ')}</Badge>
                {v.gps_enabled && <Badge variant="outline" className="gap-1 text-xs"><MapPin className="h-3 w-3" /> GPS</Badge>}
                {v.iot_sensors_enabled && <Badge variant="outline" className="gap-1 text-xs"><Cpu className="h-3 w-3" /> IoT</Badge>}
                <Button size="sm" variant="ghost" className="ml-auto text-xs gap-1" onClick={() => openEdit(v)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1 text-critical hover:text-critical" onClick={() => setDeleteTarget(v)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </ErrorBoundary>
  );
}
