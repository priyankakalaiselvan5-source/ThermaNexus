'use client';

import { useState, useRef } from 'react';
import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Download, Search, Calendar, Filter, FileSpreadsheet,
  File as FilePdf, FileType, Package, Thermometer, Truck, BrainCircuit,
  User, Fuel, Leaf, Snowflake, Siren, Activity, CheckCircle2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateReportPdf } from '@/lib/pdf-generator';
import { generateFullReportPdf } from '@/lib/full-report';
import { ReportTemplate } from '@/components/reports/report-template';
import { TRUCK_INIT_DATA } from '@/lib/map-data';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { id: 'delivery', label: 'Delivery Report', desc: 'Shipment delivery performance and outcomes', icon: Package, color: 'text-primary bg-primary/10' },
  { id: 'temperature', label: 'Temperature Compliance', desc: 'Temperature logs and compliance summary', icon: Thermometer, color: 'text-accent bg-accent/10' },
  { id: 'shipment', label: 'Shipment Report', desc: 'Detailed shipment records and timelines', icon: FileText, color: 'text-primary bg-primary/10' },
  { id: 'medicine_safety', label: 'Medicine Safety', desc: 'Medicine safety and integrity summary', icon: Activity, color: 'text-success bg-success/10' },
  { id: 'fleet', label: 'Fleet Performance', desc: 'Vehicle utilization and health metrics', icon: Truck, color: 'text-warning bg-warning/10' },
  { id: 'ai_prediction', label: 'AI Prediction Report', desc: 'AI model accuracy and prediction logs', icon: BrainCircuit, color: 'text-primary bg-primary/10' },
  { id: 'driver', label: 'Driver Performance', desc: 'Driver ratings and delivery performance', icon: User, color: 'text-primary bg-primary/10' },
  { id: 'fuel', label: 'Fuel Usage', desc: 'Fuel consumption and cost analysis', icon: Fuel, color: 'text-warning bg-warning/10' },
  { id: 'carbon', label: 'Carbon Savings', desc: 'Environmental impact and CO₂ savings', icon: Leaf, color: 'text-success bg-success/10' },
  { id: 'cold_storage', label: 'Cold Storage Report', desc: 'Storage utilization and capacity', icon: Snowflake, color: 'text-accent bg-accent/10' },
  { id: 'emergency', label: 'Emergency Response', desc: 'Emergency events and response times', icon: Siren, color: 'text-critical bg-critical/10' },
];

const RECENT_REPORTS = [
  { name: 'Delivery Report - June 2025', type: 'PDF', date: 'Jul 1, 2025', size: '2.4 MB', status: 'generated' },
  { name: 'Temperature Compliance - Week 26', type: 'Excel', date: 'Jun 30, 2025', size: '1.8 MB', status: 'generated' },
  { name: 'AI Prediction Report - June 2025', type: 'PDF', date: 'Jun 28, 2025', size: '3.1 MB', status: 'generated' },
  { name: 'Fleet Performance - Q2 2025', type: 'CSV', date: 'Jun 25, 2025', size: '890 KB', status: 'generated' },
  { name: 'Emergency Response - June 2025', type: 'PDF', date: 'Jun 20, 2025', size: '1.5 MB', status: 'generated' },
];

const FILE_ICONS: Record<string, any> = {
  PDF: FilePdf,
  Excel: FileSpreadsheet,
  CSV: FileType,
};

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadIdx, setDownloadIdx] = useState<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [truckIndex, setTruckIndex] = useState(0);
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  async function generate() {
    if (!selectedType) return;
    setGenerating(true);
    setGenStatus(null);
    try {
      await new Promise((r) => setTimeout(r, 100));
      if (!reportRef.current) throw new Error('Report content not ready');
      const reportMeta = REPORT_TYPES.find((r) => r.id === selectedType);
      const shipmentId = TRUCK_INIT_DATA[truckIndex].shipmentId;
      await generateReportPdf({
        shipmentId,
        reportTitle: reportMeta?.label || 'Report',
        reportType: reportMeta?.id || 'general',
        dateFrom,
        dateTo,
        targetElement: reportRef.current,
      });
      setGenStatus('Report generated and downloaded successfully');
    } catch (err) {
      setGenStatus(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportAll() {
    setExportingAll(true);
    setGenStatus(null);
    try {
      await generateFullReportPdf();
      setGenStatus('Full report generated and downloaded successfully');
      toast.success('Full report downloaded: ThermaNexus_Full_Report.pdf');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setGenStatus(`Export failed: ${msg}`);
      toast.error(`Export failed: ${msg}`);
    } finally {
      setExportingAll(false);
    }
  }

  async function downloadRecent(index: number) {
    setDownloadIdx(index);
    setGenStatus(null);
    try {
      await new Promise((r) => setTimeout(r, 100));
      if (!reportRef.current) throw new Error('Report content not ready');
      const shipmentId = TRUCK_INIT_DATA[truckIndex].shipmentId;
      await generateReportPdf({
        shipmentId,
        reportTitle: RECENT_REPORTS[index]?.name || 'Report',
        reportType: selectedType || 'general',
        dateFrom,
        dateTo,
        targetElement: reportRef.current,
      });
    } catch (err) {
      setGenStatus(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadIdx(null);
    }
  }

  const filteredReports = RECENT_REPORTS.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export comprehensive logistics reports"
        icon={FileText}
        action={
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportAll} disabled={exportingAll}>
            {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportingAll ? 'Generating...' : 'Export All'}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Report Types</CardTitle>
            <p className="text-xs text-muted-foreground">Select a report type to generate</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_TYPES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedType(r.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    selectedType === r.id ? 'border-primary bg-primary/5 shadow-glow' : 'border-border hover:bg-muted/30'
                  )}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', r.color)}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <div className="rounded-xl border border-border p-3 text-sm">
                {selectedType ? REPORT_TYPES.find(r => r.id === selectedType)?.label : 'Select a report type'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shipment</Label>
              <Select value={String(truckIndex)} onValueChange={(v) => setTruckIndex(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRUCK_INIT_DATA.map((t, i) => (
                    <SelectItem key={t.shipmentId} value={String(i)}>
                      {t.shipmentId} · {t.vehicleNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generate}
              disabled={!selectedType || generating}
              className="w-full gradient-primary text-white gap-2"
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Download className="h-4 w-4" /> Generate & Download PDF</>}
            </Button>
            {generating && (
              <div className="rounded-xl bg-primary/5 p-3 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-2 text-xs text-muted-foreground">Capturing report sections and rendering PDF...</p>
              </div>
            )}
            {genStatus && !generating && (
              <div className={cn('rounded-xl p-3 text-center text-xs', genStatus.includes('failed') ? 'bg-critical/10 text-critical' : 'bg-success/10 text-success')}>
                {genStatus}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <p className="text-xs text-muted-foreground">Generated report history</p>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-9 pl-9 text-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Report Name</th>
                  <th className="pb-2 text-left font-medium">Format</th>
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Size</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, i) => {
                  const Icon = FILE_ICONS[r.type] || FileText;
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-3"><Badge variant="outline">{r.type}</Badge></td>
                      <td className="py-3 text-muted-foreground">{r.date}</td>
                      <td className="py-3 text-muted-foreground">{r.size}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" /> {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          disabled={downloadIdx !== null}
                          onClick={() => downloadRecent(i)}
                        >
                          {downloadIdx === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          {downloadIdx === i ? 'Generating...' : 'Download'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hidden report template captured by html2canvas for PDF generation */}
      <div style={{ position: 'absolute', left: '-99999px', top: 0, width: 794, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
        <ReportTemplate
          ref={reportRef}
          reportTitle={selectedType ? REPORT_TYPES.find(r => r.id === selectedType)?.label || 'Report' : 'Report'}
          reportType={selectedType || 'general'}
          shipmentId={TRUCK_INIT_DATA[truckIndex].shipmentId}
          dateFrom={dateFrom || 'N/A'}
          dateTo={dateTo || 'N/A'}
          selectedTruckIndex={truckIndex}
        />
      </div>
    </div>
  );
}
