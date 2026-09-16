export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
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

// Read-only suggestions shown to a church that hasn't created any category
// yet. Never persisted from here and never returned as if they were a write
// result — a real category is only created via POST below.
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND', categories: [] }, { status: 404 });
    }

    const dbCategories = await prisma.churchCategory.findMany({
      where: { organizationId: access.church.id },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // A brand-new church has no categories yet — show read-only suggestions
    // instead of an empty list. These are never persisted from here.
    if (dbCategories.length === 0) {
      return NextResponse.json({ categories: INITIAL_CATEGORIES, suggested: true });
    }

    return NextResponse.json({ categories: dbCategories });
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
    // PRD F12/F15: category CRUD is reserved to the Pastor role.
    if (!access.isPastor) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Seul le pasteur peut gérer les catégories.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateCategoryBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const created = await prisma.churchCategory.create({
      data: {
        organizationId: access.church.id,
        name: parsed.data.name.trim(),
        type: parsed.data.type,
      },
    });

    return NextResponse.json({ category: created }, { status: 201 });
  });
}
