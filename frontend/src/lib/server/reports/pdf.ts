// PRD F25 — one-click PDF report generation.
//
// Pure-Node PDF generation via pdfkit (no headless browser / Chromium),
// so this runs fine in a Vercel serverless function. The resulting Buffer
// is uploaded to Cloudinary by the caller (reports/route.ts) — this module
// only builds the document.
import 'server-only';
import PDFDocument from 'pdfkit';

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

function formatAmount(n: number, currency = 'FCFA'): string {
  return `${n.toLocaleString('fr-FR')} ${currency}`;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

/**
 * Renders the report as an A4 PDF and resolves with the full document as a
 * Buffer. Never touches the network or the filesystem — the caller is
 * responsible for persisting the result (Cloudinary upload + Report.pdfUrl).
 */
export async function generateReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#022c22').text(input.churchName);
      if (input.denomination) {
        doc.fontSize(10).font('Helvetica').fillColor('#555').text(input.denomination);
      }
      doc.moveDown(0.6);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(input.title);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333')
        .text(
          `${input.branchName} — ${formatDate(input.startDate)} au ${formatDate(input.endDate)}`,
        );
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d6d3d1').stroke();
      doc.moveDown();

      // ── Summary ─────────────────────────────────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('Résumé financier');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#000');
      doc.text(`Solde d'ouverture : ${formatAmount(input.openingBalance, input.currency)}`);
      doc.text(`Total des entrées : ${formatAmount(input.totalIncome, input.currency)}`);
      doc.text(`Total des dépenses : ${formatAmount(input.totalExpense, input.currency)}`);
      doc
        .font('Helvetica-Bold')
        .text(`Solde de clôture : ${formatAmount(input.closingBalance, input.currency)}`);
      doc.moveDown();

      // ── Income by category ──────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Entrées par catégorie');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      const incomeEntries = Object.entries(input.incomesByCategory);
      if (incomeEntries.length === 0) {
        doc.fillColor('#888').text('Aucune entrée sur la période.');
      } else {
        doc.fillColor('#000');
        for (const [name, amount] of incomeEntries) {
          doc.text(`${name} : ${formatAmount(amount, input.currency)}`);
        }
      }
      doc.moveDown();

      // ── Expense by category ─────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Dépenses par catégorie');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      const expenseEntries = Object.entries(input.expensesByCategory);
      if (expenseEntries.length === 0) {
        doc.fillColor('#888').text('Aucune dépense sur la période.');
      } else {
        doc.fillColor('#000');
        for (const [name, amount] of expenseEntries) {
          doc.text(`${name} : ${formatAmount(amount, input.currency)}`);
        }
      }
      doc.moveDown();

      // ── Detailed operations list (PRD: "liste détaillée des opérations") ──
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Détail des opérations');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      if (input.transactions.length === 0) {
        doc.fillColor('#888').text('Aucune opération sur la période.');
      } else {
        doc.fillColor('#000');
        for (const t of input.transactions) {
          const sign = t.type === 'INCOME' ? '+' : '-';
          const beneficiary = t.beneficiary ? `  (${t.beneficiary})` : '';
          doc.text(
            `${formatDate(t.date)}   ${t.categoryName}   ${sign}${formatAmount(t.amount, input.currency)}${beneficiary}`,
          );
        }
      }

      doc.moveDown();
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(`Généré le ${formatDate(new Date())} — Goshen Finance`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
