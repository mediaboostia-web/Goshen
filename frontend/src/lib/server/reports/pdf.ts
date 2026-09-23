// PRD F25 — one-click PDF report generation.
//
// Pure-Node PDF generation via pdfkit (no headless browser / Chromium),
// so this runs fine in a Vercel serverless function. The resulting Buffer
// is uploaded to Cloudinary by the caller (reports/route.ts) — this module
// only builds the document.
import 'server-only';
import PDFDocument from 'pdfkit';
import { formatCurrency, getCurrencyLabel } from '@/lib/utils';

export interface ReportPdfTransaction {
  date: string | Date;
  type: 'INCOME' | 'EXPENSE';
  categoryName: string;
  amount: number;
  beneficiary?: string | null;
  authorName?: string | null;
}

export interface ReportPdfInput {
  title: string;
  churchName: string;
  denomination?: string | null;
  branchName: string;
  startDate: string | Date;
  endDate: string | Date;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  incomesByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  transactions: ReportPdfTransaction[];
  currency?: string;
}

// Palette mirrors goshen-tokens.css (frontend/src/app/globals.css) so the
// archived PDF reads as the same brand as the app, not pdfkit's black-on-
// white defaults.
const INK = '#0f172a'; // --color-stone-800
const MUTED = '#6b7690'; // --color-stone-500
const FAINT = '#8b96ab'; // --color-stone-400
const LINE = '#c7ceda'; // --color-stone-200
const CARD_BG = '#f8fafc'; // --color-stone-50
const EMERALD = '#086158'; // --color-emerald-800 — brand primary, income
const EMERALD_DARK = '#033330'; // --color-emerald-950 — table header band
const ROSE = '#be123c'; // expenses / negative figures

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

/** Adds a page (resetting the y cursor to the top margin) once `needed` pt
 * of vertical space no longer fits above the bottom margin. Every custom-
 * drawn block below checks this itself — pdfkit only auto-paginates its own
 * flowing `.text()` calls, never rects/tables positioned by hand, which is
 * exactly what silently clipped long transaction lists before this file
 * tracked space itself. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

/**
 * Renders the report as an A4 PDF and resolves with the full document as a
 * Buffer. Never touches the network or the filesystem — the caller is
 * responsible for persisting the result (Cloudinary upload + Report.pdfUrl).
 */
export async function generateReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = input.currency;
      const currencyLabel = getCurrencyLabel(currency);
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentWidth = right - left;
      const amount = (n: number) => formatCurrency(n, currency);

      // ── Brand strip ─────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 6).fill(EMERALD);

      // ── Header: identity (left) + report title/period (right) ────────
      doc
        .fontSize(17)
        .font('Helvetica-Bold')
        .fillColor(INK)
        .text(input.churchName, left, 40, { width: contentWidth * 0.55 });
      if (input.denomination) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(MUTED)
          .text(input.denomination, left, doc.y + 2, { width: contentWidth * 0.55 });
      }

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(EMERALD)
        .text(input.title, left, 40, { width: contentWidth, align: 'right' });
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(MUTED)
        .text(
          `${input.branchName} — ${formatDate(input.startDate)} au ${formatDate(input.endDate)}`,
          left,
          doc.y + 2,
          { width: contentWidth, align: 'right' },
        );

      doc.y = Math.max(doc.y, 78);
      doc.moveDown(1);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(LINE).lineWidth(1).stroke();
      doc.moveDown(1.2);

      // ── Summary stat cards ─────────────────────────────────────────
      const cards: { label: string; value: number; color: string }[] = [
        { label: 'Ouverture', value: input.openingBalance, color: INK },
        { label: 'Entrées', value: input.totalIncome, color: EMERALD },
        { label: 'Dépenses', value: input.totalExpense, color: ROSE },
        {
          label: 'Clôture',
          value: input.closingBalance,
          color: input.closingBalance >= 0 ? EMERALD : ROSE,
        },
      ];
      const cardGap = 10;
      const cardWidth = (contentWidth - cardGap * 3) / 4;
      const cardHeight = 56;
      ensureSpace(doc, cardHeight + 10);
      const cardsTop = doc.y;
      cards.forEach((card, idx) => {
        const x = left + idx * (cardWidth + cardGap);
        doc.roundedRect(x, cardsTop, cardWidth, cardHeight, 6).fillAndStroke(CARD_BG, LINE);
        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor(MUTED)
          .text(card.label.toUpperCase(), x + 10, cardsTop + 10, {
            width: cardWidth - 20,
            characterSpacing: 0.3,
          });
        doc
          .fontSize(10.5)
          .font('Helvetica-Bold')
          .fillColor(card.color)
          .text(amount(card.value), x + 10, cardsTop + 27, {
            width: cardWidth - 20,
            height: 18,
            ellipsis: true,
          });
      });
      doc.y = cardsTop + cardHeight + 26;

      // ── Category breakdown: two columns (income left, expense right) ──
      function drawCategoryColumn(
        x: number,
        width: number,
        top: number,
        label: string,
        barColor: string,
        entries: [string, number][],
        emptyLabel: string,
      ): number {
        doc.roundedRect(x, top, width, 20, 4).fill(barColor);
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(label.toUpperCase(), x + 10, top + 6, {
            width: width - 20,
            characterSpacing: 0.3,
          });

        let rowY = top + 20;
        if (entries.length === 0) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(FAINT)
            .text(emptyLabel, x + 10, rowY + 8, { width: width - 20 });
          return rowY + 30;
        }

        entries.forEach(([name, value], idx) => {
          const rowHeight = 20;
          if (idx % 2 === 1) doc.rect(x, rowY, width, rowHeight).fill(CARD_BG);
          doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor(INK)
            .text(name, x + 10, rowY + 6, { width: width * 0.55, height: 14, ellipsis: true });
          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor(INK)
            .text(amount(value), x + width * 0.55, rowY + 6, {
              width: width * 0.45 - 10,
              align: 'right',
              height: 14,
              ellipsis: true,
            });
          rowY += rowHeight;
        });
        return rowY;
      }

      const incomeEntries = Object.entries(input.incomesByCategory);
      const expenseEntries = Object.entries(input.expensesByCategory);
      const columnGap = 24;
      const columnWidth = (contentWidth - columnGap) / 2;
      const maxRows = Math.max(incomeEntries.length, expenseEntries.length, 1);
      ensureSpace(doc, 20 + maxRows * 20 + 20);
      const columnsTop = doc.y;
      const incomeEnd = drawCategoryColumn(
        left,
        columnWidth,
        columnsTop,
        'Entrées par catégorie',
        EMERALD,
        incomeEntries,
        'Aucune entrée sur la période.',
      );
      const expenseEnd = drawCategoryColumn(
        left + columnWidth + columnGap,
        columnWidth,
        columnsTop,
        'Dépenses par catégorie',
        ROSE,
        expenseEntries,
        'Aucune dépense sur la période.',
      );
      doc.y = Math.max(incomeEnd, expenseEnd) + 26;

      // ── Operations table (paginates: header row repeats on each page) ──
      ensureSpace(doc, 60);
      doc
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor(INK)
        .text('DÉTAIL DES OPÉRATIONS', left, doc.y, { characterSpacing: 0.4 });
      doc.moveDown(0.6);

      const colDate = 68;
      const colAmount = 120;
      const colBeneficiary = 130;
      const colCategory = contentWidth - colDate - colAmount - colBeneficiary;
      const headerHeight = 22;
      const rowHeight = 20;

      function drawTableHeader(y: number): number {
        doc.rect(left, y, contentWidth, headerHeight).fill(EMERALD_DARK);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        let x = left;
        doc.text('DATE', x + 8, y + 7, { width: colDate - 8 });
        x += colDate;
        doc.text('CATÉGORIE', x + 8, y + 7, { width: colCategory - 8 });
        x += colCategory;
        doc.text('BÉNÉFICIAIRE', x + 8, y + 7, { width: colBeneficiary - 8 });
        x += colBeneficiary;
        doc.text('MONTANT', x, y + 7, { width: colAmount - 10, align: 'right' });
        return y + headerHeight;
      }

      let tableY = drawTableHeader(doc.y);

      if (input.transactions.length === 0) {
        doc.rect(left, tableY, contentWidth, 30).fill(CARD_BG);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(FAINT)
          .text('Aucune opération sur la période.', left + 10, tableY + 10);
        tableY += 30;
      } else {
        input.transactions.forEach((t, idx) => {
          if (tableY + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            tableY = drawTableHeader(doc.page.margins.top);
          }
          if (idx % 2 === 1) doc.rect(left, tableY, contentWidth, rowHeight).fill(CARD_BG);

          let x = left;
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(MUTED)
            .text(formatDate(t.date), x + 8, tableY + 6, {
              width: colDate - 8,
              height: 14,
              ellipsis: true,
            });
          x += colDate;
          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor(INK)
            .text(t.categoryName, x + 8, tableY + 6, {
              width: colCategory - 8,
              height: 14,
              ellipsis: true,
            });
          x += colCategory;
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(FAINT)
            .text(t.beneficiary || '—', x + 8, tableY + 6, {
              width: colBeneficiary - 8,
              height: 14,
              ellipsis: true,
            });
          x += colBeneficiary;
          const sign = t.type === 'INCOME' ? '+ ' : '− ';
          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor(t.type === 'INCOME' ? EMERALD : ROSE)
            .text(`${sign}${amount(t.amount)}`, x, tableY + 6, {
              width: colAmount - 10,
              align: 'right',
              height: 14,
              ellipsis: true,
            });

          tableY += rowHeight;
        });
      }
      doc.moveTo(left, tableY).lineTo(right, tableY).strokeColor(LINE).stroke();

      // ── Footer + page numbers on every page ────────────────────────
      const pageRange = doc.bufferedPageRange();
      for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 32;
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(FAINT)
          .text(
            `Généré le ${formatDate(new Date())} — Goshen Finance · Montants en ${currencyLabel}`,
            left,
            footerY,
            { width: contentWidth * 0.7 },
          );
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(FAINT)
          .text(`Page ${i - pageRange.start + 1} / ${pageRange.count}`, left, footerY, {
            width: contentWidth,
            align: 'right',
          });
      }

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
