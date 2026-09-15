export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
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
  'Cotisation Caisse Nationale ADD',
  'Loyer lieu de culte',
  'Salaire & Gratifications',
  'Électricité & Eau',
  'Entretien & Sonorisation',
  'Carburant & Transport',
  'Aide aux démunis / Social',
];

const OnboardingBody = z.object({
  churchName: z.string().min(3, 'Le nom de l’église est requis'),
  denomination: z.string().optional().default('Assemblées de Dieu du Gabon'),
  mainBranchName: z.string().optional().default('Église Mère - Siège'),
  mainBranchCity: z.string().optional().default('Libreville'),
  initialBalance: z.number().int().nonnegative().optional().default(0),
  annexes: z
    .array(
      z.object({
        name: z.string().min(2),
        city: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    const parsed = OnboardingBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', details: parsed.error.issues }, { status: 400 });
    }

    const { churchName, denomination, mainBranchName, mainBranchCity, initialBalance, annexes } = parsed.data;

    const baseSlug = slugify(churchName);
    let finalSlug = baseSlug;
    let count = 1;
    while (await prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${count++}`;
    }

    const organization = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: churchName,
          slug: finalSlug,
          denomination,
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
          city: mainBranchCity,
          isMain: true,
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
              city: annexe.city?.trim() || mainBranchCity,
              isMain: false,
              currentBalance: 0,
              lowBalanceThreshold: 15000,
            },
          });
        }
      }

      // 5. Create Default Categories
      const categoriesData = [
        ...DEFAULT_INCOMES.map((name) => ({ organizationId: org.id, name, type: 'INCOME', isDefault: true })),
        ...DEFAULT_EXPENSES.map((name) => ({ organizationId: org.id, name, type: 'EXPENSE', isDefault: true })),
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
    });

    return NextResponse.json({ success: true, organization }, { status: 201 });
  });
}
