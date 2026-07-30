'use client';

import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Battery, DoorOpen, Activity, Snowflake } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';

const TEMP_HISTORY = [
  { time: '00:00', temp: 3.8 },
  { time: '03:00', temp: 4.1 },
  { time: '06:00', temp: 4.3 },
  { time: '09:00', temp: 4.5 },
  { time: '12:00', temp: 4.8 },
  { time: '15:00', temp: 4.2 },
  { time: '18:00', temp: 4.0 },
  { time: '21:00', temp: 4.2 },
];

export default function DriverTemperaturePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Temperature Status"
        description="Live temperature monitoring"
        icon={Thermometer}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 text-center">
            <Thermometer className="mx-auto h-6 w-6 text-success" />
            <p className="mt-2 text-2xl font-bold">4.2°C</p>
            <p className="text-xs text-muted-foreground">Current Temp</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Snowflake className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">2-8°C</p>
            <p className="text-xs text-muted-foreground">Safe Range</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Droplets className="mx-auto h-6 w-6 text-accent" />
            <p className="mt-2 text-2xl font-bold">45%</p>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Battery className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">78%</p>
            <p className="text-xs text-muted-foreground">Battery</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temperature History (24h)</CardTitle>
          <Badge variant="outline" className="bg-success/10 text-success w-fit">Within Safe Range</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={TEMP_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 18% 91%)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(240 18% 91%)', fontSize: '12px' }} />
              <ReferenceArea y1={2} y2={8} fill="hsl(142 71% 45%)" fillOpacity={0.08} />
              <Line type="monotone" dataKey="temp" stroke="hsl(246 80% 62%)" strokeWidth={2.5} dot={{ r: 3 }} name="Temperature (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sensor Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Temperature Sensor', value: 'Active', status: 'success' },
            { label: 'Humidity Sensor', value: 'Active', status: 'success' },
            { label: 'Door Sensor', value: 'Closed', status: 'success' },
            { label: 'GPS Module', value: 'Active', status: 'success' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <Badge variant="outline" className={`mt-2 bg-${s.status}/10 text-${s.status}`}>{s.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
