import jsPDF from 'jspdf';

export interface AnalyticsReportData {
  kpis: {
    totalShipments: number;
    completedDeliveries: number;
    delayedDeliveries: number;
    activeShipments: number;
    aiPredictions: number;
    aiRecommendations: number;
    avgDeliveryTimeHours: number;
    avgTemperature: number;
    aiPredictionAccuracy: number;
    reroutes: number;
    warehouseStops: number;
  };
  deliveryData: { label: string; deliveries: number; safe: number; delayed: number; failed: number }[];
  tempData: { label: string; avg: number; min: number; max: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  riskBreakdown: { name: string; value: number; color: string }[];
  fleetData: { vehicle: string; utilization: number; trips: number }[];
  shipmentStats: {
    byMedicineType: { type: string; count: number }[];
    byRiskLevel: { level: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
}

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

export async function generateAnalyticsReportPdf(data: AnalyticsReportData): Promise<void> {
  const { kpis, deliveryData, tempData, statusBreakdown, riskBreakdown, fleetData, shipmentStats } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > A4_HEIGHT_MM - 16) { pdf.addPage(); y = 12; }
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
    pdf.text('Analytics Report', A4_WIDTH_MM - MARGIN_MM, ly - 1, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, ly + 4, { align: 'right' });
  }

  function drawFooter(pageNum: number) {
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_MM, ph - 10, A4_WIDTH_MM - MARGIN_MM, ph - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('ThermaNexus Analytics Report', MARGIN_MM, ph - 5);
    pdf.text(`Page ${pageNum}`, A4_WIDTH_MM - MARGIN_MM, ph - 5, { align: 'right' });
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

  function drawBarChart(items: { label: string; values: { value: number; color: [number, number, number] }[] }[], x: number, y: number, w: number, h: number) {
    const padding = 8;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, h, 'F');
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, w, h, 'S');
    for (let i = 0; i <= 4; i++) {
      const gy = y + padding + (chartH / 4) * i;
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
        const by = y + padding + chartH - bh;
        pdf.setFillColor(...v.color);
        pdf.rect(bx, by, barW, bh, 'F');
      });
      pdf.setFontSize(6);
      pdf.setTextColor(...TEXT_MUTED);
      pdf.text(item.label, gx + barGroupW / 2, y + h - 2, { align: 'center' });
    });
  }

  function drawLineChart(items: { label: string; avg: number; min?: number; max?: number }[], x: number, y: number, w: number, h: number) {
    if (items.length === 0) return;
    const padding = 8;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, h, 'F');
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, w, h, 'S');
    for (let i = 0; i <= 4; i++) {
      const gy = y + padding + (chartH / 4) * i;
      pdf.setDrawColor(...BORDER_LIGHT);
      pdf.setLineWidth(0.2);
      pdf.line(x + padding, gy, x + w - padding, gy);
    }
    const allVals: number[] = [];
    items.forEach(i => { allVals.push(i.avg); if (i.min !== undefined) allVals.push(i.min!); if (i.max !== undefined) allVals.push(i.max!); });
    const minVal = Math.min(...allVals) - 1;
    const maxVal = Math.max(...allVals) + 1;
    const range = maxVal - minVal || 1;
    const px = (i: number) => x + padding + (i / Math.max(items.length - 1, 1)) * chartW;
    const py = (v: number) => y + padding + chartH - ((v - minVal) / range) * chartH;
    if (items[0].max !== undefined) {
      pdf.setDrawColor(239, 68, 68);
      pdf.setLineWidth(0.5);
      items.forEach((d, i) => { if (i > 0) pdf.line(px(i - 1), py(items[i - 1].max!), px(i), py(d.max!)); });
    }
    if (items[0].min !== undefined) {
      pdf.setDrawColor(6, 182, 212);
      pdf.setLineWidth(0.5);
      items.forEach((d, i) => { if (i > 0) pdf.line(px(i - 1), py(items[i - 1].min!), px(i), py(d.min!)); });
    }
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(1);
    items.forEach((d, i) => { if (i > 0) pdf.line(px(i - 1), py(items[i - 1].avg), px(i), py(d.avg)); });
    pdf.setFillColor(...BRAND_PRIMARY);
    items.forEach((d, i) => pdf.circle(px(i), py(d.avg), 0.6, 'F'));
    pdf.setFontSize(6);
    pdf.setTextColor(...TEXT_MUTED);
    if (items.length > 0) {
      pdf.text(items[0].label, x + padding, y + h - 2);
      if (items.length > 2) pdf.text(items[Math.floor(items.length / 2)].label, x + padding + chartW / 2 - 5, y + h - 2);
      pdf.text(items[items.length - 1].label, x + w - padding - 10, y + h - 2);
    }
  }

  function drawPie(items: { name: string; value: number; color: string }[], x: number, y: number, radius: number) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let angle = -90;
    items.forEach(item => {
      const slice = (item.value / total) * 360;
      const rgb = hexToRgb(item.color);
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      // Draw slice as a series of triangles from center
      const steps = Math.max(2, Math.floor(slice / 5));
      for (let s = 0; s < steps; s++) {
        const a1 = ((angle + (slice * s) / steps) * Math.PI) / 180;
        const a2 = ((angle + (slice * (s + 1)) / steps) * Math.PI) / 180;
        const x1 = x + Math.cos(a1) * radius;
        const y1 = y + Math.sin(a1) * radius;
        const x2 = x + Math.cos(a2) * radius;
        const y2 = y + Math.sin(a2) * radius;
        pdf.triangle(x, y, x1, y1, x2, y2, 'F');
      }
      angle += slice;
    });
    // Labels
    angle = -90;
    items.forEach(item => {
      const slice = (item.value / total) * 360;
      const midAngle = angle + slice / 2;
      const rad = (midAngle * Math.PI) / 180;
      const lx = x + Math.cos(rad) * (radius + 6);
      const ly = y + Math.sin(rad) * (radius + 6);
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_DARK);
      pdf.text(`${item.name}: ${item.value}`, lx, ly);
      angle += slice;
    });
  }

  function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function table(headers: string[], rows: string[][], colWidths: number[]) {
    ensureSpace(8 + rows.length * 6);
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
    rows.forEach((row, ri) => {
      ensureSpace(6);
      if (ri % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(MARGIN_MM, y - 3, CONTENT_WIDTH, 5, 'F'); }
      cx = MARGIN_MM;
      row.forEach((cell, i) => { pdf.text(String(cell), cx + 2, y); cx += colWidths[i]; });
      y += 5;
    });
  }

  // --- Build report ---
  drawHeader();
  y = 30;

  // Section 1: KPI Summary
  sectionTitle('1. KPI Summary');
  const kpiItems = [
    { label: 'Total Shipments', value: String(kpis.totalShipments) },
    { label: 'Completed', value: String(kpis.completedDeliveries) },
    { label: 'Delayed', value: String(kpis.delayedDeliveries) },
    { label: 'Active', value: String(kpis.activeShipments) },
    { label: 'AI Predictions', value: String(kpis.aiPredictions) },
    { label: 'AI Recommendations', value: String(kpis.aiRecommendations) },
    { label: 'Avg Delivery Time', value: `${kpis.avgDeliveryTimeHours.toFixed(1)}h` },
    { label: 'Avg Temperature', value: `${kpis.avgTemperature.toFixed(1)}°C` },
    { label: 'AI Accuracy', value: `${kpis.aiPredictionAccuracy.toFixed(0)}%` },
    { label: 'Reroutes', value: String(kpis.reroutes) },
    { label: 'Warehouse Stops', value: String(kpis.warehouseStops) },
  ];
  const cols = 4;
  const boxW = CONTENT_WIDTH / cols - 2;
  kpiItems.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    kpiBox(kpi.label, kpi.value, MARGIN_MM + col * (boxW + 2), y + row * 18);
  });
  y += Math.ceil(kpiItems.length / cols) * 18 + 4;

  // Section 2: Delivery Performance
  sectionTitle('2. Delivery Performance');
  if (deliveryData.length > 0) {
    drawBarChart(
      deliveryData.map(d => ({
        label: d.label,
        values: [
          { value: d.safe, color: [34, 197, 94] },
          { value: d.delayed, color: [245, 158, 11] },
          { value: d.failed, color: [239, 68, 68] },
        ],
      })),
      MARGIN_MM, y, CONTENT_WIDTH, 50,
    );
    y += 56;
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No delivery data available', MARGIN_MM, y); y += 6;
  }

  // Section 3: AI Performance
  sectionTitle('3. AI Performance');
  const aiRows = [
    ['AI Predictions Generated', String(kpis.aiPredictions)],
    ['AI Recommendations Issued', String(kpis.aiRecommendations)],
    ['AI Prediction Accuracy', `${kpis.aiPredictionAccuracy.toFixed(0)}%`],
    ['Reroutes Triggered', String(kpis.reroutes)],
    ['Warehouse Stops', String(kpis.warehouseStops)],
  ];
  table(['Metric', 'Value'], aiRows, [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4]);

  // Section 4: Temperature Trends
  sectionTitle('4. Temperature Trends');
  if (tempData.length > 0) {
    drawLineChart(tempData, MARGIN_MM, y, CONTENT_WIDTH, 50);
    y += 56;
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No temperature data available', MARGIN_MM, y); y += 6;
  }

  // Section 5: Shipment Status Breakdown
  sectionTitle('5. Shipment Status Breakdown');
  if (statusBreakdown.length > 0) {
    drawPie(statusBreakdown, MARGIN_MM + 30, y + 25, 20);
    y += 56;
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No status data available', MARGIN_MM, y); y += 6;
  }

  // Section 6: Risk Distribution
  sectionTitle('6. Risk Distribution');
  if (riskBreakdown.length > 0) {
    drawPie(riskBreakdown, MARGIN_MM + 30, y + 25, 20);
    y += 56;
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No risk data available', MARGIN_MM, y); y += 6;
  }

  // Section 7: Fleet Utilization
  sectionTitle('7. Fleet Utilization');
  if (fleetData.length > 0) {
    drawBarChart(
      fleetData.map(f => ({ label: f.vehicle, values: [{ value: f.utilization, color: BRAND_PRIMARY }] })),
      MARGIN_MM, y, CONTENT_WIDTH, 50,
    );
    y += 56;
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No fleet data available', MARGIN_MM, y); y += 6;
  }

  // Section 8: Shipment Statistics
  sectionTitle('8. Shipment Statistics by Medicine Type');
  if (shipmentStats.byMedicineType.length > 0) {
    table(
      ['Medicine Type', 'Count'],
      shipmentStats.byMedicineType.map(m => [m.type, String(m.count)]),
      [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4],
    );
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No medicine type data available', MARGIN_MM, y); y += 6;
  }

  sectionTitle('9. Shipment Statistics by Risk Level');
  if (shipmentStats.byRiskLevel.length > 0) {
    table(
      ['Risk Level', 'Count'],
      shipmentStats.byRiskLevel.map(r => [r.level, String(r.count)]),
      [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4],
    );
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No risk level data available', MARGIN_MM, y); y += 6;
  }

  sectionTitle('10. Shipment Statistics by Status');
  if (shipmentStats.byStatus.length > 0) {
    table(
      ['Status', 'Count'],
      shipmentStats.byStatus.map(s => [s.status, String(s.count)]),
      [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4],
    );
  } else {
    pdf.setFontSize(9); pdf.setTextColor(...TEXT_MUTED); pdf.text('No status data available', MARGIN_MM, y); y += 6;
  }

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i > 1) drawHeader();
    drawFooter(i);
  }

  pdf.save(`ThermaNexus_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
