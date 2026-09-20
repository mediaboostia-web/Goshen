export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';

import { convertCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency-rates';

const PAYMENT_METHOD_CODES = ['ESPECES', 'MOBILE_MONEY', 'CARTE_BANCAIRE'] as const;

const UpdateChurchBody = z.object({
  name: z.string().min(2, 'Le nom de l’église doit contenir au moins 2 caractères').optional(),
  denomination: z.string().optional(),
  currency: z.string().min(1, 'Devise invalide').max(10, 'Devise trop longue').optional(),
  paymentMethods: z.array(z.enum(PAYMENT_METHOD_CODES)).optional(),
  paymentDetails: z.string().max(500).optional(),
  email: z.string().email('Adresse email invalide').max(255).or(z.literal('')).optional(),
  phone: z.string().max(30).optional(),
  logoUrl: z.string().url('URL de logo invalide').max(500).or(z.literal('')).optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

    if (!access.isPastor) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seul le pasteur peut modifier les informations de l’église.',
        },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateChurchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, denomination, currency, paymentMethods, paymentDetails, email, phone, logoUrl } =
      parsed.data;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (denomination !== undefined) data.denomination = denomination || null;
    if (currency !== undefined) data.currency = currency.toUpperCase().trim();
    if (paymentMethods !== undefined) data.paymentMethods = paymentMethods;
    if (paymentDetails !== undefined) data.paymentDetails = paymentDetails || null;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (logoUrl !== undefined) data.logoUrl = logoUrl || null;

    const targetCurrency = currency !== undefined ? currency.toUpperCase().trim() : undefined;
    const oldCurrency = access.church.currency
      ? access.church.currency.toUpperCase().trim()
      : 'XAF';
    const isCurrencyChanging =
      targetCurrency !== undefined &&
      normalizeCurrencyCode(targetCurrency) !== normalizeCurrencyCode(oldCurrency);

    if (isCurrencyChanging) {
      const branches = await prisma.branch.findMany({
        where: { organizationId: access.church.id },
      });
      const transactions = await prisma.financialTransaction.findMany({
        where: { organizationId: access.church.id },
      });
      const recurring = await prisma.recurringExpense.findMany({
        where: { organizationId: access.church.id },
        include: { executions: true },
      });

      const church = await prisma.$transaction(async (tx) => {
        for (const b of branches) {
          const newBal = convertCurrencyAmount(b.currentBalance, oldCurrency, targetCurrency);
          const newThresh = convertCurrencyAmount(
            b.lowBalanceThreshold,
            oldCurrency,
            targetCurrency,
          );
          await tx.branch.update({
            where: { id: b.id },
            data: { currentBalance: newBal, lowBalanceThreshold: newThresh },
          });
        }

        for (const t of transactions) {
          const newAmt = convertCurrencyAmount(t.amount, oldCurrency, targetCurrency);
          await tx.financialTransaction.update({
            where: { id: t.id },
            data: { amount: newAmt },
          });
        }

        for (const r of recurring) {
          const newAmt = convertCurrencyAmount(r.amount, oldCurrency, targetCurrency);
          await tx.recurringExpense.update({
            where: { id: r.id },
            data: { amount: newAmt },
          });
          for (const exec of r.executions) {
            const newExecAmt = convertCurrencyAmount(exec.amount, oldCurrency, targetCurrency);
            await tx.recurringExpenseExecution.update({
              where: { id: exec.id },
              data: { amount: newExecAmt },
            });
          }
        }

        return tx.organization.update({
          where: { id: access.church.id },
          data,
        });
      });

      return NextResponse.json({ church, converted: true, previousCurrency: oldCurrency });
    }

    const church = await prisma.organization.update({
      where: { id: access.church.id },
      data,
    });

    return NextResponse.json({ church });
  });
}
