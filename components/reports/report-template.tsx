'use client';

import { forwardRef } from 'react';
import { Truck, Thermometer, Activity, MapPin, Snowflake, BrainCircuit, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TRUCK_INIT_DATA, ROUTES, CITY_MAP } from '@/lib/map-data';

const CHART_COLORS = ['#1e40af', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export interface ReportTemplateData {
  reportTitle: string;
  reportType: string;
  shipmentId: string;
  dateFrom: string;
  dateTo: string;
  selectedTruckIndex: number;
}

function tempChartData(base: number) {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    temp: +(base + Math.sin(i / 3) * 1.2 + (Math.random() - 0.5) * 0.6).toFixed(1),
    limit: 8,
  }));
}

function compliancePie() {
  return [
    { name: 'Compliant', value: 87, fill: '#22c55e' },
    { name: 'Minor Deviation', value: 9, fill: '#f59e0b' },
    { name: 'Breach', value: 4, fill: '#ef4444' },
  ];
}

const RouteMapSnapshot = ({ truck }: { truck: typeof TRUCK_INIT_DATA[0] }) => {
  const route = ROUTES[truck.vehicleNumber.charCodeAt(truck.vehicleNumber.length - 1) % ROUTES.length];
  const from = CITY_MAP[route.from];
  const to = CITY_MAP[route.to];

  if (!from || !to) return null;

  const lats = route.waypoints.map(w => w[0]);
  const lngs = route.waypoints.map(w => w[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) * 0.15 || 1;
  const padLng = (maxLng - minLng) * 0.15 || 1;
  const w = 760;
  const h = 300;
  const px = (lng: number) => ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * w;
  const py = (lat: number) => h - ((lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * h;

  const pathD = route.waypoints
    .map((wp, i) => `${i === 0 ? 'M' : 'L'} ${px(wp[1]).toFixed(1)} ${py(wp[0]).toFixed(1)}`)
    .join(' ');

  const midIdx = Math.floor(route.waypoints.length / 2);
  const truckPos = route.waypoints[midIdx];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: '#f8fafc', borderRadius: 12 }}>
      <rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={12} />
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={`h${f}`} x1={0} y1={h * f} x2={w} y2={h * f} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={`v${f}`} x1={w * f} y1={0} x2={w * f} y2={h} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {/* route path */}
      <path d={pathD} fill="none" stroke="#1e40af" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      {/* start marker */}
      <circle cx={px(from.lng)} cy={py(from.lat)} r={10} fill="#22c55e" stroke="#fff" strokeWidth={2} />
      <text x={px(from.lng)} y={py(from.lat) - 14} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#0f172a">{from.name}</text>
      {/* end marker */}
      <circle cx={px(to.lng)} cy={py(to.lat)} r={10} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      <text x={px(to.lng)} y={py(to.lat) - 14} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#0f172a">{to.name}</text>
      {/* truck marker */}
      <circle cx={px(truckPos[1])} cy={py(truckPos[0])} r={9} fill="#06b6d4" stroke="#fff" strokeWidth={2} />
      <text x={px(truckPos[1])} y={py(truckPos[0]) + 22} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">{truck.vehicleNumber}</text>
      {/* legend */}
      <rect x={16} y={h - 56} width={170} height={44} fill="#fff" stroke="#e2e8f0" rx={8} />
      <circle cx={30} cy={h - 42} r={5} fill="#22c55e" /><text x={42} y={h - 39} fontSize={10} fill="#334155">Origin</text>
      <circle cx={30} cy={h - 24} r={5} fill="#ef4444" /><text x={42} y={h - 21} fontSize={10} fill="#334155">Destination</text>
      <circle cx={110} cy={h - 42} r={5} fill="#06b6d4" /><text x={122} y={h - 39} fontSize={10} fill="#334155">Truck</text>
    </svg>
  );
};

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateData>(
  ({ reportTitle, reportType, shipmentId, dateFrom, dateTo, selectedTruckIndex }, ref) => {
    const truck = TRUCK_INIT_DATA[selectedTruckIndex] || TRUCK_INIT_DATA[0];
    const tempData = tempChartData(truck.tempBase);
    const pieData = compliancePie();
    const fleetData = [
      { name: 'MH04SC1234', util: 82, maint: 18 },
      { name: 'DL01GH5678', util: 75, maint: 25 },
      { name: 'KA05MN9012', util: 90, maint: 10 },
      { name: 'TN22AB3456', util: 68, maint: 32 },
      { name: 'GJ01XY7890', util: 85, maint: 15 },
    ];

    return (
      <div ref={ref} style={{ width: 794, padding: 32, background: '#ffffff', fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>
        {/* Title block */}
        <div style={{ borderBottom: '2px solid #1e40af', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{reportTitle}</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>ThermaNexus Cold-Chain Logistics Intelligence Platform</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Report ID: {shipmentId}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{dateFrom || 'N/A'} → {dateTo || 'N/A'}</p>
          </div>
        </div>

        {/* Section 1 — Executive Summary */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>1. Executive Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Shipments', value: '248', icon: '📦' },
            { label: 'On-Time Delivery', value: '94.2%', icon: '✅' },
            { label: 'Temp Compliance', value: '87.0%', icon: '🌡' },
            { label: 'Avg Transit Time', value: '6.5h', icon: '⏱' },
          ].map((s) => (
            <div key={s.label} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Section 2 — Shipment Details Table */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>2. Active Shipment Details</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Shipment ID</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Vehicle</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Driver</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Base Temp</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {TRUCK_INIT_DATA.slice(0, 6).map((t, i) => (
              <tr key={t.shipmentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px' }}>{t.shipmentId}</td>
                <td style={{ padding: '7px 10px' }}>{t.vehicleNumber}</td>
                <td style={{ padding: '7px 10px' }}>{t.driverName}</td>
                <td style={{ padding: '7px 10px' }}>{t.tempBase.toFixed(1)}°C</td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{
                    background: t.tempBase > 7 ? '#fee2e2' : t.tempBase > 5 ? '#fef3c7' : '#dcfce7',
                    color: t.tempBase > 7 ? '#dc2626' : t.tempBase > 5 ? '#d97706' : '#16a34a',
                    padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                  }}>
                    {t.tempBase > 7 ? 'Critical' : t.tempBase > 5 ? 'Warning' : 'Safe'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 3 — Temperature Trend Chart */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>3. Temperature Trend — {shipmentId}</h2>
        <div style={{ height: 220, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tempData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 12]} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={2} fill="url(#tempGrad)" name="Temp (°C)" />
              <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" name="Limit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Section 4 — Route Map Snapshot */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>4. Route Map Snapshot — {truck.vehicleNumber}</h2>
        <div style={{ marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <RouteMapSnapshot truck={truck} />
        </div>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: -16, marginBottom: 24 }}>
          Route: {ROUTES[truck.vehicleNumber.charCodeAt(truck.vehicleNumber.length - 1) % ROUTES.length].from} → {ROUTES[truck.vehicleNumber.charCodeAt(truck.vehicleNumber.length - 1) % ROUTES.length].to}
        </p>

        {/* Section 5 — Compliance Breakdown */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>5. Temperature Compliance Breakdown</h2>
        <div style={{ height: 200, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 10 }}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Section 6 — Fleet Utilization */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>6. Fleet Utilization & Maintenance</h2>
        <div style={{ height: 200, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fleetData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-20} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="util" fill="#1e40af" name="Utilization %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maint" fill="#f59e0b" name="Maintenance %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Section 7 — AI Insights */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>7. AI Prediction & Risk Insights</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Predicted Risk Score</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', margin: 0 }}>42 / 100</p>
            <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>Moderate risk — monitor HVAC efficiency</p>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Remaining Thermal Stability</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#06b6d4', margin: 0 }}>5.8 hrs</p>
            <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>Safe window before spoilage threshold</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 20 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
            Generated by ThermaNexus AI Engine v2.1 · This report is system-generated and digitally compiled.
            Confidence: 92% · Model: Rule-based heuristics (upgrade-ready for ML API).
          </p>
        </div>
      </div>
    );
  },
);

ReportTemplate.displayName = 'ReportTemplate';
