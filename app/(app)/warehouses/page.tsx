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
import { Warehouse, Search, MapPin, Phone, Plus, Activity, Thermometer, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Warehouse as WarehouseType } from '@/types';

const TEMP_TYPES = ['ultra_cold', 'cold', 'cool', 'ambient', 'controlled'];
const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'];

interface NewWarehouseForm {
  name: string;
  city: string;
  state: string;
  address: string;
  capacity_cubic_meters: string;
  current_occupancy_pct: string;
  temperature_range_min: string;
  temperature_range_max: string;
  temperature_type: string;
  contact_phone: string;
  contact_name: string;
  latitude: string;
  longitude: string;
  status: string;
}

const EMPTY_FORM: NewWarehouseForm = {
  name: '',
  city: '',
  state: '',
  address: '',
  capacity_cubic_meters: '5000',
  current_occupancy_pct: '0',
  temperature_range_min: '2',
  temperature_range_max: '8',
  temperature_type: 'cold',
  contact_phone: '',
  contact_name: '',
  latitude: '',
  longitude: '',
  status: 'active',
};

export default function WarehousesPage() {
  const { addCRUDNotification } = useNotifications();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewWarehouseForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof NewWarehouseForm, string>>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('warehouses').select('*').order('name');
      if (data) setWarehouses(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = warehouses.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.city.toLowerCase().includes(search.toLowerCase())
  );

  function setField<K extends keyof NewWarehouseForm>(key: K, value: NewWarehouseForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof NewWarehouseForm, string>> = {};
    if (!form.name.trim()) errs.name = 'Warehouse name is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.capacity_cubic_meters || isNaN(Number(form.capacity_cubic_meters))) errs.capacity_cubic_meters = 'Valid capacity required';
    if (Number(form.current_occupancy_pct) < 0 || Number(form.current_occupancy_pct) > 100) errs.current_occupancy_pct = 'Occupancy must be 0–100';
    if (Number(form.temperature_range_min) >= Number(form.temperature_range_max)) errs.temperature_range_min = 'Min temp must be less than max';
    if (form.latitude && isNaN(Number(form.latitude))) errs.latitude = 'Invalid latitude';
    if (form.longitude && isNaN(Number(form.longitude))) errs.longitude = 'Invalid longitude';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      state: form.state.trim() || null,
      address: form.address.trim() || null,
      capacity_cubic_meters: Number(form.capacity_cubic_meters),
      current_occupancy_pct: Number(form.current_occupancy_pct),
      temperature_range_min: Number(form.temperature_range_min),
      temperature_range_max: Number(form.temperature_range_max),
      contact_phone: form.contact_phone.trim() || null,
      contact_name: form.contact_name.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      status: form.status,
      available_capacity_pct: 100 - Number(form.current_occupancy_pct),
    };
    const { data, error } = await supabase.from('warehouses').insert([payload]).select().single();
    setSaving(false);
    if (error) {
      toast.error('Failed to add warehouse: ' + error.message);
      return;
    }
    setWarehouses(prev => [...prev, data as WarehouseType].sort((a, b) => a.name.localeCompare(b.name)));
    addCRUDNotification('warehouse_added', 'Warehouse Added', `${payload.name} (${payload.city}) added to the network.`);
    toast.success(`${payload.name} added successfully!`);
    setShowDialog(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Storage and distribution centers"
        icon={Warehouse}
        action={
          <Button size="sm" className="gradient-primary text-white gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" /> Add Warehouse
          </Button>
        }
      />

      {/* Add Warehouse Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" /> Add New Warehouse
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Warehouse Name *</Label>
                <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Delhi Ultra Cold Hub" className={cn(errors.name && 'border-critical')} />
                {errors.name && <p className="text-xs text-critical">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Delhi" className={cn(errors.city && 'border-critical')} />
                {errors.city && <p className="text-xs text-critical">{errors.city}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={e => setField('state', e.target.value)} placeholder="Delhi" />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Sector 18, Rohini, Delhi" />
              </div>

              <div className="space-y-1.5">
                <Label>Capacity (m³) *</Label>
                <Input type="number" value={form.capacity_cubic_meters} onChange={e => setField('capacity_cubic_meters', e.target.value)} placeholder="5000" className={cn(errors.capacity_cubic_meters && 'border-critical')} />
                {errors.capacity_cubic_meters && <p className="text-xs text-critical">{errors.capacity_cubic_meters}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Available Storage (%)</Label>
                <Input type="number" min="0" max="100" value={form.current_occupancy_pct} onChange={e => setField('current_occupancy_pct', e.target.value)} placeholder="0" className={cn(errors.current_occupancy_pct && 'border-critical')} />
                <p className="text-[10px] text-muted-foreground">Current occupancy %</p>
                {errors.current_occupancy_pct && <p className="text-xs text-critical">{errors.current_occupancy_pct}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Temperature Type *</Label>
                <Select value={form.temperature_type} onValueChange={v => setField('temperature_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Min Temperature (°C)</Label>
                <Input type="number" value={form.temperature_range_min} onChange={e => setField('temperature_range_min', e.target.value)} placeholder="2" className={cn(errors.temperature_range_min && 'border-critical')} />
                {errors.temperature_range_min && <p className="text-xs text-critical">{errors.temperature_range_min}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Max Temperature (°C)</Label>
                <Input type="number" value={form.temperature_range_max} onChange={e => setField('temperature_range_max', e.target.value)} placeholder="8" />
              </div>

              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setField('contact_name', e.target.value)} placeholder="Rajesh Mehta" />
              </div>

              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => setField('contact_phone', e.target.value)} placeholder="+91 98100 12345" />
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setErrors({}); }}>Cancel</Button>
            <Button className="gradient-primary text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Add Warehouse'}
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
          <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No warehouses found</CardContent></Card>
        ) : filtered.map(w => (
          <Card key={w.id} className="transition-all hover:shadow-premium-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/10">
                    <Warehouse className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.city}, {w.state}</p>
                  </div>
                </div>
                <StatusBadge status={w.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="flex items-center gap-1.5"><Box className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground">Capacity</span></div>
                  <p className="mt-1 text-sm font-bold">{w.capacity_cubic_meters.toLocaleString()} m³</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-warning" /><span className="text-[10px] text-muted-foreground">Occupancy</span></div>
                  <p className="mt-1 text-sm font-bold">{w.current_occupancy_pct}%</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', w.current_occupancy_pct > 80 ? 'bg-critical' : w.current_occupancy_pct > 60 ? 'bg-warning' : 'bg-success')} style={{ width: `${w.current_occupancy_pct}%` }} />
                  </div>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5 text-accent" /><span className="text-[10px] text-muted-foreground">Temp Range</span></div>
                  <p className="mt-1 text-sm font-bold">{w.temperature_range_min}° to {w.temperature_range_max}°C</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Coordinates</span></div>
                  <p className="mt-1 text-xs font-medium">{w.latitude?.toFixed(2)}, {w.longitude?.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                {w.address && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {w.address}</div>}
                {w.contact_phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {w.contact_phone}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
