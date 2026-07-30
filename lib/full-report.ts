import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';

const BRAND_DARK: [number, number, number] = [15, 23, 42];
const BRAND_PRIMARY: [number, number, number] = [30, 64, 175];
const BRAND_ACCENT: [number, number, number] = [6, 182, 212];
const TEXT_DARK: [number, number, number] = [15, 23, 42];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const BORDER_LIGHT: [number, number, number] = [226, 232, 240];
const BG_LIGHT: [number, number, number] = [241, 245, 249];

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 14;
const CONTENT_WIDTH = A4_WIDTH_MM - MARGIN_MM * 2;

const CHART_COLORS = ['#1e40af', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export async function generateFullReportPdf(): Promise<void> {
  // Fetch all data from Supabase
  const [
    shipRes, teleRes, predRes, decRes, alertRes, driverRes,
    vehicleRes, warehouseRes, coldRes, posRes, tlRes,
  ] = await Promise.all([
    supabase.from('shipments').select('*').order('created_at', { ascending: false }),
    supabase.from('shipment_telemetry').select('*').order('recorded_at', { ascending: true }),
    supabase.from('predictions').select('*').order('created_at', { ascending: false }),
    supabase.from('ai_decision_history').select('*').order('created_at', { ascending: false }),
    supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('drivers').select('*').order('rating', { ascending: false }),
    supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
    supabase.from('warehouses').select('*').order('created_at', { ascending: false }),
    supabase.from('cold_storage_units').select('*').order('created_at', { ascending: false }),
    supabase.from('truck_positions').select('*'),
    supabase.from('shipment_timeline').select('*').order('created_at', { ascending: false }).limit(30),
  ]);

  const shipments = shipRes.data || [];
  const telemetry = teleRes.data || [];
  const predictions = predRes.data || [];
  const decisions = decRes.data || [];
  const alerts = alertRes.data || [];
  const drivers = driverRes.data || [];
  const vehicles = vehicleRes.data || [];
  const warehouses = warehouseRes.data || [];
  const coldStorage = coldRes.data || [];
  const truckPositions = posRes.data || [];
  const timeline = tlRes.data || [];

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = 0;
  let page = 1;

  function ensureSpace(needed: number) {
    if (y + needed > A4_HEIGHT_MM - 16) {
      pdf.addPage();
      page++;
      y = 12;
      drawHeader();
    }
  }

  function drawHeader() {
    pdf.setFillColor(...BRAND_DARK);
    pdf.rect(0, 0, A4_WIDTH_MM, 22, 'F');
    pdf.setFillColor(...BRAND_PRIMARY);
    pdf.rect(0, 22, A4_WIDTH_MM, 1.5, 'F');
    const lx = MARGIN_MM, ly = 11;
    pdf.setFillColor(...BRAND_ACCENT);
    pdf.circle(lx, ly, 4, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.circle(lx + 1.5, ly + 0.5, 1.8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('ThermaNexus', lx + 7, ly + 1);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Cold-Chain Logistics Intelligence', lx + 7, ly + 6);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Full Analytics Report', A4_WIDTH_MM - MARGIN_MM, ly - 1, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, ly + 4, { align: 'right' });
  }

  function drawFooter() {
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_MM, ph - 10, A4_WIDTH_MM - MARGIN_MM, ph - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('ThermaNexus Full Report', MARGIN_MM, ph - 5);
    pdf.text(`Page ${page}`, A4_WIDTH_MM - MARGIN_MM, ph - 5, { align: 'right' });
  }

  function sectionTitle(title: string) {
    ensureSpace(14);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text(title, MARGIN_MM, y);
    y += 2;
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_MM, y, A4_WIDTH_MM - MARGIN_MM, y);
    y += 6;
  }

  function keyValue(label: string, value: string, labelWidth = 50) {
    ensureSpace(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, MARGIN_MM, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_DARK);
    const lines = pdf.splitTextToSize(value, CONTENT_WIDTH - labelWidth);
    pdf.text(lines, MARGIN_MM + labelWidth, y);
    y += Math.max(5, lines.length * 4.5);
  }

  function kpiBox(label: string, value: string, x: number, w: number) {
    pdf.setFillColor(...BG_LIGHT);
    pdf.roundedRect(x, y, w, 16, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(value, x + 3, y + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    const lines = pdf.splitTextToSize(label, w - 6);
    pdf.text(lines, x + 3, y + 11);
  }

  function table(headers: string[], rows: string[][], colWidths: number[]) {
    ensureSpace(8 + Math.min(rows.length, 10) * 6);
    pdf.setFillColor(...BG_LIGHT);
    pdf.rect(MARGIN_MM, y - 4, CONTENT_WIDTH, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_DARK);
    let cx = MARGIN_MM;
    headers.forEach((h, i) => { pdf.text(h, cx + 2, y); cx += colWidths[i]; });
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TEXT_MUTED);
    rows.slice(0, 10).forEach((row, ri) => {
      ensureSpace(6);
      if (ri % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(MARGIN_MM, y - 3, CONTENT_WIDTH, 5, 'F'); }
      cx = MARGIN_MM;
      row.forEach((cell, i) => {
        const lines = pdf.splitTextToSize(String(cell), colWidths[i] - 4);
        pdf.text(lines, cx + 2, y);
        cx += colWidths[i];
      });
      y += 5;
    });
    if (rows.length > 10) {
      ensureSpace(5);
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_MUTED);
      pdf.text(`... and ${rows.length - 10} more entries`, MARGIN_MM, y);
      y += 4;
    }
  }

  function drawBarChart(items: { label: string; values: { value: number; color: [number, number, number] }[] }[], x: number, yStart: number, w: number, h: number) {
    if (items.length === 0) return;
    ensureSpace(h + 4);
    const padding = 8;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, yStart, w, h, 'F');
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.rect(x, yStart, w, h, 'S');
    for (let i = 0; i <= 4; i++) {
      const gy = yStart + padding + (chartH / 4) * i;
      pdf.setDrawColor(...BORDER_LIGHT);
      pdf.setLineWidth(0.2);
      pdf.line(x + padding, gy, x + w - padding, gy);
    }
    const allVals = items.flatMap(i => i.values.map(v => v.value));
    const maxVal = Math.max(...allVals, 1);
    const barGroupW = chartW / items.length;
    const barW = Math.min(barGroupW / (items[0]?.values.length || 1) - 1, 6);
    items.forEach((item, i) => {
      const gx = x + padding + i * barGroupW;
      item.values.forEach((v, j) => {
        const bh = (v.value / maxVal) * chartH;
        const bx = gx + barGroupW / 2 - (item.values.length * (barW + 1)) / 2 + j * (barW + 1);
        const by = yStart + padding + chartH - bh;
        pdf.setFillColor(...v.color);
        pdf.rect(bx, by, barW, bh, 'F');
      });
      pdf.setFontSize(6);
      pdf.setTextColor(...TEXT_MUTED);
      const labelLines = pdf.splitTextToSize(item.label, barGroupW - 2);
      pdf.text(labelLines[0] || '', gx + barGroupW / 2, yStart + h - 2, { align: 'center' });
    });
  }

  function drawLineChart(items: { label: string; value: number }[], x: number, yStart: number, w: number, h: number, color: [number, number, number], yLabel: string) {
    if (items.length === 0) return;
    ensureSpace(h + 4);
    const padding = 8;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, yStart, w, h, 'F');
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.rect(x, yStart, w, h, 'S');
    for (let i = 0; i <= 4; i++) {
      const gy = yStart + padding + (chartH / 4) * i;
      pdf.setDrawColor(...BORDER_LIGHT);
      pdf.setLineWidth(0.2);
      pdf.line(x + padding, gy, x + w - padding, gy);
    }
    const vals = items.map(i => i.value);
    const minVal = Math.min(...vals) - 1;
    const maxVal = Math.max(...vals) + 1;
    const range = maxVal - minVal || 1;
    const px = (i: number) => x + padding + (i / Math.max(items.length - 1, 1)) * chartW;
    const py = (v: number) => yStart + padding + chartH - ((v - minVal) / range) * chartH;
    pdf.setDrawColor(...color);
    pdf.setLineWidth(1);
    items.forEach((d, i) => { if (i > 0) pdf.line(px(i - 1), py(items[i - 1].value), px(i), py(d.value)); });
    pdf.setFillColor(...color);
    items.forEach((d, i) => pdf.circle(px(i), py(d.value), 0.6, 'F'));
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(yLabel, x + padding, yStart + padding - 1);
    pdf.setFontSize(6);
    if (items.length > 0) {
      pdf.text(items[0].label, x + padding, yStart + h - 2);
      if (items.length > 2) pdf.text(items[Math.floor(items.length / 2)].label, x + padding + chartW / 2 - 5, yStart + h - 2);
      pdf.text(items[items.length - 1].label, x + w - padding - 10, yStart + h - 2);
    }
  }

  function drawPie(items: { name: string; value: number; color: string }[], x: number, yCenter: number, radius: number) {
    if (items.length === 0) return;
    ensureSpace(radius * 2 + 10);
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let angle = -90;
    items.forEach(item => {
      const slice = (item.value / total) * 360;
      const rgb = hexToRgb(item.color);
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      const steps = Math.max(2, Math.floor(slice / 5));
      for (let s = 0; s < steps; s++) {
        const a1 = ((angle + (slice * s) / steps) * Math.PI) / 180;
        const a2 = ((angle + (slice * (s + 1)) / steps) * Math.PI) / 180;
        const x1 = x + Math.cos(a1) * radius;
        const y1 = yCenter + Math.sin(a1) * radius;
        const x2 = x + Math.cos(a2) * radius;
        const y2 = yCenter + Math.sin(a2) * radius;
        pdf.triangle(x, yCenter, x1, y1, x2, y2, 'F');
      }
      angle += slice;
    });
    angle = -90;
    items.forEach(item => {
      const slice = (item.value / total) * 360;
      const midAngle = angle + slice / 2;
      const rad = (midAngle * Math.PI) / 180;
      const lx = x + Math.cos(rad) * (radius + 6);
      const ly = yCenter + Math.sin(rad) * (radius + 6);
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_DARK);
      pdf.text(`${item.name}: ${item.value}`, lx, ly);
      angle += slice;
    });
  }

  // --- Build report ---
  drawHeader();
  y = 30;

  // KPI Summary
  const totalShipments = shipments.length;
  const completedDeliveries = shipments.filter((s: any) => s.status === 'delivered').length;
  const delayedDeliveries = shipments.filter((s: any) => s.status === 'delayed' || s.status === 'pending').length;
  const activeShipments = shipments.filter((s: any) => s.status === 'in_transit' || s.status === 'dispatched' || s.status === 'emergency').length;
  const aiPredictions = predictions.length;
  const aiRecommendations = predictions.filter((p: any) => p.recommended_action).length;
  const deliveredWithTimes = shipments.filter((s: any) => s.status === 'delivered' && s.dispatched_at && s.delivered_at);
  const avgDeliveryTime = deliveredWithTimes.length > 0
    ? deliveredWithTimes.reduce((sum: number, s: any) => sum + Math.max(0, (new Date(s.delivered_at).getTime() - new Date(s.dispatched_at).getTime()) / 3600000), 0) / deliveredWithTimes.length
    : 0;
  const avgTemp = telemetry.length > 0 ? telemetry.reduce((s: number, t: any) => s + Number(t.temperature), 0) / telemetry.length : 0;
  const avgHumidity = telemetry.length > 0 ? telemetry.reduce((s: number, t: any) => s + Number(t.humidity || 50), 0) / telemetry.length : 0;
  const aiAccuracy = decisions.length > 0 ? (decisions.filter((d: any) => d.operator_action === 'accepted').length / decisions.length) * 100 : 0;
  const reroutes = truckPositions.filter((t: any) => t.is_rerouted).length;
  const warehouseStops = timeline.filter((t: any) => t.event_type === 'warehouse_stop' || t.event_type === 'cold_storage_stop' || t.event_type === 'stop').length;

  // 1. Executive Summary
  sectionTitle('1. Executive Summary');
  keyValue('Report Generated', new Date().toLocaleString('en-IN'));
  keyValue('Total Shipments', String(totalShipments));
  keyValue('Completed Deliveries', String(completedDeliveries));
  keyValue('Delayed Deliveries', String(delayedDeliveries));
  keyValue('Active Shipments', String(activeShipments));
  keyValue('AI Predictions', String(aiPredictions));
  keyValue('AI Recommendations', String(aiRecommendations));
  keyValue('Average Delivery Time', `${avgDeliveryTime.toFixed(1)} hours`);
  keyValue('Average Temperature', `${avgTemp.toFixed(1)}°C`);
  keyValue('AI Prediction Accuracy', `${aiAccuracy.toFixed(0)}%`);
  keyValue('Reroutes', String(reroutes));
  keyValue('Warehouse Stops', String(warehouseStops));

  // 2. KPI Summary
  sectionTitle('2. KPI Summary');
  const kpiItems = [
    { label: 'Total Shipments', value: String(totalShipments) },
    { label: 'Completed', value: String(completedDeliveries) },
    { label: 'Delayed', value: String(delayedDeliveries) },
    { label: 'Active', value: String(activeShipments) },
    { label: 'AI Predictions', value: String(aiPredictions) },
    { label: 'AI Recommendations', value: String(aiRecommendations) },
    { label: 'Avg Delivery Time', value: `${avgDeliveryTime.toFixed(1)}h` },
    { label: 'Avg Temperature', value: `${avgTemp.toFixed(1)}°C` },
    { label: 'AI Accuracy', value: `${aiAccuracy.toFixed(0)}%` },
    { label: 'Reroutes', value: String(reroutes) },
    { label: 'Warehouse Stops', value: String(warehouseStops) },
    { label: 'Avg Humidity', value: `${avgHumidity.toFixed(0)}%` },
  ];
  const cols = 4;
  const boxW = CONTENT_WIDTH / cols - 2;
  kpiItems.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    kpiBox(kpi.label, kpi.value, MARGIN_MM + col * (boxW + 2), y + row * 18);
  });
  y += Math.ceil(kpiItems.length / cols) * 18 + 4;

  // 3. Shipment Summary
  sectionTitle('3. Shipment Summary');
  table(
    ['Shipment ID', 'Medicine', 'Status', 'Risk', 'Origin', 'Destination'],
    shipments.slice(0, 10).map((s: any) => [
      s.shipment_number || 'N/A',
      s.medicine_name || 'N/A',
      s.status || 'N/A',
      s.risk_level || 'N/A',
      s.origin_city || 'N/A',
      s.destination_city || 'N/A',
    ]),
    [CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.1, CONTENT_WIDTH * 0.175, CONTENT_WIDTH * 0.175],
  );

  // 4. Delivery Performance
  sectionTitle('4. Delivery Performance');
  const deliveryRows = [
    ['Total Deliveries', String(totalShipments)],
    ['Successful Deliveries', String(completedDeliveries)],
    ['Delayed Deliveries', String(delayedDeliveries)],
    ['Active Shipments', String(activeShipments)],
    ['Success Rate', `${totalShipments > 0 ? ((completedDeliveries / totalShipments) * 100).toFixed(1) : 0}%`],
    ['Average Delivery Time', `${avgDeliveryTime.toFixed(1)} hours`],
  ];
  table(['Metric', 'Value'], deliveryRows, [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4]);
  // Delivery bar chart (last 7 days)
  const deliveryChart: { label: string; values: { value: number; color: [number, number, number] }[] }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayShipments = shipments.filter((s: any) => {
      const created = new Date(s.created_at);
      return created >= dayStart && created < dayEnd;
    });
    deliveryChart.push({
      label: dayNames[dayStart.getDay()],
      values: [
        { value: dayShipments.filter((s: any) => s.status === 'delivered').length, color: [34, 197, 94] },
        { value: dayShipments.filter((s: any) => s.status === 'delayed' || s.status === 'pending').length, color: [245, 158, 11] },
        { value: dayShipments.filter((s: any) => s.status === 'cancelled' || s.status === 'failed').length, color: [239, 68, 68] },
      ],
    });
  }
  drawBarChart(deliveryChart, MARGIN_MM, y, CONTENT_WIDTH, 50);
  y += 56;

  // 5. AI Predictions
  sectionTitle('5. AI Predictions');
  table(
    ['Shipment', 'Prediction', 'Spoilage %', 'Confidence %', 'Created'],
    predictions.slice(0, 10).map((p: any) => [
      (p.shipment_id || 'N/A').substring(0, 8),
      (p.prediction_text || 'N/A').substring(0, 40),
      `${Number(p.spoilage_probability || 0).toFixed(0)}%`,
      `${Number(p.confidence_score || 0).toFixed(0)}%`,
      new Date(p.created_at).toLocaleDateString('en-IN'),
    ]),
    [CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.13, CONTENT_WIDTH * 0.2],
  );

  // 6. AI Recommendations
  sectionTitle('6. AI Recommendations');
  const recRows = predictions.filter((p: any) => p.recommended_action).slice(0, 10).map((p: any) => [
    (p.shipment_id || 'N/A').substring(0, 8),
    (p.recommended_action || 'N/A').substring(0, 60),
  ]);
  table(['Shipment', 'Recommended Action'], recRows, [CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.8]);

  // 7. Risk Analysis
  sectionTitle('7. Risk Analysis');
  const riskCounts: Record<string, number> = {};
  shipments.forEach((s: any) => { riskCounts[s.risk_level] = (riskCounts[s.risk_level] || 0) + 1; });
  table(
    ['Risk Level', 'Count', 'Percentage'],
    Object.entries(riskCounts).map(([level, count]) => [level, String(count), `${((count / totalShipments) * 100).toFixed(1)}%`]),
    [CONTENT_WIDTH * 0.4, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.3],
  );
  // Risk pie chart
  const riskPie = Object.entries(riskCounts).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  drawPie(riskPie, MARGIN_MM + 25, y + 25, 20);
  y += 56;

  // 8. AI Decision History
  sectionTitle('8. AI Decision History');
  table(
    ['Shipment', 'Prediction', 'Action', 'Confidence', 'Date'],
    decisions.slice(0, 10).map((d: any) => [
      (d.shipment_id || 'N/A').substring(0, 8),
      (d.prediction || 'N/A').substring(0, 30),
      d.operator_action || 'N/A',
      `${d.confidence_score || 0}%`,
      new Date(d.created_at).toLocaleDateString('en-IN'),
    ]),
    [CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.2],
  );

  // 9. Shipment Timeline
  sectionTitle('9. Shipment Timeline');
  table(
    ['Event Type', 'Title', 'Description', 'Date'],
    timeline.slice(0, 10).map((t: any) => [
      t.event_type || 'N/A',
      (t.title || 'N/A').substring(0, 25),
      (t.description || 'N/A').substring(0, 35),
      new Date(t.created_at).toLocaleDateString('en-IN'),
    ]),
    [CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.25],
  );

  // 10. Driver Performance
  sectionTitle('10. Driver Performance');
  table(
    ['Driver', 'Rating', 'Deliveries', 'Safe Rate', 'Experience'],
    drivers.slice(0, 10).map((d: any) => [
      d.name || 'N/A',
      `${(d.rating || 0).toFixed(1)}`,
      String(d.total_deliveries || 0),
      `${d.total_deliveries > 0 ? ((d.safe_deliveries / d.total_deliveries) * 100).toFixed(0) : 0}%`,
      `${d.experience_years || 0} yrs`,
    ]),
    [CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.15],
  );

  // 11. Route Optimization Summary
  sectionTitle('11. Route Optimization Summary');
  keyValue('Total Reroutes', String(reroutes));
  keyValue('Warehouse Stops', String(warehouseStops));
  keyValue('Active Routes', String(truckPositions.length));
  const reroutedPositions = truckPositions.filter((t: any) => t.is_rerouted);
  keyValue('Rerouted Routes', String(reroutedPositions.length));
  if (reroutedPositions.length > 0) {
    table(
      ['Shipment', 'Speed (km/h)', 'ETA (min)', 'Progress'],
      reroutedPositions.slice(0, 5).map((t: any) => [
        (t.shipment_id || 'N/A').substring(0, 8),
        String(t.speed_kmh || 0),
        String(t.eta_minutes || 0),
        `${((t.progress || 0) * 100).toFixed(0)}%`,
      ]),
      [CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.2],
    );
  }

  // 12. Temperature Analysis
  sectionTitle('12. Temperature Analysis');
  keyValue('Average Temperature', `${avgTemp.toFixed(1)}°C`);
  keyValue('Min Temperature', `${telemetry.length > 0 ? Math.min(...telemetry.map((t: any) => Number(t.temperature))) : 0}°C`);
  keyValue('Max Temperature', `${telemetry.length > 0 ? Math.max(...telemetry.map((t: any) => Number(t.temperature))) : 0}°C`);
  // Temperature line chart
  const tempChart = telemetry.slice(-12).map((t: any) => ({
    label: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    value: Number(t.temperature),
  }));
  drawLineChart(tempChart, MARGIN_MM, y, CONTENT_WIDTH, 50, [6, 182, 212], 'Temperature (°C)');
  y += 56;

  // 13. Humidity Analysis
  sectionTitle('13. Humidity Analysis');
  keyValue('Average Humidity', `${avgHumidity.toFixed(0)}%`);
  const humidityChart = telemetry.slice(-12).map((t: any) => ({
    label: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    value: Number(t.humidity || 50),
  }));
  drawLineChart(humidityChart, MARGIN_MM, y, CONTENT_WIDTH, 50, [30, 64, 175], 'Humidity (%)');
  y += 56;

  // 14. Average Delivery Time
  sectionTitle('14. Average Delivery Time');
  keyValue('Overall Average', `${avgDeliveryTime.toFixed(1)} hours`);
  keyValue('Delivered Shipments', String(deliveredWithTimes.length));
  const deliveryTimeChart = deliveredWithTimes.slice(-7).map((s: any) => ({
    label: (s.shipment_number || 'N/A').substring(0, 8),
    value: Math.max(0, (new Date(s.delivered_at).getTime() - new Date(s.dispatched_at).getTime()) / 3600000),
  }));
  drawLineChart(deliveryTimeChart, MARGIN_MM, y, CONTENT_WIDTH, 50, [34, 197, 94], 'Delivery Time (h)');
  y += 56;

  // 15. Delayed Deliveries
  sectionTitle('15. Delayed Deliveries');
  const delayedShipments = shipments.filter((s: any) => s.status === 'delayed' || s.status === 'pending');
  keyValue('Total Delayed', String(delayedShipments.length));
  keyValue('Delay Rate', `${totalShipments > 0 ? ((delayedShipments.length / totalShipments) * 100).toFixed(1) : 0}%`);
  if (delayedShipments.length > 0) {
    table(
      ['Shipment ID', 'Medicine', 'Status', 'Origin', 'Destination'],
      delayedShipments.slice(0, 10).map((s: any) => [
        s.shipment_number || 'N/A',
        s.medicine_name || 'N/A',
        s.status || 'N/A',
        s.origin_city || 'N/A',
        s.destination_city || 'N/A',
      ]),
      [CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2],
    );
  }

  // 16. Successful Deliveries
  sectionTitle('16. Successful Deliveries');
  const successfulShipments = shipments.filter((s: any) => s.status === 'delivered');
  keyValue('Total Successful', String(successfulShipments.length));
  keyValue('Success Rate', `${totalShipments > 0 ? ((successfulShipments.length / totalShipments) * 100).toFixed(1) : 0}%`);
  if (successfulShipments.length > 0) {
    table(
      ['Shipment ID', 'Medicine', 'Delivered At', 'Origin', 'Destination'],
      successfulShipments.slice(0, 10).map((s: any) => [
        s.shipment_number || 'N/A',
        s.medicine_name || 'N/A',
        s.delivered_at ? new Date(s.delivered_at).toLocaleDateString('en-IN') : 'N/A',
        s.origin_city || 'N/A',
        s.destination_city || 'N/A',
      ]),
      [CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.175, CONTENT_WIDTH * 0.175],
    );
  }

  // 17. Warehouse Usage
  sectionTitle('17. Warehouse Usage');
  keyValue('Total Warehouses', String(warehouses.length));
  if (warehouses.length > 0) {
    table(
      ['Name', 'Location', 'Capacity', 'Status'],
      warehouses.slice(0, 10).map((w: any) => [
        w.name || 'N/A',
        w.city || w.location || 'N/A',
        String(w.capacity || 0),
        w.status || 'active',
      ]),
      [CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2],
    );
  }

  // 18. Cold Storage Utilization
  sectionTitle('18. Cold Storage Utilization');
  keyValue('Total Cold Storage Units', String(coldStorage.length));
  if (coldStorage.length > 0) {
    table(
      ['Unit', 'Temperature', 'Capacity', 'Status'],
      coldStorage.slice(0, 10).map((c: any) => [
        c.name || c.unit_id || 'N/A',
        `${Number(c.current_temp || c.temperature || 0).toFixed(1)}°C`,
        String(c.capacity || 0),
        c.status || 'active',
      ]),
      [CONTENT_WIDTH * 0.3, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.25],
    );
  }

  // 19. Charts & Graphs Summary
  sectionTitle('19. Charts & Graphs');
  // Shipment status pie
  const statusCounts: Record<string, number> = {};
  shipments.forEach((s: any) => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const statusPie = Object.entries(statusCounts).map(([name, value], i) => ({ name: name.replace('_', ' '), value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  drawPie(statusPie, MARGIN_MM + 25, y + 25, 20);
  y += 56;

  // Fleet utilization bar chart
  const fleetData = vehicles.slice(0, 6).map((v: any) => ({
    label: (v.registration_number || 'N/A').substring(0, 6),
    values: [{ value: v.status === 'in_use' ? 80 : v.status === 'maintenance' ? 20 : 50, color: BRAND_PRIMARY as [number, number, number] }],
  }));
  if (fleetData.length > 0) {
    drawBarChart(fleetData, MARGIN_MM, y, CONTENT_WIDTH, 50);
    y += 56;
  }

  // 20. Report Generation Date & Time
  sectionTitle('20. Report Generation Details');
  keyValue('Generated At', new Date().toLocaleString('en-IN'));
  keyValue('Report Type', 'Full Analytics Report');
  keyValue('Data Source', 'Supabase (Live)');
  keyValue('Total Pages', String(pdf.getNumberOfPages()));
  keyValue('Sections Included', '20');

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter();
  }

  const dateStr = new Date().toISOString().split('T')[0];
  pdf.save(`ThermaNexus_Full_Report_${dateStr}.pdf`);
}
