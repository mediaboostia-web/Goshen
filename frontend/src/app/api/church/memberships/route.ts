export const runtime = 'nodejs';

import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, ACTIVE_ORG_COOKIE } from '@/lib/server/church/resolve-church';

// Lists every church the caller belongs to — almost always exactly one.
// Only meaningful for the (rare) case of a user with membership in more
// than one Organization; the frontend only renders a switcher when this
// returns more than one row.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const [memberships, access, store] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { userId: auth.user.sub },
        include: { organization: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      resolveChurchUser(auth.user.sub),
      cookies(),
    ]);

    const currentOrgId = access?.church.id ?? store.get(ACTIVE_ORG_COOKIE)?.value ?? null;

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        isCurrent: m.organization.id === currentOrgId,
      })),
    });
  });
}
