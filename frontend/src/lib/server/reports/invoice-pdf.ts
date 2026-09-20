// Real archive for the per-transaction invoice/receipt shown in
// InvoiceModal.tsx. Pure-Node PDF generation via pdfkit (same approach as
// generateReportPdf in ./pdf.ts) — the caller uploads the resulting Buffer
// and persists the URL on FinancialTransaction.receiptUrl/receiptPublicId.
import 'server-only';
import PDFDocument from 'pdfkit';
import { formatPrice } from '@/lib/utils';

export interface InvoicePdfItem {
  no: string;
  description: string;
  subDescription?: string | undefined;
  amount: number;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  date: string;
  churchName: string;
  // Sourced from the DB (Organization.denomination / Branch.name), which are
  // nullable columns — distinct from the other optional fields below, which
  // are sourced from a Zod-parsed request body (`.optional()` → `| undefined`).
  churchDenomination?: string | null;
  churchAddress?: string | null;
  churchLogoUrl?: string | null;
  recipientName: string;
  recipientAddress?: string | undefined;
  recipientContact?: string | undefined;
  items: InvoicePdfItem[];
  total: number;
  paymentMethod: string;
  paymentDetails?: string | undefined;
  terms?: string | undefined;
  signatoryName?: string | undefined;
  signatoryRole?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  currency?: string | null;
}

const ACCENT = '#e11d48';

// PDFKit's standard Helvetica font can't render the narrow no-break space
// (U+202F) that `Number.toLocaleString('fr-FR')` uses as a thousands
// separator — it falls back to a visible glyph that looks like "/" (e.g.
// "40 /000 F" instead of "40 000 F"). `formatPrice` normalizes that to a
// plain ASCII space, which every PDF font supports.
function formatAmount(n: number, currency = 'FCFA'): string {
  const code = !currency || currency === 'XAF' || currency === 'XOF' ? 'FCFA' : currency;
  return formatPrice(n, code);
}

// pdfkit only embeds JPEG/PNG — a WEBP logo (allowed at upload time for the
// web UI) would throw mid-render, so we check Content-Type and skip the
// image rather than fail the whole invoice. The church name still renders
// as text either way.
async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('jpeg') && !contentType.includes('png')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Renders the invoice/receipt as an A4 PDF and resolves with the full
 * document as a Buffer. Never touches the filesystem — the caller (the
 * invoice route) uploads it to Cloudinary and stores the URL. Fetches the
 * church's logo bytes over the network (if configured) before opening the
 * PDF stream, since PDFDocument's synchronous drawing calls can't await.
 */
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const logoBuffer = input.churchLogoUrl ? await fetchLogoBuffer(input.churchLogoUrl) : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────
      let logoDrawn = false;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 45, { fit: [32, 32] });
          logoDrawn = true;
        } catch {
          logoDrawn = false;
        }
      }
      const headerX = logoDrawn ? 92 : 50;

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#0c0a09')
        .text(input.churchName, headerX, 50, { width: 250 });
      if (input.churchDenomination) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#78716c')
          .text(input.churchDenomination, headerX, doc.y + 2, { width: 250 });
      }
      if (input.churchAddress) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#78716c')
          .text(input.churchAddress, headerX, doc.y + 2, { width: 250 });
      }

      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0c0a09')
        .text('FACTURE', 0, 50, { align: 'right' });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#a8a29e')
        .text(`N° ${input.invoiceNumber}`, { align: 'right' });

      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e7e5e4').stroke();
      doc.moveDown();

      // ── Recipient + date box ────────────────────────────────────────
      const infoTop = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#78716c').text('FACTURÉ À', 50, infoTop);
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0c0a09')
        .text(input.recipientName, 50, doc.y + 2);
      if (input.recipientAddress) {
        doc.fontSize(9).font('Helvetica').fillColor('#57534e').text(input.recipientAddress, 50);
      }
      if (input.recipientContact) {
        doc.fontSize(9).font('Helvetica').fillColor('#78716c').text(input.recipientContact, 50);
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#78716c').text('DATE', 350, infoTop);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#0c0a09')
        .text(input.date, 350, doc.y + 2);

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e7e5e4').stroke();
      doc.moveDown();

      // ── Items table ─────────────────────────────────────────────────
      const curLabel = !input.currency || input.currency === 'XAF' || input.currency === 'XOF' ? 'FCFA' : input.currency;
      const curShort = curLabel === 'FCFA' ? 'F' : curLabel;

      const tableTop = doc.y;
      doc.rect(50, tableTop, 495, 22).fill(ACCENT);
      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop + 6)
        .text('MONTANT', 400, tableTop + 6, { width: 135, align: 'right' });

      let rowY = tableTop + 22;
      input.items.forEach((row, idx) => {
        const isEven = idx % 2 === 1;
        const rowHeight = row.subDescription ? 34 : 22;
        if (isEven) {
          doc.rect(50, rowY, 495, rowHeight).fill('#f5f5f4');
        }
        doc
          .fillColor('#0c0a09')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(row.description, 60, rowY + 6, { width: 260 });
        if (row.subDescription) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#78716c')
            .text(row.subDescription, 60, rowY + 18, { width: 260 });
        }
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0c0a09')
          .text(formatPrice(row.amount, curShort), 400, rowY + 6, {
            width: 135,
            align: 'right',
          });
        rowY += rowHeight;
      });
      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#e7e5e4').stroke();

      // ── Footer: payment method / terms (left) + totals (right) ────────
      const footerTop = rowY + 20;
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0c0a09')
        .text('MOYEN DE PAIEMENT', 50, footerTop);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#57534e')
        .text(input.paymentMethod, 50, doc.y + 2, { width: 260 });
      if (input.paymentDetails) {
        doc
          .fontSize(8)
          .fillColor('#78716c')
          .text(input.paymentDetails, 50, doc.y + 2, {
            width: 260,
          });
      }

      if (input.terms) {
        doc.moveDown(0.6);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0c0a09').text('CONDITIONS', 50);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#78716c')
          .text(input.terms, 50, doc.y + 2, { width: 260 });
      }

      if (input.signatoryName) {
        doc.moveDown(1);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0c0a09').text(input.signatoryName, 50);
        if (input.signatoryRole) {
          doc.fontSize(8).font('Helvetica').fillColor('#78716c').text(input.signatoryRole, 50);
        }
      }

      const totalsY = footerTop;
      doc.rect(330, totalsY, 205, 28).fill(ACCENT);
      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TOTAL', 340, totalsY + 9)
        .fontSize(11)
        .text(formatAmount(input.total, curLabel), 330, totalsY + 8, { width: 195, align: 'right' });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#a8a29e')
        .text(
          `${input.phone ? `Tél : ${input.phone}` : ''}${
            input.phone && input.email ? '  •  ' : ''
          }${input.email ? `Courriel : ${input.email}` : ''}`,
          330,
          totalsY + 40,
          { width: 205, align: 'right' },
        );

      doc.moveDown(4);
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(ACCENT)
        .text('Merci pour votre confiance.', 50, Math.max(doc.y, totalsY + 60), {
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
