// PATCH /api/church/branches/[id] — adjust an existing branch's low-balance
// alert threshold. Branch creation (POST ../route.ts) is Pastor-only; this
// is deliberately broader (Pastor + Treasurer) since the Treasurer is the
// one watching cash flow day-to-day and is the natural owner of "when
// should this annexe's alert fire".
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { canAccessBranch } from '@/lib/server/church/branch-access';

const PatchBranchBody = z.object({
  lowBalanceThreshold: z.number().int().nonnegative(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND' }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    if (!access.isPastor && !access.isTreasurer) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seul le pasteur ou le trésorier peut ajuster le seuil d’alerte.',
        },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;
    if (!canAccessBranch(access, id)) {
      return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PatchBranchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { id, organizationId: access.church.id },
    });
    if (!branch) {
      return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { lowBalanceThreshold: parsed.data.lowBalanceThreshold },
    });

    return NextResponse.json({ branch: updated });
  });
}
