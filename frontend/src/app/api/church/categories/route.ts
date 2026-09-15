export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

const CreateCategoryBody = z.object({
  name: z.string().min(2, 'Nom requis'),
  type: z.enum(['INCOME', 'EXPENSE']),
});

interface DefaultCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

declare global {
  var __goshenCategories: DefaultCategory[] | undefined;
}

const INITIAL_CATEGORIES: DefaultCategory[] = [
  { id: 'cat_dimes', name: 'Dîmes régulières', type: 'INCOME' },
  { id: 'cat_offrandes', name: 'Offrandes dominicales', type: 'INCOME' },
  { id: 'cat_dons_travaux', name: 'Dons pour travaux & construction', type: 'INCOME' },
  { id: 'cat_actions_grace', name: 'Culte d’actions de grâce', type: 'INCOME' },
  { id: 'cat_missions', name: 'Offrandes de missions & évangélisation', type: 'INCOME' },
  { id: 'cat_aumone', name: 'Aumône & entraide sociale', type: 'INCOME' },
  { id: 'cat_fournitures', name: 'Frais de culte & fournitures', type: 'EXPENSE' },
  { id: 'cat_seeg', name: 'Factures SEEG & électricité', type: 'EXPENSE' },
  { id: 'cat_loyer', name: 'Loyer & entretien du bâtiment', type: 'EXPENSE' },
  { id: 'cat_pastoral', name: 'Soutien pastoral & ministères', type: 'EXPENSE' },
  { id: 'cat_evenements', name: 'Conférences & événements spéciaux', type: 'EXPENSE' },
];

if (!global.__goshenCategories) {
  global.__goshenCategories = [...INITIAL_CATEGORIES];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    try {
      const auth = await requireAuth(req.headers.get('authorization'));
      if (!(auth instanceof NextResponse)) {
        const access = await resolveChurchUser(auth.user.sub);
        if (access) {
          const dbCategories = await prisma.churchCategory.findMany({
            where: { organizationId: access.church.id },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
          });
          if (dbCategories.length > 0) {
            return NextResponse.json({ categories: dbCategories });
          }
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({ categories: global.__goshenCategories ?? INITIAL_CATEGORIES });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const body = await req.json().catch(() => null);
    const parsed = CreateCategoryBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', details: parsed.error.issues }, { status: 400 });
    }

    const newCategory: DefaultCategory = {
      id: `cat_${Date.now()}`,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
    };

    try {
      const auth = await requireAuth(req.headers.get('authorization'));
      if (!(auth instanceof NextResponse)) {
        const access = await resolveChurchUser(auth.user.sub);
        if (access) {
          const created = await prisma.churchCategory.create({
            data: {
              organizationId: access.church.id,
              name: parsed.data.name,
              type: parsed.data.type,
            },
          });
          return NextResponse.json({ category: created }, { status: 201 });
        }
      }
    } catch {
      // Fallback in-memory
    }

    if (!global.__goshenCategories) {
      global.__goshenCategories = [...INITIAL_CATEGORIES];
    }
    global.__goshenCategories.push(newCategory);

    return NextResponse.json({ category: newCategory }, { status: 201 });
  });
}
