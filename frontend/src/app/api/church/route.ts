export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

const UpdateChurchBody = z.object({
  name: z.string().min(2, 'Le nom de l’église doit contenir au moins 2 caractères'),
  denomination: z.string().optional(),
  currency: z.enum(['FCFA', 'EUR', 'USD']),
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

    const { name, denomination, currency } = parsed.data;

    const church = await prisma.organization.update({
      where: { id: access.church.id },
      data: {
        name,
        denomination: denomination || null,
        currency,
      },
    });

    return NextResponse.json({ church });
  });
}
