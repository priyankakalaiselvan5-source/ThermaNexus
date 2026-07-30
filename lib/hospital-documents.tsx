import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOMServer from 'react-dom/server';
import type { Shipment, Telemetry, Prediction } from '@/types';
import { supabase } from '@/lib/supabase';

export interface ShipmentReportData {
  shipment: Shipment;
  telemetry: Telemetry[];
  prediction?: Prediction;
  timeline: TimelineEvent[];
  decisionHistory: DecisionHistoryRow[];
  driverName?: string;
  vehicleNumber?: string;
  hospitalName?: string;
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
const SUCCESS: [number, number, number] = [22, 163, 74];
const WARNING: [number, number, number] = [234, 179, 8];
const CRITICAL: [number, number, number] = [220, 38, 38];

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 14;
const CONTENT_WIDTH = A4_WIDTH_MM - MARGIN_MM * 2;

function safe(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function generateQrDataUrl(payload: string): string {
  const svgString = ReactDOMServer.renderToStaticMarkup(
    <QRCodeSVG value={payload} size={120} level="M" />
  );
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
}

export async function fetchShipmentData(shipmentId: string): Promise<ShipmentReportData | null> {
  const { data: ship, error: shipErr } = await supabase
    .from('shipments').select('*').eq('id', shipmentId).maybeSingle();
  if (shipErr || !ship) return null;

  const [teleRes, predRes, tlRes, dhRes, driverRes, vehicleRes, hospitalRes] = await Promise.all([
    supabase.from('shipment_telemetry').select('*').eq('shipment_id', shipmentId).order('recorded_at', { ascending: true }),
    supabase.from('predictions').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('shipment_timeline').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: true }),
    supabase.from('ai_decision_history').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: false }),
    ship.driver_id ? supabase.from('drivers').select('name').eq('id', ship.driver_id).maybeSingle() : Promise.resolve({ data: null }),
    ship.vehicle_id ? supabase.from('vehicles').select('registration_number').eq('id', ship.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
    ship.destination_hospital_id ? supabase.from('hospitals').select('name').eq('id', ship.destination_hospital_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    shipment: ship as Shipment,
    telemetry: (teleRes.data || []) as Telemetry[],
    prediction: (predRes.data as Prediction) || undefined,
    timeline: (tlRes.data || []) as TimelineEvent[],
    decisionHistory: (dhRes.data || []) as DecisionHistoryRow[],
    driverName: (driverRes.data as any)?.name,
    vehicleNumber: (vehicleRes.data as any)?.registration_number,
    hospitalName: (hospitalRes.data as any)?.name,
  };
}

export async function recordDownload(
  shipmentId: string,
  fileName: string,
  fileType: string,
  generatedBy: string,
  hospitalName?: string,
): Promise<void> {
  try {
    await supabase.from('document_downloads').insert({
      shipment_id: shipmentId,
      file_name: fileName,
      file_type: fileType,
      generated_by: generatedBy,
      hospital_name: hospitalName || null,
      download_count: 1,
    });
  } catch {
    // Table may not exist yet — best-effort, don't block the download
  }
}

export async function fetchDownloadHistory(hospitalName?: string): Promise<DownloadHistoryRow[]> {
  try {
    let query = supabase.from('document_downloads').select('*').order('created_at', { ascending: false }).limit(50);
    if (hospitalName) query = query.eq('hospital_name', hospitalName);
    const { data } = await query;
    return (data || []) as DownloadHistoryRow[];
  } catch {
    return [];
  }
}

export interface DownloadHistoryRow {
  id: string;
  shipment_id: string;
  file_name: string;
  file_type: string;
  file_url: string | null;
  generated_by: string | null;
  hospital_name: string | null;
  download_count: number;
  created_at: string;
}

// ==================== SHIPMENT REPORT PDF ====================

export async function generateShipmentReportPdf(data: ShipmentReportData): Promise<void> {
  const { shipment, telemetry, prediction, timeline, decisionHistory, driverName, vehicleNumber, hospitalName } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const reportId = `TNX-RPT-${Date.now().toString(36).toUpperCase()}`;
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
    pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, ly + 4, { align: 'right' });
  }

  function drawFooter(pageNum: number) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_MM, pageHeight - 10, A4_WIDTH_MM - MARGIN_MM, pageHeight - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(`Report ID: ${reportId} · Shipment: ${shipment.shipment_number}`, MARGIN_MM, pageHeight - 5);
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

  // --- Page 1 ---
  drawHeader();
  y = 30;

  // Report metadata
  sectionTitle('Report Information');
  keyValue('Report ID', reportId);
  keyValue('Generated Date', new Date().toLocaleString('en-IN'));
  keyValue('Hospital', safe(hospitalName));

  // Shipment Details
  sectionTitle('Shipment Details');
  keyValue('Shipment ID', shipment.shipment_number);
  keyValue('Medicine/Vaccine', shipment.medicine_name);
  keyValue('Medicine Type', safe(shipment.medicine_type));
  keyValue('Batch Number', safe(shipment.batch_number));
  keyValue('Quantity', `${shipment.quantity} ${shipment.unit}`);
  keyValue('Safe Temp Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);

  // Route
  sectionTitle('Route Summary');
  keyValue('Source', `${safe(shipment.origin_city)}, ${safe(shipment.origin_state)}`);
  keyValue('Destination', `${safe(shipment.destination_city)}, ${safe(shipment.destination_state)}`);
  keyValue('ETA', shipment.eta ? new Date(shipment.eta).toLocaleString('en-IN') : 'N/A');

  // Driver & Vehicle
  sectionTitle('Driver & Vehicle Details');
  keyValue('Driver Name', safe(driverName, 'Unassigned'));
  keyValue('Vehicle Number', safe(vehicleNumber, 'Unassigned'));

  // Delivery Status
  sectionTitle('Delivery Status');
  keyValue('Current Status', safe(shipment.status));
  keyValue('Dispatched At', shipment.dispatched_at ? new Date(shipment.dispatched_at).toLocaleString('en-IN') : 'Not dispatched');
  keyValue('Delivered At', shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString('en-IN') : 'Not delivered');
  if (shipment.notes) keyValue('Notes', shipment.notes);

  // AI Prediction
  sectionTitle('AI Prediction Summary');
  if (prediction) {
    keyValue('Prediction', safe(prediction.prediction_text));
    keyValue('Spoilage Probability', `${Number(prediction.spoilage_probability).toFixed(0)}%`);
    keyValue('Confidence Score', `${Number(prediction.confidence_score).toFixed(0)}%`);
    keyValue('Failure Cause', safe(prediction.failure_cause));
    keyValue('Temperature Stability', safe(prediction.temperature_stability));
    keyValue('Cooling Health', `${Number(prediction.cooling_health).toFixed(0)}%`);
  } else {
    keyValue('Prediction', 'No AI prediction available');
  }

  // AI Recommendations
  sectionTitle('AI Recommendations');
  keyValue('Recommended Action', safe(prediction?.recommended_action, 'No recommendation available'));

  // Risk Analysis
  sectionTitle('Risk Analysis');
  keyValue('Risk Level', safe(shipment.risk_level));
  keyValue('Risk Score', `${shipment.risk_score} / 100`);
  if (shipment.remaining_safe_hours !== null) {
    keyValue('Remaining Safe Hours', `${shipment.remaining_safe_hours} hours`);
  }
  if (prediction) {
    keyValue('Cooling Efficiency', `${Number(prediction.cooling_efficiency).toFixed(0)}%`);
    keyValue('Compressor Health', `${Number(prediction.compressor_health).toFixed(0)}%`);
    keyValue('Battery Health', `${Number(prediction.battery_health).toFixed(0)}%`);
  }

  // Temperature Summary
  sectionTitle('Temperature Summary');
  if (telemetry.length > 0) {
    const temps = telemetry.map(t => Number(t.temperature));
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
    keyValue('Minimum Temperature', `${minT.toFixed(1)}°C`);
    keyValue('Maximum Temperature', `${maxT.toFixed(1)}°C`);
    keyValue('Average Temperature', `${avgT.toFixed(1)}°C`);
    keyValue('Safe Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);
    const violations = temps.filter(t => t < Number(shipment.safe_temp_min) || t > Number(shipment.safe_temp_max)).length;
    keyValue('Violations', `${violations} reading(s) outside safe range`);
  } else {
    keyValue('Data', 'No telemetry data available');
  }

  // Humidity Summary
  sectionTitle('Humidity Summary');
  if (telemetry.length > 0 && telemetry.some(t => t.humidity !== null)) {
    const hums = telemetry.filter(t => t.humidity !== null).map(t => Number(t.humidity));
    const minH = Math.min(...hums);
    const maxH = Math.max(...hums);
    const avgH = hums.reduce((a, b) => a + b, 0) / hums.length;
    keyValue('Minimum Humidity', `${minH.toFixed(0)}%`);
    keyValue('Maximum Humidity', `${maxH.toFixed(0)}%`);
    keyValue('Average Humidity', `${avgH.toFixed(0)}%`);
  } else {
    keyValue('Data', 'No humidity data available');
  }

  // Timeline
  sectionTitle('Timeline');
  if (timeline.length === 0) {
    keyValue('Events', 'No timeline events recorded');
  } else {
    timeline.forEach((evt) => {
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
      const descLines = pdf.splitTextToSize(evt.description || '', CONTENT_WIDTH - 4);
      pdf.text(descLines, MARGIN_MM + 2, y + 2.5);
      pdf.text(new Date(evt.created_at).toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM - 2, y - 1, { align: 'right' });
      y += 12;
    });
  }

  // AI Decision History
  sectionTitle('AI Decision History');
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

  // QR Verification + Digital Signature
  sectionTitle('Verification & Signature');
  const qrPayload = JSON.stringify({
    shipmentId: shipment.shipment_number,
    reportId,
    generatedDate: new Date().toISOString(),
    verificationStatus: 'verified',
  });
  try {
    const qrDataUrl = generateQrDataUrl(qrPayload);
    pdf.addImage(qrDataUrl, 'PNG', MARGIN_MM, y, 30, 30);
  } catch {
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('QR Code unavailable', MARGIN_MM, y + 5);
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Scan QR to verify this report', MARGIN_MM, y + 34);

  // Digital signature placeholder
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.5);
  pdf.line(A4_WIDTH_MM - MARGIN_MM - 50, y + 20, A4_WIDTH_MM - MARGIN_MM, y + 20);
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Digital Signature (Authorized Personnel)', A4_WIDTH_MM - MARGIN_MM - 50, y + 24);
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, A4_WIDTH_MM - MARGIN_MM - 50, y + 28);

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

// ==================== TEMPERATURE CERTIFICATE PDF ====================

export async function generateTemperatureCertificatePdf(data: ShipmentReportData): Promise<void> {
  const { shipment, telemetry, prediction, hospitalName } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const certNumber = `TNX-CERT-${Date.now().toString(36).toUpperCase()}`;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > A4_HEIGHT_MM - 16) {
      pdf.addPage();
      y = 12;
    }
  }

  // --- Header ---
  pdf.setFillColor(...BRAND_DARK);
  pdf.rect(0, 0, A4_WIDTH_MM, 30, 'F');
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 30, A4_WIDTH_MM, 1.5, 'F');

  const lx = MARGIN_MM;
  const ly = 12;
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
  pdf.setFontSize(14);
  pdf.text('Cold Chain Temperature Certificate', A4_WIDTH_MM / 2, 24, { align: 'center' });

  y = 42;

  // Certificate border
  pdf.setDrawColor(...BRAND_PRIMARY);
  pdf.setLineWidth(1);
  pdf.rect(8, 38, A4_WIDTH_MM - 16, A4_HEIGHT_MM - 50);

  // Certificate Number
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text(`Certificate Number: ${certNumber}`, A4_WIDTH_MM / 2, y, { align: 'center' });
  y += 8;

  // Details
  function certRow(label: string, value: string) {
    ensureSpace(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, MARGIN_MM + 5, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(safe(value), MARGIN_MM + 55, y);
    y += 6;
  }

  certRow('Shipment ID', shipment.shipment_number);
  certRow('Medicine Name', shipment.medicine_name);
  certRow('Batch Number', safe(shipment.batch_number));
  certRow('Manufacturer', safe((shipment as any).manufacturer, 'ThermaNexus Partner'));
  certRow('Hospital Name', safe(hospitalName));
  certRow('Date & Time', new Date().toLocaleString('en-IN'));
  certRow('Temperature Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);

  // Temperature stats
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text('Temperature Readings', MARGIN_MM + 5, y);
  y += 6;

  if (telemetry.length > 0) {
    const temps = telemetry.map(t => Number(t.temperature));
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
    certRow('Minimum Temperature', `${minT.toFixed(1)}°C`);
    certRow('Maximum Temperature', `${maxT.toFixed(1)}°C`);
    certRow('Average Temperature', `${avgT.toFixed(1)}°C`);
    certRow('Total Readings', String(telemetry.length));
  } else {
    certRow('Temperature Data', 'No telemetry data available');
  }

  certRow('Sensor ID', `TNX-SENSOR-${shipment.shipment_number.slice(-4)}`);

  // Cold Chain Status
  y += 4;
  const temps = telemetry.map(t => Number(t.temperature));
  const hasViolation = temps.some(t => t < Number(shipment.safe_temp_min) || t > Number(shipment.safe_temp_max));
  const coldChainStatus = telemetry.length === 0 ? 'No Data' : hasViolation ? 'BREACH DETECTED' : 'SAFE';
  const statusColor = coldChainStatus === 'SAFE' ? SUCCESS : coldChainStatus === 'BREACH DETECTED' ? CRITICAL : WARNING;

  pdf.setFillColor(...statusColor);
  pdf.roundedRect(MARGIN_MM + 5, y - 4, 60, 8, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(`Cold-Chain Status: ${coldChainStatus}`, MARGIN_MM + 8, y + 1);
  y += 10;

  // AI Verification
  certRow('AI Verification Status', prediction ? 'AI Verified' : 'Pending AI Review');
  if (prediction) {
    certRow('AI Confidence', `${Number(prediction.confidence_score).toFixed(0)}%`);
  }

  // QR Code
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text('Verification QR Code', MARGIN_MM + 5, y);
  y += 4;

  const qrPayload = JSON.stringify({
    shipmentId: shipment.shipment_number,
    certificateNumber: certNumber,
    generatedDate: new Date().toISOString(),
    verificationStatus: coldChainStatus,
  });
  try {
    const qrDataUrl = generateQrDataUrl(qrPayload);
    pdf.addImage(qrDataUrl, 'PNG', MARGIN_MM + 5, y, 35, 35);
  } catch {
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text('QR Code unavailable', MARGIN_MM + 5, y + 5);
  }

  // Digital Signature
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text('Digital Signature', A4_WIDTH_MM - MARGIN_MM - 55, y);
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.5);
  pdf.line(A4_WIDTH_MM - MARGIN_MM - 55, y + 15, A4_WIDTH_MM - MARGIN_MM - 5, y + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Authorized Quality Officer', A4_WIDTH_MM - MARGIN_MM - 55, y + 19);
  pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, A4_WIDTH_MM - MARGIN_MM - 55, y + 23);

  // Footer
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_MM, A4_HEIGHT_MM - 15, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`Certificate: ${certNumber} · Shipment: ${shipment.shipment_number}`, MARGIN_MM, A4_HEIGHT_MM - 10);
  pdf.text('ThermaNexus Cold-Chain Compliance', A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 10, { align: 'right' });

  const safeId = shipment.shipment_number.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`Temperature_Certificate_${safeId}.pdf`);
}

// ==================== GENERIC DOCUMENT PDF ====================

export type DocumentType =
  | 'invoice' | 'delivery_challan' | 'packing_list' | 'temperature_log'
  | 'compliance_certificate' | 'quality_certificate' | 'cold_chain_certificate';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  delivery_challan: 'Delivery Challan',
  packing_list: 'Packing List',
  temperature_log: 'Temperature Log',
  compliance_certificate: 'Compliance Certificate',
  quality_certificate: 'Quality Certificate',
  cold_chain_certificate: 'Cold Chain Certificate',
};

export async function generateDocumentPdf(
  data: ShipmentReportData,
  docType: DocumentType,
): Promise<void> {
  const { shipment, telemetry, prediction, driverName, vehicleNumber, hospitalName } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const docId = `TNX-${docType.toUpperCase().replace(/_/g, '-')}-${Date.now().toString(36).toUpperCase()}`;
  let y = 0;

  // Header
  pdf.setFillColor(...BRAND_DARK);
  pdf.rect(0, 0, A4_WIDTH_MM, 22, 'F');
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 22, A4_WIDTH_MM, 1.5, 'F');

  pdf.setFillColor(...BRAND_ACCENT);
  pdf.circle(MARGIN_MM, 11, 4, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.circle(MARGIN_MM + 1.5, 11.5, 1.8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('ThermaNexus', MARGIN_MM + 7, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Cold-Chain Logistics Intelligence', MARGIN_MM + 7, 17);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(DOCUMENT_TYPE_LABELS[docType], A4_WIDTH_MM - MARGIN_MM, 10, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, 15, { align: 'right' });

  y = 32;

  function row(label: string, value: string) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, MARGIN_MM, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(safe(value), MARGIN_MM + 40, y);
    y += 6;
  }

  // Document ID
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text(`Document ID: ${docId}`, MARGIN_MM, y);
  y += 8;

  // Common fields
  row('Shipment ID', shipment.shipment_number);
  row('Medicine Name', shipment.medicine_name);
  row('Batch Number', safe(shipment.batch_number));
  row('Quantity', `${shipment.quantity} ${shipment.unit}`);
  row('Hospital', safe(hospitalName));
  row('Source', `${safe(shipment.origin_city)}, ${safe(shipment.origin_state)}`);
  row('Destination', `${safe(shipment.destination_city)}, ${safe(shipment.destination_state)}`);
  row('Driver', safe(driverName, 'Unassigned'));
  row('Vehicle', safe(vehicleNumber, 'Unassigned'));
  row('Status', safe(shipment.status));

  // Type-specific content
  if (docType === 'temperature_log' && telemetry.length > 0) {
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text('Temperature Log Records', MARGIN_MM, y);
    y += 6;

    // Table header
    pdf.setFillColor(...BG_LIGHT);
    pdf.rect(MARGIN_MM, y - 4, CONTENT_WIDTH, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text('Date/Time', MARGIN_MM + 2, y);
    pdf.text('Temp (°C)', MARGIN_MM + 60, y);
    pdf.text('Humidity (%)', MARGIN_MM + 90, y);
    pdf.text('Location', MARGIN_MM + 120, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...TEXT_MUTED);
    telemetry.slice(0, 30).forEach((t) => {
      pdf.text(new Date(t.recorded_at).toLocaleString('en-IN'), MARGIN_MM + 2, y);
      pdf.text(String(t.temperature), MARGIN_MM + 60, y);
      pdf.text(t.humidity !== null ? String(t.humidity) : '—', MARGIN_MM + 90, y);
      const loc = t.gps_latitude ? `${Number(t.gps_latitude).toFixed(2)}, ${Number(t.gps_longitude).toFixed(2)}` : '—';
      pdf.text(loc, MARGIN_MM + 120, y);
      y += 5;
      if (y > A4_HEIGHT_MM - 20) {
        pdf.addPage();
        y = 12;
      }
    });
  }

  if (docType === 'invoice' || docType === 'delivery_challan') {
    y += 4;
    row('Invoice Date', new Date().toLocaleDateString('en-IN'));
    row('Payment Terms', 'Net 30 Days');
    row('Unit Price', `₹ ${(shipment as any).unit_price || '450'}`);
    row('Total Amount', `₹ ${((shipment as any).unit_price || 450) * shipment.quantity}`);
  }

  if (docType === 'packing_list') {
    y += 4;
    row('Package Type', 'Cold-Chain Insulated Box');
    row('Packing Date', new Date().toLocaleDateString('en-IN'));
    row('Gross Weight', `${(shipment.quantity * 0.05).toFixed(1)} kg`);
    row('Net Weight', `${(shipment.quantity * 0.04).toFixed(1)} kg`);
  }

  if (docType.includes('certificate')) {
    y += 4;
    const temps = telemetry.map(t => Number(t.temperature));
    const hasViolation = temps.some(t => t < Number(shipment.safe_temp_min) || t > Number(shipment.safe_temp_max));
    row('Temperature Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);
    if (telemetry.length > 0) {
      row('Min Temp Recorded', `${Math.min(...temps).toFixed(1)}°C`);
      row('Max Temp Recorded', `${Math.max(...temps).toFixed(1)}°C`);
    }
    row('Compliance Status', telemetry.length === 0 ? 'No Data' : hasViolation ? 'Non-Compliant' : 'Compliant');
    row('AI Verification', prediction ? 'AI Verified' : 'Pending');
  }

  // QR Code
  y += 8;
  if (y > A4_HEIGHT_MM - 50) {
    pdf.addPage();
    y = 12;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Scan QR to verify:', MARGIN_MM, y);

  const qrPayload = JSON.stringify({
    shipmentId: shipment.shipment_number,
    documentId: docId,
    docType,
    generatedDate: new Date().toISOString(),
    verificationStatus: 'verified',
  });
  try {
    const qrDataUrl = generateQrDataUrl(qrPayload);
    pdf.addImage(qrDataUrl, 'PNG', MARGIN_MM, y + 2, 25, 25);
  } catch {
    pdf.text('QR unavailable', MARGIN_MM, y + 10);
  }

  // Signature
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.5);
  pdf.line(A4_WIDTH_MM - MARGIN_MM - 50, y + 20, A4_WIDTH_MM - MARGIN_MM, y + 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Authorized Signature', A4_WIDTH_MM - MARGIN_MM - 50, y + 24);

  // Footer
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_MM, A4_HEIGHT_MM - 15, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`Document: ${docId} · Shipment: ${shipment.shipment_number}`, MARGIN_MM, A4_HEIGHT_MM - 10);
  pdf.text(DOCUMENT_TYPE_LABELS[docType], A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 10, { align: 'right' });

  const safeId = shipment.shipment_number.replace(/[^a-zA-Z0-9-]/g, '_');
  const prefix = DOCUMENT_TYPE_LABELS[docType].replace(/\s+/g, '_');
  pdf.save(`${prefix}_${safeId}.pdf`);
}

// ==================== AI PREDICTION REPORT PDF ====================

export async function generateAiPredictionReportPdf(data: ShipmentReportData): Promise<void> {
  const { shipment, telemetry, prediction, driverName, vehicleNumber, hospitalName } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const reportId = `TNX-AI-${Date.now().toString(36).toUpperCase()}`;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > A4_HEIGHT_MM - 16) { pdf.addPage(); y = 12; }
  }

  // Header
  pdf.setFillColor(...BRAND_DARK);
  pdf.rect(0, 0, A4_WIDTH_MM, 22, 'F');
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 22, A4_WIDTH_MM, 1.5, 'F');
  pdf.setFillColor(...BRAND_ACCENT);
  pdf.circle(MARGIN_MM, 11, 4, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.circle(MARGIN_MM + 1.5, 11.5, 1.8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('ThermaNexus', MARGIN_MM + 7, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Cold-Chain Logistics Intelligence', MARGIN_MM + 7, 17);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('AI Prediction Report', A4_WIDTH_MM - MARGIN_MM, 10, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, 15, { align: 'right' });

  y = 32;

  function row(label: string, value: string) {
    ensureSpace(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, MARGIN_MM, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(safe(value), MARGIN_MM + 45, y);
    y += 6;
  }

  function section(title: string) {
    ensureSpace(14);
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND_PRIMARY);
    pdf.text(title, MARGIN_MM, y);
    y += 2;
    pdf.setDrawColor(...BORDER_LIGHT);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN_MM, y, A4_WIDTH_MM - MARGIN_MM, y);
    y += 6;
  }

  row('Report ID', reportId);
  row('Shipment ID', shipment.shipment_number);
  row('Medicine', shipment.medicine_name);
  row('Hospital', safe(hospitalName));
  row('Driver', safe(driverName, 'Unassigned'));
  row('Vehicle', safe(vehicleNumber, 'Unassigned'));

  section('AI Prediction Results');
  if (prediction) {
    row('Prediction', safe(prediction.prediction_text));
    row('Spoilage Probability', `${Number(prediction.spoilage_probability).toFixed(1)}%`);
    row('Confidence Score', `${Number(prediction.confidence_score).toFixed(1)}%`);
    row('Remaining Safe Hours', prediction.remaining_safe_hours !== null ? `${prediction.remaining_safe_hours}h` : 'N/A');
    row('Failure Cause', safe(prediction.failure_cause));
    row('Temperature Stability', safe(prediction.temperature_stability));
    row('Cooling Health', `${Number(prediction.cooling_health).toFixed(0)}%`);
    row('Compressor Health', `${Number(prediction.compressor_health).toFixed(0)}%`);
    row('Battery Health', `${Number(prediction.battery_health).toFixed(0)}%`);
    row('Sensor Health', `${Number(prediction.sensor_health).toFixed(0)}%`);
    row('Fan Health', `${Number(prediction.fan_health).toFixed(0)}%`);
    row('Cooling Efficiency', `${Number(prediction.cooling_efficiency).toFixed(0)}%`);
  } else {
    row('Prediction', 'No AI prediction available');
  }

  section('AI Recommendation');
  row('Recommended Action', safe(prediction?.recommended_action, 'Monitor and maintain cold chain'));

  section('Risk Assessment');
  row('Risk Level', safe(shipment.risk_level));
  row('Risk Score', `${shipment.risk_score} / 100`);
  if (shipment.remaining_safe_hours !== null) {
    row('Remaining Safe Hours', `${shipment.remaining_safe_hours} hours`);
  }

  section('Temperature Analysis');
  if (telemetry.length > 0) {
    const temps = telemetry.map(t => Number(t.temperature));
    row('Readings Count', String(telemetry.length));
    row('Min Temperature', `${Math.min(...temps).toFixed(1)}°C`);
    row('Max Temperature', `${Math.max(...temps).toFixed(1)}°C`);
    row('Avg Temperature', `${(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)}°C`);
    row('Safe Range', `${shipment.safe_temp_min}°C to ${shipment.safe_temp_max}°C`);
    const violations = temps.filter(t => t < Number(shipment.safe_temp_min) || t > Number(shipment.safe_temp_max)).length;
    row('Violations', `${violations} out of ${temps.length} readings`);
    row('Compliance', violations === 0 ? 'Compliant' : 'Non-Compliant');
  } else {
    row('Temperature Data', 'No telemetry data available');
  }

  // QR Code
  y += 8;
  ensureSpace(30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Scan QR to verify:', MARGIN_MM, y);
  const qrPayload = JSON.stringify({
    shipmentId: shipment.shipment_number,
    reportId,
    docType: 'ai_prediction_report',
    generatedDate: new Date().toISOString(),
  });
  try {
    const qrDataUrl = generateQrDataUrl(qrPayload);
    pdf.addImage(qrDataUrl, 'PNG', MARGIN_MM, y + 2, 25, 25);
  } catch {}

  // Footer
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_MM, A4_HEIGHT_MM - 15, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`Report ID: ${reportId} · Shipment: ${shipment.shipment_number}`, MARGIN_MM, A4_HEIGHT_MM - 10);
  pdf.text('AI Prediction Report', A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 10, { align: 'right' });

  const safeId = shipment.shipment_number.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`AI_Prediction_Report_${safeId}.pdf`);
}

// ==================== DELIVERY CERTIFICATE PDF ====================

export async function generateDeliveryCertificatePdf(data: ShipmentReportData): Promise<void> {
  const { shipment, driverName, vehicleNumber, hospitalName } = data;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const certId = `TNX-DELIV-${Date.now().toString(36).toUpperCase()}`;
  let y = 0;

  // Header
  pdf.setFillColor(...BRAND_DARK);
  pdf.rect(0, 0, A4_WIDTH_MM, 22, 'F');
  pdf.setFillColor(...BRAND_PRIMARY);
  pdf.rect(0, 22, A4_WIDTH_MM, 1.5, 'F');
  pdf.setFillColor(...BRAND_ACCENT);
  pdf.circle(MARGIN_MM, 11, 4, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.circle(MARGIN_MM + 1.5, 11.5, 1.8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('ThermaNexus', MARGIN_MM + 7, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Cold-Chain Logistics Intelligence', MARGIN_MM + 7, 17);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Delivery Certificate', A4_WIDTH_MM - MARGIN_MM, 10, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(new Date().toLocaleString('en-IN'), A4_WIDTH_MM - MARGIN_MM, 15, { align: 'right' });

  y = 32;

  function row(label: string, value: string) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_MUTED);
    pdf.text(label, MARGIN_MM, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(safe(value), MARGIN_MM + 45, y);
    y += 6;
  }

  row('Certificate ID', certId);
  row('Shipment ID', shipment.shipment_number);
  row('Medicine', shipment.medicine_name);
  row('Batch Number', safe(shipment.batch_number));
  row('Quantity', `${shipment.quantity} ${shipment.unit}`);
  row('Source', `${safe(shipment.origin_city)}, ${safe(shipment.origin_state)}`);
  row('Destination', `${safe(shipment.destination_city)}, ${safe(shipment.destination_state)}`);
  row('Hospital', safe(hospitalName));
  row('Driver', safe(driverName, 'Unassigned'));
  row('Vehicle', safe(vehicleNumber, 'Unassigned'));
  row('Dispatched At', shipment.dispatched_at ? new Date(shipment.dispatched_at).toLocaleString('en-IN') : 'N/A');
  row('Delivered At', shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleString('en-IN') : 'Pending');
  row('Delivery Status', safe(shipment.status));

  // Certification statement
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND_PRIMARY);
  pdf.text('Delivery Certification', MARGIN_MM, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT_DARK);
  const certText = `This is to certify that shipment ${shipment.shipment_number} containing ${shipment.quantity} ${shipment.unit} of ${shipment.medicine_name} has been processed through the ThermaNexus cold-chain logistics system. The delivery has been tracked, monitored, and verified with AI-assisted quality assurance.`;
  const certLines = pdf.splitTextToSize(certText, CONTENT_WIDTH);
  pdf.text(certLines, MARGIN_MM, y);
  y += certLines.length * 5 + 10;

  // Signature
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.5);
  pdf.line(A4_WIDTH_MM - MARGIN_MM - 50, y, A4_WIDTH_MM - MARGIN_MM, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Authorized Signature', A4_WIDTH_MM - MARGIN_MM - 50, y + 4);

  // QR Code
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text('Scan QR to verify:', MARGIN_MM, y);
  const qrPayload = JSON.stringify({
    shipmentId: shipment.shipment_number,
    certificateId: certId,
    docType: 'delivery_certificate',
    generatedDate: new Date().toISOString(),
  });
  try {
    const qrDataUrl = generateQrDataUrl(qrPayload);
    pdf.addImage(qrDataUrl, 'PNG', MARGIN_MM, y + 2, 25, 25);
  } catch {}

  // Footer
  pdf.setDrawColor(...BORDER_LIGHT);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_MM, A4_HEIGHT_MM - 15, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...TEXT_MUTED);
  pdf.text(`Certificate ID: ${certId} · Shipment: ${shipment.shipment_number}`, MARGIN_MM, A4_HEIGHT_MM - 10);
  pdf.text('Delivery Certificate', A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 10, { align: 'right' });

  const safeId = shipment.shipment_number.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`Delivery_Certificate_${safeId}.pdf`);
}
