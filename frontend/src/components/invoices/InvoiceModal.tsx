'use client';

import { useRef, useState } from 'react';
import { DocumentReportIcon } from '@/components/icons/ChurchIcons';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { getCurrencyLabel, getCurrencyShort } from '@/lib/utils';

export interface InvoiceItemRow {
  id?: string;
  no: string;
  description: string;
  subDescription?: string;
  amount: number;
}

export interface InvoiceData {
  /** Present only for per-transaction invoices (incomes/expenses); when set,
   *  the modal shows an "Archiver" button that persists a real PDF via
   *  POST /api/transactions/[id]/invoice. Absent for aggregate/period
   *  invoices (e.g. reports/page.tsx) which have no single transaction. */
  transactionId?: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  churchName: string;
  churchDenomination?: string;
  churchAddress?: string;
  churchLogoUrl?: string | null;
  recipientName: string;
  recipientAddress?: string;
  recipientContact?: string;
  items: InvoiceItemRow[];
  total: number;
  paymentMethod: string;
  paymentDetails?: string;
  terms?: string;
  signatoryName?: string;
  signatoryRole?: string;
  notes?: string;
  currency?: string;
  phone?: string;
  email?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData | null;
}

export function InvoiceModal({ isOpen, onClose, data }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !data) return null;

  const currency = getCurrencyLabel(data.currency);
  const currencyShort = getCurrencyShort(data.currency);

  const handlePrint = () => {
    window.print();
  };

  // Real single-transaction invoices are rendered server-side (pdfkit),
  // guaranteed one page, and persisted to Cloudinary — reuse that instead of
  // the browser's print-to-PDF, which used to overflow to a 2nd sheet.
  async function archiveInvoice(): Promise<string | null> {
    if (!data?.transactionId) return null;
    const res = await api<{ transaction: { receiptUrl: string | null } }>(
      `/api/transactions/${data.transactionId}/invoice`,
      {
        method: 'POST',
        body: {
          invoiceNumber: data.invoiceNumber,
          date: data.date,
          recipientName: data.recipientName,
          recipientAddress: data.recipientAddress,
          recipientContact: data.recipientContact,
          items: data.items,
          total: data.total,
          paymentMethod: data.paymentMethod,
          paymentDetails: data.paymentDetails,
          terms: data.terms,
          signatoryName: data.signatoryName,
          signatoryRole: data.signatoryRole,
          phone: data.phone,
          email: data.email,
        },
      },
    );
    return res.transaction?.receiptUrl || null;
  }

  // Fetches the PDF bytes and saves them via a synthetic <a download> click
  // instead of `window.open(url)` — opening the bare Cloudinary URL handed
  // the user a new browser tab showing/re-hosting the file instead of an
  // actual save-to-disk download.
  async function saveUrlAsFile(url: string, filename: string): Promise<void> {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }

  const handleDownload = async () => {
    if (!data?.transactionId) {
      // No backing transaction (aggregate/period invoice) — no server PDF
      // route for this shape, fall back to the browser's print-to-PDF.
      window.print();
      return;
    }
    setDownloading(true);
    try {
      const url = await archiveInvoice();
      if (url) {
        await saveUrlAsFile(url, `facture-${data.invoiceNumber}.pdf`);
      } else {
        toast('Le PDF n’a pas pu être généré pour le moment.', 'error');
      }
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : 'Téléchargement impossible pour le moment.',
        'error',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-2 sm:p-4 overflow-y-auto backdrop-blur-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-4 max-h-[92vh]">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="print:hidden flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <DocumentReportIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Prévisualisation de la Facture / Reçu Officiel
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                Réf : {data.invoiceNumber} • Conforme aux écritures paroissiales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60 transition-all shadow-xs cursor-pointer"
              title="Télécharger la facture en PDF"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{downloading ? 'Génération…' : 'Télécharger PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
              title="Imprimer directement sur imprimante"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Imprimer</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-200/80 text-stone-700 hover:bg-stone-300 font-bold transition-colors ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* ── PRINTABLE INVOICE SHEET (EXACT REPRODUCTION OF USER IMAGE) ── */}
        <div className="overflow-y-auto p-4 sm:p-10 bg-stone-100 flex justify-center">
          <div
            ref={printRef}
            id="printable-invoice"
            className="print-area w-full max-w-[780px] bg-white text-stone-900 shadow-lg p-8 sm:p-12 print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none font-sans"
            style={{ minHeight: '1020px' }}
          >
            {/* 1. TOP HEADER: LOGO/BRAND (LEFT) & INVOICE TITLE (RIGHT) */}
            <div className="flex justify-between items-start pb-8 print:pb-4 border-b border-stone-200">
              {/* Left: Brand / Church Logo & Coordinates */}
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e11d48] text-white font-bold text-2xl shadow-xs">
                  {data.churchLogoUrl ? (
                    <img
                      src={data.churchLogoUrl}
                      alt=""
                      className="h-full w-full object-contain bg-white"
                    />
                  ) : (
                    (data.churchName || 'É').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight text-stone-900 uppercase">
                    {data.churchName || 'Votre Église'}
                  </h1>
                  <p className="text-[11px] font-bold text-stone-500 tracking-wider uppercase">
                    {data.churchDenomination || 'GOSHEN FINANCE • GESTION ECCLÉSIASTIQUE'}
                  </p>
                  {data.churchAddress && (
                    <p className="text-xs text-stone-500 mt-1">{data.churchAddress}</p>
                  )}
                </div>
              </div>

              {/* Right: Big Bold "FACTURE" Title & Number */}
              <div className="text-right">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900 uppercase">
                  FACTURE
                </h2>
                <p className="text-xs font-bold text-stone-400 mt-1 font-mono tracking-wider">
                  #{data.invoiceNumber}
                </p>
              </div>
            </div>

            {/* 2. RECIPIENT & DATE BOX (SPLIT WITH DISTINCTIVE SIDEBAR ACCENT) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 print:py-4 items-center">
              {/* Left: Invoice To */}
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                  FACTURÉ À
                </span>
                <h3 className="text-sm font-bold text-stone-900 mt-1">
                  {data.recipientName || 'Paroisse Locale / Bénéficiaire'}
                </h3>
                {data.recipientAddress && (
                  <p className="text-xs text-stone-600 mt-0.5 whitespace-pre-line leading-relaxed">
                    {data.recipientAddress}
                  </p>
                )}
                {data.recipientContact && (
                  <p className="text-xs text-stone-500 mt-1 font-mono">{data.recipientContact}</p>
                )}
              </div>

              {/* Right: Highlighted Grey Card with Red/Accent Left Stripe (Exact Image Reproduction) */}
              <div className="relative rounded-lg bg-[#f1f5f9] p-5 border-l-4 border-[#e11d48] shadow-2xs">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block font-bold text-stone-700">N° de facture</span>
                    <span className="block text-stone-600 font-mono mt-1 text-[11px] font-semibold truncate">
                      {data.invoiceNumber}
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold text-stone-700">Date</span>
                    <span className="block text-stone-600 font-mono mt-1 text-[11px] font-semibold">
                      {data.date}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ITEMS TABLE (EXACT IMAGE STRUCTURE: FULL RED/ACCENT HEADER & ZEBRA ROWS) */}
            <div className="mt-2 overflow-hidden rounded-t-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#e11d48] text-white font-extrabold tracking-wider text-[11px] uppercase">
                    <th className="py-3 px-4 w-12 text-center">N°</th>
                    <th className="py-3 px-4">DESCRIPTION</th>
                    <th className="py-3 px-4 text-right w-36">MONTANT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row, idx) => {
                    const isEven = idx % 2 === 1;
                    return (
                      <tr
                        key={idx}
                        className={`${
                          isEven ? 'bg-[#f1f5f9]' : 'bg-white'
                        } border-b border-stone-200/80 transition-colors`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-stone-500">
                          {row.no}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-stone-900">{row.description}</p>
                          {row.subDescription && (
                            <p className="text-[10px] text-stone-500 mt-0.5">
                              {row.subDescription}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono">
                          {row.amount.toLocaleString('fr-FR')} {currencyShort}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. FOOTER SUMMARY & LEGAL TERMS (EXACT IMAGE REPRODUCTION) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 print:pt-4 mt-4 print:mt-2 border-t border-stone-200">
              {/* Left Column: Payment Method, Terms & Condition, Signature */}
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-stone-900 uppercase text-[11px]">
                    Moyen de paiement
                  </h4>
                  <p className="text-stone-600 mt-0.5 font-medium leading-relaxed">
                    {data.paymentMethod || 'Airtel Money / Caisse Espèces Libreville'}
                  </p>
                  {data.paymentDetails && (
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      {data.paymentDetails}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-stone-900 uppercase text-[11px]">Conditions</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    {data.terms ||
                      'Cette pièce comptable atteste la régularité des écritures inscrites dans le grand livre de l’église conformément aux normes comptables en vigueur.'}
                  </p>
                </div>

                {/* Signature — only shown when the caller actually supplies
                    one; never a fabricated name/graphic implying the
                    document was already signed by someone unspecified. */}
                {data.signatoryName && (
                  <div className="pt-4 print:pt-2">
                    <div className="inline-block text-center">
                      <p className="font-bold text-xs text-stone-900">{data.signatoryName}</p>
                      {data.signatoryRole && (
                        <p className="text-[10px] text-stone-500 font-medium">
                          {data.signatoryRole}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Subtotal, Taxes, and Full Red Grand Total Box */}
              <div className="flex flex-col justify-between">
                <div className="space-y-2 text-xs">
                  {/* Total Box (Full Red Bar with White Text) */}
                  <div className="rounded-lg bg-[#e11d48] px-5 py-3 text-white flex items-center justify-between shadow-xs">
                    <span className="font-bold text-xs uppercase tracking-wider">Total :</span>
                    <span className="font-mono tabular-nums font-black text-lg tracking-tight">
                      {data.total.toLocaleString('fr-FR')} {currency}
                    </span>
                  </div>
                </div>

                {/* Bottom Thank You & Contacts — real church contact info
                    only; a field with nothing configured simply doesn't
                    render, rather than showing a fabricated placeholder. */}
                <div className="pt-8 print:pt-4 text-center sm:text-right">
                  <p className="font-bold text-sm text-[#e11d48]">Merci pour votre confiance.</p>
                  {(data.phone || data.email) && (
                    <div className="flex items-center justify-center sm:justify-end gap-4 text-[11px] text-stone-500 mt-1">
                      {data.phone && <span>📞 {data.phone}</span>}
                      {data.email && <span>✉️ {data.email}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
