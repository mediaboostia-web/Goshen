export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const userId = auth.user.sub;

    // This injects fabricated income/expense rows into the caller's real
    // church ledger (convertible to real data via the "Injecter en base
    // réelle" dashboard action) — only the Pastor should be able to trigger
    // that, same as every other church-domain write (categories, branches,
    // members). A pre-existing org is checked here; a first-time call for a
    // brand-new user (no org yet) is allowed through, same as onboarding.
    const existingAccess = await resolveChurchUser(userId);
    if (existingAccess && !existingAccess.isPastor) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seul le pasteur peut injecter des données de démonstration.',
        },
        { status: 403 },
      );
    }

    // Check existing or create church for this user
    let org = await prisma.organization.findFirst({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        branches: true,
        categories: true,
      },
    });

    if (!org) {
      // Create new church
      org = await prisma.organization.create({
        data: {
          name: 'Communauté Évangélique de la Grâce',
          slug: `eglise-grace-${Date.now().toString(36)}`,
          denomination: 'Alliance Chrétienne & Missionnaire',
          currency: 'FCFA',
          plan: 'PREMIUM',
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'PASTOR',
            },
          },
        },
        include: {
          branches: true,
          categories: true,
        },
      });
    }

    // Ensure 3 branches
    let branchCentrale = org.branches.find((b) => b.isMain);
    if (!branchCentrale) {
      branchCentrale = await prisma.branch.create({
        data: {
          organizationId: org.id,
          name: 'Paroisse Centrale (Mont-Bouët)',
          city: 'Libreville',
          isMain: true,
          currentBalance: 3450000,
          lowBalanceThreshold: 600000,
        },
      });
    } else {
      branchCentrale = await prisma.branch.update({
        where: { id: branchCentrale.id },
        data: {
          currentBalance: 3450000,
          lowBalanceThreshold: 600000,
        },
      });
    }

    let branchAkanda = org.branches.find((b) => b.name.includes('Akanda'));
    if (!branchAkanda) {
      branchAkanda = await prisma.branch.create({
        data: {
          organizationId: org.id,
          name: 'Annexe Akanda (Cap Estérias)',
          city: 'Akanda',
          isMain: false,
          currentBalance: 980000,
          lowBalanceThreshold: 250000,
        },
      });
    }

    let branchOwendo = org.branches.find((b) => b.name.includes('Owendo'));
    if (!branchOwendo) {
      branchOwendo = await prisma.branch.create({
        data: {
          organizationId: org.id,
          name: 'Annexe Owendo (Alénakiri)',
          city: 'Owendo',
          isMain: false,
          currentBalance: 520000,
          lowBalanceThreshold: 150000,
        },
      });
    }

    // Ensure Categories
    const defaultCategories = [
      { name: 'Dîmes des fidèles', type: 'INCOME' as const, isDefault: true },
      { name: 'Offrandes ordinaires de culte', type: 'INCOME' as const, isDefault: true },
      { name: 'Dons Projet Construction Temple', type: 'INCOME' as const, isDefault: true },
      { name: 'Aumônes & Actions Sociales', type: 'INCOME' as const, isDefault: true },
      { name: 'Loyer des lieux de culte', type: 'EXPENSE' as const, isDefault: true },
      { name: 'Facture SEEG (Électricité & Eau)', type: 'EXPENSE' as const, isDefault: true },
      { name: 'Entretien Sonorisation & Instruments', type: 'EXPENSE' as const, isDefault: true },
      { name: 'Carburant & Évangélisation extérieure', type: 'EXPENSE' as const, isDefault: true },
      { name: 'Soutien Diaconie & Secours Veuves', type: 'EXPENSE' as const, isDefault: true },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of defaultCategories) {
      const existing = await prisma.churchCategory.findFirst({
        where: { organizationId: org.id, name: cat.name },
      });
      if (existing) {
        categoryMap[cat.name] = existing.id;
      } else {
        const created = await prisma.churchCategory.create({
          data: {
            organizationId: org.id,
            name: cat.name,
            type: cat.type,
            isDefault: cat.isDefault,
          },
        });
        categoryMap[cat.name] = created.id;
      }
    }

    // Insert sample Transactions if not already present
    const txCount = await prisma.financialTransaction.count({
      where: { organizationId: org.id },
    });

    if (txCount < 5) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 3600 * 1000);

      const demoTransactions = [
        {
          branchId: branchCentrale.id,
          categoryId: categoryMap['Dîmes des fidèles'],
          type: 'INCOME' as const,
          amount: 850000,
          date: yesterday,
          paymentMethod: 'AIRTEL_MONEY',
          receiptNumber: 'CULTE-2026-09-A',
          beneficiary: 'Culte de louange & Sainte Cène',
          notes: 'Règlement global dîmes par Airtel Money et espèces post-culte',
          receiptUrl:
            'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
        },
        {
          branchId: branchAkanda.id,
          categoryId: categoryMap['Offrandes ordinaires de culte'],
          type: 'INCOME' as const,
          amount: 325000,
          date: yesterday,
          paymentMethod: 'CASH',
          receiptNumber: 'CULTE-2026-09-B',
          beneficiary: 'Culte dominical matin',
          notes: 'Tronc du temple et paniers d’offrandes',
        },
        {
          branchId: branchCentrale.id,
          categoryId: categoryMap['Facture SEEG (Électricité & Eau)'],
          type: 'EXPENSE' as const,
          amount: 95000,
          date: threeDaysAgo,
          paymentMethod: 'MOOV_MONEY',
          receiptNumber: 'REC-SEEG-9842',
          beneficiary: 'SEEG Agence Mont-Bouët',
          notes: 'Règlement compteur édifice principal réf #984210',
          receiptUrl:
            'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=80',
        },
        {
          branchId: branchCentrale.id,
          categoryId: categoryMap['Dons Projet Construction Temple'],
          type: 'INCOME' as const,
          amount: 500000,
          date: threeDaysAgo,
          paymentMethod: 'BANK_TRANSFER',
          receiptNumber: 'DON-CONST-004',
          beneficiary: 'Famille Mba Ndong',
          notes: 'Engagement souscription 100 sacs de ciment extension galerie',
        },
        {
          branchId: branchOwendo.id,
          categoryId: categoryMap['Entretien Sonorisation & Instruments'],
          type: 'EXPENSE' as const,
          amount: 75000,
          date: fiveDaysAgo,
          paymentMethod: 'CASH',
          receiptNumber: 'REC-SONO-12',
          beneficiary: 'Atelier Audio Libreville',
          notes: 'Réparation 2 micros sans fil Shure et câblage table de mixage',
          receiptUrl:
            'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
        },
      ];

      for (const t of demoTransactions) {
        if (t.categoryId) {
          // FinancialTransaction has no paymentMethod/receiptNumber columns
          // (schema.prisma) — fold that context into `notes` instead of
          // passing unknown fields to Prisma (which would throw).
          const notesWithPaymentInfo = `${t.notes} — Réf. ${t.receiptNumber} (${t.paymentMethod.replace('_', ' ')})`;
          await prisma.financialTransaction.create({
            data: {
              organizationId: org.id,
              branchId: t.branchId,
              categoryId: t.categoryId,
              authorId: userId,
              type: t.type,
              amount: t.amount,
              date: t.date,
              beneficiary: t.beneficiary,
              notes: notesWithPaymentInfo,
              receiptUrl: t.receiptUrl || null,
            },
          });
        }
      }
    }

    // Ensure sample recurring expenses
    const recCount = await prisma.recurringExpense.count({
      where: { organizationId: org.id },
    });

    const defaultExpenseCatId =
      categoryMap['Loyer des lieux de culte'] || Object.values(categoryMap)[0] || '';
    const defaultSeegCatId = categoryMap['Facture SEEG (Électricité & Eau)'] || defaultExpenseCatId;

    if (recCount < 2 && defaultExpenseCatId) {
      await prisma.recurringExpense.create({
        data: {
          organizationId: org.id,
          branchId: branchCentrale.id,
          categoryId: defaultExpenseCatId,
          name: 'Loyer Paroisse Centrale (Bail commercial)',
          amount: 450000,
          frequency: 'MONTHLY',
          dueDay: 20,
          status: 'ACTIVE',
          executions: {
            create: {
              dueDate: new Date('2026-09-20'),
              amount: 450000,
              status: 'PENDING',
            },
          },
        },
      });

      await prisma.recurringExpense.create({
        data: {
          organizationId: org.id,
          branchId: branchCentrale.id,
          categoryId: defaultSeegCatId,
          name: 'Facture SEEG Électricité Éclairage Sanctuaire',
          amount: 95000,
          frequency: 'MONTHLY',
          dueDay: 22,
          status: 'ACTIVE',
          executions: {
            create: {
              dueDate: new Date('2026-09-22'),
              amount: 95000,
              status: 'PENDING',
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Données de démonstration Goshen injectées avec succès !',
      churchId: org.id,
    });
  } catch (err) {
    console.error('Failed to seed demo church data:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erreur lors de l’injection des données de démo.' },
      { status: 500 },
    );
  }
}
