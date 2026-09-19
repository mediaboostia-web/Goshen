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
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { canAccessBranch } from '@/lib/server/church/branch-access';
import { generateInvoicePdf } from '@/lib/server/reports/invoice-pdf';
import { uploadBuffer, StorageNotConfiguredError } from '@/lib/server/upload/cloudinary-client';
import { log } from '@/lib/server/observability/log';

const InvoiceItem = z.object({
  no: z.string(),
  description: z.string(),
  subDescription: z.string().optional(),
  amount: z.number(),
});

const ArchiveInvoiceBody = z.object({
  invoiceNumber: z.string(),
  date: z.string(),
  recipientName: z.string(),
  recipientAddress: z.string().optional(),
  recipientContact: z.string().optional(),
  items: z.array(InvoiceItem).min(1),
  total: z.number(),
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
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const { id } = await ctx.params;
    const transaction = await prisma.financialTransaction.findFirst({
      where: { id, organizationId: access.church.id },
      include: { branch: { select: { name: true } } },
    });
    if (!transaction) {
      return NextResponse.json({ error: 'TRANSACTION_NOT_FOUND' }, { status: 404 });
    }
    if (!canAccessBranch(access, transaction.branchId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
        { status: 403 },
      );
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
        churchLogoUrl: access.church.logoUrl,
      });
      // No .pdf suffix on the public_id: Cloudinary appends the detected
      // format extension to the delivery URL itself — adding one here
      // produced a literal "....pdf.pdf" filename.
      uploaded = await uploadBuffer(
        `invoices/${access.church.id}/${transaction.id}`,
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
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err);
      log.warn('invoice PDF generation/upload failed', {
        transactionId: transaction.id,
        error: message,
      });
      return NextResponse.json({ error: 'INVOICE_ARCHIVE_FAILED' }, { status: 502 });
    }

    const updated = await prisma.financialTransaction.update({
      where: { id: transaction.id },
      data: { receiptUrl: uploaded.secureUrl, receiptPublicId: uploaded.publicId },
      select: { id: true, receiptUrl: true, receiptPublicId: true },
    });

    await prisma.generatedInvoice.create({
      data: { organizationId: access.church.id, transactionId: transaction.id },
    });

    return NextResponse.json({ transaction: updated }, { status: 200 });
  });
}
