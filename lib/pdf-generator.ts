import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 12;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;

const BRAND_DARK = '#0f172a';
const BRAND_PRIMARY = '#1e40af';
const BRAND_ACCENT = '#06b6d4';
const TEXT_MUTED = '#64748b';

function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

export interface PdfGenerateOptions {
  shipmentId: string;
  reportTitle: string;
  reportType: string;
  dateFrom?: string;
  dateTo?: string;
  targetElement: HTMLElement;
}

export async function generateReportPdf(opts: PdfGenerateOptions): Promise<void> {
  const { shipmentId, reportTitle, reportType, targetElement } = opts;

  const canvas = await html2canvas(targetElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: targetElement.scrollWidth,
    windowHeight: targetElement.scrollHeight,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const headerHeight = 28;
  const footerHeight = 14;
  const usableHeight = pageHeight - headerHeight - footerHeight - MARGIN_MM;

  const imgWidth = CONTENT_WIDTH_MM;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  let page = 1;
  const totalPages = Math.ceil(imgHeight / usableHeight);

  function drawHeader() {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 22, 'F');

    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 22, pageWidth, 1.5, 'F');

    const lx = MARGIN_MM;
    const ly = 11;
    pdf.setFillColor(6, 182, 212);
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
    pdf.text(reportTitle, pageWidth - MARGIN_MM, ly - 1, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    pdf.text(`${dateStr} · ${timeStr}`, pageWidth - MARGIN_MM, ly + 4, { align: 'right' });
  }

  function drawFooter() {
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN_MM, pageHeight - footerHeight + 2, pageWidth - MARGIN_MM, pageHeight - footerHeight + 2);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Shipment: ${shipmentId} · Type: ${reportType}`, MARGIN_MM, pageHeight - 6);

    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - MARGIN_MM, pageHeight - 6, { align: 'right' });
  }

  function addPage() {
    drawHeader();
    drawFooter();
    if (page < totalPages) {
      pdf.addPage();
      page++;
    }
  }

  drawHeader();

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) {
      pdf.addPage();
      page++;
      drawHeader();
    }

    const sliceTop = i * usableHeight;
    const sliceHeight = Math.min(usableHeight, imgHeight - sliceTop);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.round((sliceHeight * canvas.width) / imgWidth);
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) continue;

    const sourceY = Math.round((sliceTop * canvas.width) / imgWidth);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0, sourceY, canvas.width, pageCanvas.height,
      0, 0, canvas.width, pageCanvas.height,
    );

    const pageData = pageCanvas.toDataURL('image/png');
    pdf.addImage(pageData, 'PNG', MARGIN_MM, headerHeight + 2, imgWidth, sliceHeight);

    drawFooter();
  }

  const safeId = shipmentId.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`ThermaNexus_Report_${safeId}.pdf`);
}

export { getCssVar };
