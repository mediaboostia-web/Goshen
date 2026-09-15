// POST /api/transactions/[id]/invoice — archive the printable invoice/receipt
// shown in InvoiceModal.tsx as a real PDF, persisted on the transaction
// itself (FinancialTransaction.receiptUrl/receiptPublicId already exist for
// expense receipt photos — an invoice PDF is just another archived receipt).
//
// Degrades like /api/reports (POST): a Cloudinary-not-configured error must
// not look like a generic 500 — the upload route's convention is a clean 503
// STORAGE_NOT_CONFIGURED.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';
import { generateInvoicePdf } from '@/lib/server/reports/invoice-pdf';
import { uploadBuffer, StorageNotConfiguredError } from '@/lib/server/upload/cloudinary-client';
import { log } from '@/lib/server/observability/log';

const InvoiceItem = z.object({
  no: z.string(),
  description: z.string(),
  subDescription: z.string().optional(),
  price: z.number(),
  qty: z.union([z.number(), z.string()]),
  total: z.number(),
});

const ArchiveInvoiceBody = z.object({
  invoiceNumber: z.string(),
  date: z.string(),
  recipientName: z.string(),
  recipientAddress: z.string().optional(),
  recipientContact: z.string().optional(),
  items: z.array(InvoiceItem).min(1),
  subTotal: z.number(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  grandTotal: z.number(),
  paymentMethod: z.string(),
  paymentDetails: z.string().optional(),
  terms: z.string().optional(),
  signatoryName: z.string().optional(),
  signatoryRole: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }

    const { id } = await ctx.params;
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id, organizationId: access.church.id },
      include: { branch: { select: { name: true } } },
    });
    if (!transaction) {
      return NextResponse.json({ error: 'TRANSACTION_NOT_FOUND' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ArchiveInvoiceBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    let uploaded;
    try {
      const pdfBuffer = await generateInvoicePdf({
        ...parsed.data,
        churchName: access.church.name,
        churchDenomination: access.church.denomination,
        churchAddress: transaction.branch.name,
      });
      uploaded = await uploadBuffer(
        `invoices/${access.church.id}/${transaction.id}.pdf`,
        pdfBuffer,
        'application/pdf',
      );
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        return NextResponse.json(
          {
            error: 'STORAGE_NOT_CONFIGURED',
            message: 'Le stockage des fichiers n’est pas configuré.',
          },
          { status: 503 },
        );
      }
      log.warn('invoice PDF generation/upload failed', {
        transactionId: transaction.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: 'INVOICE_ARCHIVE_FAILED' }, { status: 502 });
    }

    const updated = await prisma.financialTransaction.update({
      where: { id: transaction.id },
      data: { receiptUrl: uploaded.secureUrl, receiptPublicId: uploaded.publicId },
      select: { id: true, receiptUrl: true, receiptPublicId: true },
    });

    return NextResponse.json({ transaction: updated }, { status: 200 });
  });
}
