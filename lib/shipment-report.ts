import jsPDF from 'jspdf';
import type { Shipment, Telemetry, Prediction } from '@/types';

export interface ShipmentReportData {
  shipment: Shipment;
  telemetry: Telemetry[];
  prediction?: Prediction;
  timeline: TimelineEvent[];
  decisionHistory: DecisionHistoryRow[];
  driverName?: string;
  vehicleNumber?: string;
}

export interface TimelineEvent {
  event_type: string;
  title: string;
  description: string | null;
  location: string | null;
  created_at: string;
}

export interface DecisionHistoryRow {
  prediction: string;
  risk_detected: string;
  recommendation_generated: string;
  operator_action: string;
  final_outcome: string;
  confidence_score: number;
  created_at: string;
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

export async function generateShipmentReportPdf(data: ShipmentReportData): Promise<void> {
  const { shipment, telemetry, prediction, timeline, decisionHistory, driverName, vehicleNumber } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > A4_HEIGHT_MM - 16) {
      pdf.addPage();
      y = 12;
    }
  }

  function drawHeader() {
    pdf.setFillColor(...BRAND_DARK);
    pdf.rect(0, 0, A4_WIDTH_MM, 22, 'F');
    pdf.setFillColor(...BRAND_PRIMARY);
    pdf.rect(0, 22, A4_WIDTH_MM, 1.5, 'F');

    const lx = MARGIN_MM;
    const ly = 11;
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
    pdf.text('Shipment Report', A4_WIDTH_MM - MARGIN_MM, ly - 1, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    const now = new Date();
    pdf.text(now.toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, ly + 4, { align: 'right' });
  }

  function drawFooter(pageNum: number) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_MM, pageHeight - 10, A4_WIDTH_MM - MARGIN_MM, pageHeight - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(`Shipment: ${shipment.shipment_number}`, MARGIN_MM, pageHeight - 5);
    pdf.text(`Page ${pageNum}`, A4_WIDTH_MM - MARGIN_MM, pageHeight - 5, { align: 'right' });
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

  function keyValue(label: string, value: string, labelWidth = 35) {
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

  function statusBadge(text: string, color: [number, number, number]) {
    const w = 28;
    pdf.setFillColor(...color);
    pdf.roundedRect(A4_WIDTH_MM - MARGIN_MM - w, y - 4, w, 6, 1.5, 1.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(text, A4_WIDTH_MM - MARGIN_MM - w / 2, y - 0.5, { align: 'center' });
  }

  // --- Page 1 ---
  drawHeader();
  y = 30;

  // Section 1: Shipment Details
  sectionTitle('1. Shipment Details');
  keyValue('Shipment ID', shipment.shipment_number);
  keyValue('Medicine', shipment.medicine_name);
  keyValue('Type', shipment.medicine_type);
  keyValue('Batch Number', shipment.batch_number || 'N/A');
  keyValue('Quantity', `${shipment.quantity} ${shipment.unit}`);
  keyValue('Safe Temp Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);
  keyValue('Driver', driverName || 'Unassigned');
  keyValue('Vehicle', vehicleNumber || 'Unassigned');
  keyValue('Status', shipment.status);
  keyValue('Risk Level', shipment.risk_level);
  keyValue('Risk Score', String(shipment.risk_score));
  if (shipment.remaining_safe_hours !== null) {
    keyValue('Remaining Safe Hours', String(shipment.remaining_safe_hours));
  }
  keyValue('Created', new Date(shipment.created_at).toLocaleString('en-IN'));
  keyValue('Dispatched', shipment.dispatched_at ? new Date(shipment.dispatched_at).toLocaleString('en-IN') : 'Not dispatched');
  keyValue('Delivered', shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString('en-IN') : 'Not delivered');

  // Section 2: Route
  sectionTitle('2. Route Information');
  keyValue('Origin', `${shipment.origin_city || 'N/A'}, ${shipment.origin_state || ''}`);
  keyValue('Destination', `${shipment.destination_city || 'N/A'}, ${shipment.destination_state || ''}`);
  keyValue('ETA', shipment.eta ? new Date(shipment.eta).toLocaleString('en-IN') : 'N/A');

  // Section 3: Timeline
  sectionTitle('3. Shipment Timeline');
  if (timeline.length === 0) {
    keyValue('Events', 'No timeline events recorded');
  } else {
    timeline.forEach((evt, i) => {
      ensureSpace(12);
      pdf.setFillColor(...BG_LIGHT);
      pdf.roundedRect(MARGIN_MM, y - 4, CONTENT_WIDTH, 10, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...BRAND_PRIMARY);
      pdf.text(evt.title || evt.event_type, MARGIN_MM + 2, y - 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_MUTED);
      const desc = evt.description || '';
      const descLines = pdf.splitTextToSize(desc, CONTENT_WIDTH - 4);
      pdf.text(descLines, MARGIN_MM + 2, y + 2.5);
      pdf.text(new Date(evt.created_at).toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM - 2, y - 1, { align: 'right' });
      y += 12;
    });
  }

  // Section 4: Temperature Graph
  sectionTitle('4. Temperature Graph');
  if (telemetry.length > 0) {
    drawLineChart(pdf, telemetry.map(t => ({
      label: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      value: t.temperature,
      limit: shipment.safe_temp_max,
    })), 'Temperature (°C)', MARGIN_MM, y, CONTENT_WIDTH, 50, [6, 182, 212], [239, 68, 68]);
    y += 56;
  } else {
    keyValue('Data', 'No telemetry data available');
  }

  // Section 5: Speed Graph
  sectionTitle('5. Speed Graph');
  if (telemetry.length > 0) {
    drawLineChart(pdf, telemetry.map(t => ({
      label: new Date(t.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      value: t.speed_kmh || 0,
    })), 'Speed (km/h)', MARGIN_MM, y, CONTENT_WIDTH, 50, [30, 64, 175], undefined);
    y += 56;
  } else {
    keyValue('Data', 'No telemetry data available');
  }

  // Section 6: AI Prediction
  sectionTitle('6. AI Prediction');
  if (prediction) {
    keyValue('Prediction', prediction.prediction_text || 'N/A');
    keyValue('Spoilage Probability', `${Number(prediction.spoilage_probability).toFixed(0)}%`);
    keyValue('Confidence Score', `${Number(prediction.confidence_score).toFixed(0)}%`);
    keyValue('Failure Cause', prediction.failure_cause || 'N/A');
    keyValue('Temperature Stability', prediction.temperature_stability);
    keyValue('Cooling Health', `${Number(prediction.cooling_health).toFixed(0)}%`);
    keyValue('Estimated Failure Time', prediction.estimated_failure_time ? new Date(prediction.estimated_failure_time).toLocaleString('en-IN') : 'N/A');
  } else {
    keyValue('Prediction', 'No AI prediction available for this shipment');
  }

  // Section 7: AI Recommendation
  sectionTitle('7. AI Recommendation');
  if (prediction?.recommended_action) {
    keyValue('Recommended Action', prediction.recommended_action);
  } else {
    keyValue('Recommendation', 'No AI recommendation available');
  }

  // Section 8: Risk Analysis
  sectionTitle('8. Risk Analysis');
  keyValue('Risk Level', shipment.risk_level);
  keyValue('Risk Score', `${shipment.risk_score} / 100`);
  if (shipment.remaining_safe_hours !== null) {
    keyValue('Remaining Safe Hours', `${shipment.remaining_safe_hours} hours`);
  }
  if (prediction) {
    keyValue('Cooling Efficiency', `${Number(prediction.cooling_efficiency).toFixed(0)}%`);
    keyValue('Compressor Health', `${Number(prediction.compressor_health).toFixed(0)}%`);
    keyValue('Battery Health', `${Number(prediction.battery_health).toFixed(0)}%`);
    keyValue('Sensor Health', `${Number(prediction.sensor_health).toFixed(0)}%`);
    keyValue('Fan Health', `${Number(prediction.fan_health).toFixed(0)}%`);
  }

  // Section 9: AI Decision History
  sectionTitle('9. AI Decision History');
  if (decisionHistory.length === 0) {
    keyValue('History', 'No AI decision history recorded');
  } else {
    decisionHistory.forEach((dh) => {
      ensureSpace(18);
      pdf.setFillColor(...BG_LIGHT);
      pdf.roundedRect(MARGIN_MM, y - 4, CONTENT_WIDTH, 14, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...BRAND_PRIMARY);
      pdf.text(dh.prediction, MARGIN_MM + 2, y - 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_MUTED);
      const riskLines = pdf.splitTextToSize(`Risk: ${dh.risk_detected}`, CONTENT_WIDTH - 4);
      pdf.text(riskLines, MARGIN_MM + 2, y + 2);
      const recLines = pdf.splitTextToSize(`Recommendation: ${dh.recommendation_generated}`, CONTENT_WIDTH - 4);
      pdf.text(recLines, MARGIN_MM + 2, y + 2 + riskLines.length * 3);
      const actY = y + 2 + (riskLines.length + recLines.length) * 3;
      pdf.setTextColor(...BRAND_PRIMARY);
      pdf.text(`Action: ${dh.operator_action} | Confidence: ${dh.confidence_score}%`, MARGIN_MM + 2, actY);
      y += 16;
    });
  }

  // Section 10: Delivery Status
  sectionTitle('10. Delivery Status');
  keyValue('Current Status', shipment.status);
  keyValue('Dispatched At', shipment.dispatched_at ? new Date(shipment.dispatched_at).toLocaleString('en-IN') : 'Not dispatched');
  keyValue('Delivered At', shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString('en-IN') : 'Not delivered');
  if (shipment.notes) {
    keyValue('Notes', shipment.notes);
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i > 1) drawHeader();
    drawFooter(i);
  }

  const safeId = shipment.shipment_number.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`ThermaNexus_Report_${safeId}.pdf`);
}

function drawLineChart(
  pdf: jsPDF,
  data: { label: string; value: number; limit?: number }[],
  yLabel: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lineColor: [number, number, number],
  limitColor?: [number, number, number],
) {
  if (data.length === 0) return;

  const padding = 6;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  // Background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, width, height, 'F');
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, height, 'S');

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const gy = y + padding + (chartH / 4) * i;
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.2);
    pdf.line(x + padding, gy, x + width - padding, gy);
  }

  const values = data.map(d => d.value);
  const limit = data[0]?.limit;
  if (limit) values.push(limit);
  const minVal = Math.min(...values) - 1;
  const maxVal = Math.max(...values) + 1;
  const range = maxVal - minVal || 1;

  const px = (i: number) => x + padding + (i / Math.max(data.length - 1, 1)) * chartW;
  const py = (v: number) => y + padding + chartH - ((v - minVal) / range) * chartH;

  // Limit line
  if (limit && limitColor) {
    const ly = py(limit);
    pdf.setDrawColor(...limitColor);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([2, 1.5], 0);
    pdf.line(x + padding, ly, x + width - padding, ly);
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(6.5);
    pdf.setTextColor(...limitColor);
    pdf.text(`Limit: ${limit}°C`, x + width - padding - 18, ly - 1);
  }

  // Data line
  pdf.setDrawColor(...lineColor);
  pdf.setLineWidth(1);
  pdf.setLineDashPattern([], 0);
  data.forEach((d, i) => {
    if (i === 0) {
      pdf.line(px(i), py(d.value), px(i), py(d.value));
    } else {
      pdf.line(px(i - 1), py(data[i - 1].value), px(i), py(d.value));
    }
  });

  // Data points
  pdf.setFillColor(...lineColor);
  data.forEach((d, i) => {
    pdf.circle(px(i), py(d.value), 0.6, 'F');
  });

  // Y-axis label
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(yLabel, x + padding, y + padding - 1);

  // X-axis labels (first, middle, last)
  pdf.setFontSize(6);
  if (data.length > 0) {
    pdf.text(data[0].label, x + padding, y + height - 2);
    if (data.length > 2) {
      const mid = Math.floor(data.length / 2);
      pdf.text(data[mid].label, x + padding + chartW / 2 - 8, y + height - 2);
    }
    pdf.text(data[data.length - 1].label, x + width - padding - 14, y + height - 2);
  }
}
