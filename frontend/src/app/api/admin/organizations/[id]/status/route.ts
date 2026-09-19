// PATCH /api/admin/organizations/[id]/status — suspend/restore a church.
// Structural mirror of admin/users/[id]/status/route.ts, but gated ADMIN in
// both directions (not SUPERADMIN-only restore): suspending an Organization
// never touches platform admin control the way suspending a User with
// role=SUPERADMIN could, so the asymmetry that route needs doesn't apply
// here. See lib/server/church/resolve-church.ts for the enforcement side
// (every resolveChurchUser()-gated route refuses SUSPENDED orgs with 403).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const Body = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().min(1).max(500).optional(),
});

type Discriminator =
  | { kind: 'NOT_FOUND' }
  | { kind: 'OK'; organization: { id: string; status: string } };

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }

    const result: Discriminator = await prisma.$transaction(
      async (tx) => {
        const target = await tx.organization.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (!target) return { kind: 'NOT_FOUND' as const };

        // Idempotent no-op: same status → return without writing AdminAction.
        if (target.status === parsed.data.status) {
          return { kind: 'OK' as const, organization: { id: target.id, status: target.status } };
        }

        const isRestore = target.status === 'SUSPENDED' && parsed.data.status === 'ACTIVE';

        const updated = await tx.organization.update({
          where: { id },
          data: { status: parsed.data.status },
          select: { id: true, status: true },
        });

        await logAdminAction(tx, {
          actorId: auth.admin.id,
          action: isRestore ? 'organization.restore' : 'organization.suspend',
          targetType: 'Organization',
          targetId: id,
          metadata: {
            from: target.status,
            to: parsed.data.status,
            ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
          },
        });

        return { kind: 'OK' as const, organization: updated };
      },
      { timeout: 15000 },
    );

    if (result.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'ORGANIZATION_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ organization: result.organization }, { status: 200 });
  });
}
