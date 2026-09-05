// ─────────────────────────────────────────────────────────────
// Exportación a Excel (xlsx) y PDF (jsPDF) con la marca Nexus
// ─────────────────────────────────────────────────────────────
import { formatDateTime, todayISO } from './formatters';

export interface ExportSheet {
  name: string;
  rows: Record<string, unknown>[];
}

export async function exportToExcel(sheets: ExportSheet[], filename: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Info: 'Sin datos' }]);
    // Ancho de columnas aproximado
    const cols = Object.keys(s.rows[0] ?? { Info: '' }).map((k) => ({
      wch: Math.min(45, Math.max(k.length, ...s.rows.slice(0, 200).map((r) => String(r[k] ?? '').length)) + 2),
    }));
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}-${todayISO()}.xlsx`);
}

export interface PdfSection {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  /** índices de columnas alineadas a la derecha */
  rightAlign?: number[];
}

export interface PdfKpi {
  label: string;
  value: string;
}

interface PdfDoc {
  title: string;
  subtitle?: string;
  filtersText?: string;
  kpis?: PdfKpi[];
  sections: PdfSection[];
  companyName?: string;
}

let logoCache: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const img = new Image();
    img.src = '/logo.png';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('logo'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 120, 120);
    logoCache = canvas.toDataURL('image/jpeg', 0.85);
    return logoCache;
  } catch {
    return null;
  }
}

const NAVY: [number, number, number] = [5, 10, 21];
const BLUE: [number, number, number] = [37, 99, 235];
const GOLD: [number, number, number] = [245, 158, 11];
const TEXT: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

export async function exportToPdf(docDef: PdfDoc, filename: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const logo = await loadLogo();
  const company = docDef.companyName ?? 'Nexus Solutions Agency';

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 64, pageW, 3, 'F');
    if (logo) doc.addImage(logo, 'JPEG', margin, 12, 40, 40);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(docDef.title, margin + 50, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(docDef.subtitle ?? company, margin + 50, 46);
    doc.setTextColor(...GOLD);
    doc.setFontSize(8);
    doc.text(company.toUpperCase(), pageW - margin, 30, { align: 'right' });
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, pageW - margin, 46, { align: 'right' });
  };

  const drawFooter = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`${company} · Sistema financiero interno`, margin, pageH - 16);
      doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 16, { align: 'right' });
    }
  };

  drawHeader();
  let y = 84;

  if (docDef.filtersText) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Filtros: ${docDef.filtersText}`, margin, y);
    y += 16;
  }

  if (docDef.kpis && docDef.kpis.length) {
    const perRow = Math.min(docDef.kpis.length, 5);
    const boxW = (pageW - margin * 2 - (perRow - 1) * 8) / perRow;
    docDef.kpis.forEach((k, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = margin + col * (boxW + 8);
      const yy = y + row * 46;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, yy, boxW, 40, 4, 4, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(k.label.toUpperCase(), x + 8, yy + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(k.value, x + 8, yy + 30);
      doc.setFont('helvetica', 'normal');
    });
    y += Math.ceil(docDef.kpis.length / perRow) * 46 + 6;
  }

  docDef.sections.forEach((section, idx) => {
    if (idx > 0) y += 10;
    if (y > pageH - 120) {
      doc.addPage();
      drawHeader();
      y = 84;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(section.title, margin, y + 4);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: y + 12,
      head: [section.columns],
      body: section.rows.length ? section.rows : [['Sin datos']],
      margin: { left: margin, right: margin, top: 84 },
      styles: { fontSize: 8, cellPadding: 4, textColor: TEXT, lineColor: [226, 232, 240], lineWidth: 0.4 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries((section.rightAlign ?? []).map((i) => [i, { halign: 'right' as const }])),
      didDrawPage: (data) => {
        if (data.pageNumber > 1 && data.cursor && data.cursor.y < 90) drawHeader();
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  });

  drawFooter();
  doc.save(`${filename}-${todayISO()}.pdf`);
}
