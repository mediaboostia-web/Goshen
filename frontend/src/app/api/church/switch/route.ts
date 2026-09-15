export const runtime = 'nodejs';

import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { ACTIVE_ORG_COOKIE } from '@/lib/server/church/resolve-church';

const SwitchBody = z.object({
  organizationId: z.string().min(1),
});

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

// A one-year cookie: this only remembers a UI preference (which of the
// user's churches is "active"), not a session — a long lifetime just means
// the user doesn't have to re-pick it after every login.
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    const parsed = SwitchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    // 404, not 403: don't confirm whether the organizationId exists at all
    // to a user who isn't a member of it (mirrors requireOrgRole's
    // convention elsewhere in this codebase).
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: auth.user.sub, organizationId: parsed.data.organizationId },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }

    const store = await cookies();
    store.set(ACTIVE_ORG_COOKIE, membership.organizationId, {
      httpOnly: true,
      secure: isProd(),
      sameSite: 'lax',
      path: '/',
      maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    });

    return NextResponse.json({ ok: true, organizationId: membership.organizationId });
  });
}
