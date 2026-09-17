export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { slugify } from '@/lib/server/slug';

const DEFAULT_INCOMES = [
  'Dîmes ordinaires',
  'Offrandes de culte',
  'Offrande de mission',
  'Don spécial bâtiment & travaux',
  'Collecte de bienfaisance',
];

const DEFAULT_EXPENSES = [
  'Cotisation dénominationnelle / réseau',
  'Loyer lieu de culte',
  'Salaire & Gratifications',
  'Électricité & Eau',
  'Entretien & Sonorisation',
  'Carburant & Transport',
  'Aide aux démunis / Social',
];

const OnboardingBody = z.object({
  churchName: z.string().min(3, 'Le nom de l’église est requis'),
  denomination: z.string().optional(),
  mainBranchName: z.string().optional().default('Église Mère - Siège'),
  mainBranchCity: z.string().optional(),
  // Whether the branch created here is the church's own central/head site
  // (isMain=true, the common case for a standalone parish signing up) or
  // an annexe of a network that already exists elsewhere in Goshen.
  isMainBranch: z.boolean().optional().default(true),
  initialBalance: z.number().int().nonnegative().optional().default(0),
  annexes: z
    .array(
      z.object({
        name: z.string().min(2),
        city: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    const parsed = OnboardingBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      churchName,
      denomination,
      mainBranchName,
      mainBranchCity,
      isMainBranch,
      initialBalance,
      annexes,
    } = parsed.data;

    const baseSlug = slugify(churchName);
    let finalSlug = baseSlug;
    let count = 1;
    while (await prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    const organization = await prisma.$transaction(
      async (tx) => {
        // 1. Create Organization
        const org = await tx.organization.create({
          data: {
            name: churchName,
            slug: finalSlug,
            denomination: denomination ?? null,
            ownerId: auth.user.sub,
            currency: 'XAF',
            plan: 'FREE',
          },
        });

        // 2. Create Pastor Membership
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: auth.user.sub,
            role: 'PASTOR',
          },
        });

        // 3. Create Main Branch
        const mainBranch = await tx.branch.create({
          data: {
            organizationId: org.id,
            name: mainBranchName,
            city: mainBranchCity ?? null,
            isMain: isMainBranch,
            currentBalance: initialBalance,
            lowBalanceThreshold: 25000,
          },
        });

        // 4. Create Annexes
        for (const annexe of annexes) {
          if (annexe.name.trim()) {
            await tx.branch.create({
              data: {
                organizationId: org.id,
                name: annexe.name.trim(),
                city: annexe.city?.trim() || mainBranchCity || null,
                isMain: false,
                currentBalance: 0,
                lowBalanceThreshold: 15000,
              },
            });
          }
        }

        // 5. Create Default Categories
        const categoriesData = [
          ...DEFAULT_INCOMES.map((name) => ({
            organizationId: org.id,
            name,
            type: 'INCOME',
            isDefault: true,
          })),
          ...DEFAULT_EXPENSES.map((name) => ({
            organizationId: org.id,
            name,
            type: 'EXPENSE',
            isDefault: true,
          })),
        ];

        await tx.churchCategory.createMany({
          data: categoriesData,
        });

        // If initial balance > 0, record initial transaction
        if (initialBalance > 0) {
          const initialCategory = await tx.churchCategory.findFirst({
            where: { organizationId: org.id, type: 'INCOME' },
          });

          if (initialCategory) {
            await tx.financialTransaction.create({
              data: {
                organizationId: org.id,
                branchId: mainBranch.id,
                type: 'INCOME',
                amount: initialBalance,
                categoryId: initialCategory.id,
                notes: 'Solde initial lors de la création sur Goshen',
                authorId: auth.user.sub,
              },
            });
          }
        }

        return org;
      },
      { timeout: 15000 },
    );
    // ^ Org + membership + branch + annexes + default categories run as
    // several sequential round-trips inside one transaction. Prisma's
    // default 5s interactive-transaction timeout is tuned for a co-located
    // database; over a real network hop to a remote Postgres (Neon, or any
    // hosted provider) that easily gets tight even without heavy load, and
    // trips "Transaction already closed" once it expires mid-run.

    return NextResponse.json({ success: true, organization }, { status: 201 });
  });
}
