// PATCH/DELETE /api/admin/organizations/[id]/members/[memberId] — superadmin
// role-change or removal of a church member. Structural mirror of
// admin/users/[id]/status/route.ts's transaction + audit pattern.
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

const PatchBody = z.object({
  role: z.enum(['PASTOR', 'TREASURER', 'SECRETARY', 'AUDITOR']),
});

async function loadMember(organizationId: string, memberId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: true, userId: true, organization: { select: { ownerId: true } } },
  });
  return member;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id: organizationId, memberId } = await ctx.params;
    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const member = await loadMember(organizationId, memberId);
    if (!member) {
      return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
    }

    if (member.role === parsed.data.role) {
      return NextResponse.json({ member: { id: member.id, role: member.role } });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.organizationMember.update({
        where: { id: memberId },
        data: { role: parsed.data.role },
        select: { id: true, role: true },
      });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'organization.member.role_change',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: { organizationId, from: member.role, to: parsed.data.role },
      });
      return result;
    });

    return NextResponse.json({ member: updated });
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; memberId: string }> },
): Promise<NextResponse> {
  const reqCtx = makeRequestContext(req.headers);
  return withRequestContext(reqCtx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id: organizationId, memberId } = await ctx.params;
    const member = await loadMember(organizationId, memberId);
    if (!member) {
      return NextResponse.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
    }

    // The owner's membership self-heals on next resolveChurchUser() call
    // (owner fallback branch) — removing it here would just recreate a
    // confusing loop instead of actually revoking access. Ownership
    // transfer is out of scope for this route.
    if (member.userId === member.organization.ownerId) {
      return NextResponse.json(
        {
          error: 'CANNOT_REMOVE_OWNER',
          message: 'Impossible de retirer le propriétaire de l’église.',
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.delete({ where: { id: memberId } });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'organization.member.remove',
        targetType: 'OrganizationMember',
        targetId: memberId,
        metadata: { organizationId, previousRole: member.role },
      });
    });

    return NextResponse.json({ success: true });
  });
}
