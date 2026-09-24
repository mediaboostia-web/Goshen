export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { allowedBranchIds, canAccessBranch } from '@/lib/server/church/branch-access';
import { generateReportPdf } from '@/lib/server/reports/pdf';
import { uploadBuffer, StorageNotConfiguredError } from '@/lib/server/upload/cloudinary-client';
import { log } from '@/lib/server/observability/log';

const GenerateReportBody = z.object({
  title: z.string().min(3, 'Titre du rapport requis'),
  periodType: z.enum(['SUNDAY_SERVICE', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']),
  branchId: z.string().optional(), // empty or 'CONSOLIDATED' for all
  startDate: z.string(),
  endDate: z.string(),
  locale: z.enum(['fr', 'en']).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND', reports: [] }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const { searchParams } = new URL(req.url);
    const preview = searchParams.get('preview');

    // If preview query is set, calculate aggregated data on the fly
    if (preview === 'true') {
      const branchId = searchParams.get('branchId');
      const startStr = searchParams.get('startDate') || new Date().toISOString();
      const endStr = searchParams.get('endDate') || new Date().toISOString();
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      const allowed = allowedBranchIds(access);
      if (branchId && branchId !== 'CONSOLIDATED' && allowed && !allowed.includes(branchId)) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
          { status: 403 },
        );
      }

      const where: Record<string, unknown> = {
        organizationId: access.church.id,
        date: { gte: startDate, lte: endDate },
      };
      if (branchId && branchId !== 'CONSOLIDATED') {
        where.branchId = branchId;
      } else if (allowed) {
        where.branchId = { in: allowed };
      }

      const transactions = await prisma.financialTransaction.findMany({
        where,
        include: {
          category: true,
          branch: true,
          author: { select: { name: true, email: true } },
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate by category
      const incomesByCategory: Record<string, number> = {};
      const expensesByCategory: Record<string, number> = {};
      let totalIncome = 0;
      let totalExpense = 0;

      for (const t of transactions) {
        if (t.type === 'INCOME') {
          incomesByCategory[t.category.name] = (incomesByCategory[t.category.name] || 0) + t.amount;
          totalIncome += t.amount;
        } else {
          expensesByCategory[t.category.name] =
            (expensesByCategory[t.category.name] || 0) + t.amount;
          totalExpense += t.amount;
        }
      }

      // Current balance of target branch or all branches
      let currentBalance = 0;
      if (branchId && branchId !== 'CONSOLIDATED') {
        const b = await prisma.branch.findFirst({
          where: { id: branchId, organizationId: access.church.id },
        });
        if (!b) {
          return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
        }
        currentBalance = b.currentBalance;
      } else {
        const agg = await prisma.branch.aggregate({
          where: {
            organizationId: access.church.id,
            status: 'ACTIVE',
            ...(allowed ? { id: { in: allowed } } : {}),
          },
          _sum: { currentBalance: true },
        });
        currentBalance = agg._sum.currentBalance || 0;
      }

      const closingBalance = currentBalance;
      const openingBalance = closingBalance - (totalIncome - totalExpense);

      return NextResponse.json({
        preview: {
          openingBalance,
          closingBalance,
          totalIncome,
          totalExpense,
          netDifference: totalIncome - totalExpense,
          incomesByCategory,
          expensesByCategory,
          transactionCount: transactions.length,
          transactions,
        },
      });
    }

    // Default: list archived reports. A branch-restricted member sees only
    // reports scoped to their own branches — a consolidated report
    // (branchId: null) aggregates the whole org and would otherwise leak
    // other annexes' totals to them.
    const listAllowed = allowedBranchIds(access);
    const reports = await prisma.report.findMany({
      where: {
        organizationId: access.church.id,
        ...(listAllowed ? { branchId: { in: listAllowed } } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const body = await req.json().catch(() => null);
    const parsed = GenerateReportBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      title,
      periodType,
      branchId,
      startDate: startStr,
      endDate: endStr,
      locale,
    } = parsed.data;
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const isConsolidated = !branchId || branchId === 'CONSOLIDATED';
    if (!isConsolidated && !canAccessBranch(access, branchId)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Vous n’avez pas accès à cette annexe.' },
        { status: 403 },
      );
    }
    const allowed = allowedBranchIds(access);
    const where: Record<string, unknown> = {
      organizationId: access.church.id,
      date: { gte: startDate, lte: endDate },
    };
    if (!isConsolidated) {
      where.branchId = branchId;
    } else if (allowed) {
      // Same rule as the preview above: a restricted member's "consolidated"
      // report is scoped to their own branches, not the whole org's.
      where.branchId = { in: allowed };
    }

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
        branch: true,
        author: { select: { name: true, email: true } },
      },
      orderBy: { date: 'asc' },
    });

    const incomesByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of transactions) {
      if (t.type === 'INCOME') {
        incomesByCategory[t.category.name] = (incomesByCategory[t.category.name] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
        expensesByCategory[t.category.name] = (expensesByCategory[t.category.name] || 0) + t.amount;
        totalExpense += t.amount;
      }
    }

    let currentBalance = 0;
    if (!isConsolidated) {
      const b = await prisma.branch.findFirst({
        where: { id: branchId, organizationId: access.church.id },
      });
      if (!b) {
        return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
      }
      currentBalance = b.currentBalance;
    } else {
      const agg = await prisma.branch.aggregate({
        where: {
          organizationId: access.church.id,
          status: 'ACTIVE',
          ...(allowed ? { id: { in: allowed } } : {}),
        },
        _sum: { currentBalance: true },
      });
      currentBalance = agg._sum.currentBalance || 0;
    }

    const closingBalance = currentBalance;
    const openingBalance = closingBalance - (totalIncome - totalExpense);

    const branchName = isConsolidated
      ? 'Toutes les annexes (Consolidé)'
      : transactions[0]?.branch.name || 'Annexe';

    // PRD F25/US06: the persisted report keeps the full operation list (not
    // just the count) so the archived JSON and the generated PDF agree.
    const transactionRows = transactions.map((t) => ({
      date: t.date.toISOString(),
      type: t.type as 'INCOME' | 'EXPENSE',
      categoryName: t.category.name,
      amount: t.amount,
      beneficiary: t.beneficiary,
      authorName: t.author.name || t.author.email,
    }));

    const reportData = {
      churchName: access.church.name,
      denomination: access.church.denomination,
      branchName,
      incomesByCategory,
      expensesByCategory,
      openingBalance,
      closingBalance,
      totalIncome,
      totalExpense,
      transactionsCount: transactions.length,
      transactions: transactionRows,
      generatedAt: new Date().toISOString(),
    };

    const report = await prisma.report.create({
      data: {
        organizationId: access.church.id,
        branchId: isConsolidated ? null : branchId,
        title,
        periodType,
        startDate,
        endDate,
        openingBalance,
        closingBalance,
        totalIncome,
        totalExpense,
        data: reportData,
        createdById: auth.user.sub,
      },
    });

    // Generate + upload the PDF. Best-effort: the Report row above is
    // already the source of truth — a PDF failure (e.g. Cloudinary not
    // configured) must not fail report creation, it just leaves pdfUrl
    // null and the frontend falls back to showing the on-screen summary.
    try {
      const pdfBuffer = await generateReportPdf({
        title,
        churchName: access.church.name,
        denomination: access.church.denomination,
        branchName,
        startDate,
        endDate,
        openingBalance,
        closingBalance,
        totalIncome,
        totalExpense,
        incomesByCategory,
        expensesByCategory,
        transactions: transactionRows,
        currency: access.church.currency,
        locale,
      });

      // No .pdf suffix on the public_id — Cloudinary appends the detected
      // format extension to the delivery URL itself (see the invoice route's
      // uploadBuffer call for the same fix and why).
      const uploaded = await uploadBuffer(
        `reports/${access.church.id}/${report.id}`,
        pdfBuffer,
        'application/pdf',
      );

      const updated = await prisma.report.update({
        where: { id: report.id },
        data: { pdfUrl: uploaded.secureUrl },
      });

      return NextResponse.json({ report: updated }, { status: 201 });
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        log.warn('report PDF not uploaded: storage not configured', { reportId: report.id });
      } else {
        log.warn('report PDF generation/upload failed', {
          reportId: report.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return NextResponse.json({ report }, { status: 201 });
    }
  });
}
