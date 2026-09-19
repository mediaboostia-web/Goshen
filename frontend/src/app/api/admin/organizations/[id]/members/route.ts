// POST /api/admin/organizations/[id]/members — superadmin adds a member to
// any church. Mirrors POST /api/church/members's find-or-create + "one
// email = one church" invariant, but callable by platform admins instead of
// the church's own pastor, and scoped by the [id] param instead of the
// caller's own resolveChurchUser() result.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { memberAddedEmail } from '@/lib/server/church/member-added-email';
import { sendCriticalEmailNow } from '@/lib/server/notifications/send-critical-email-now';

const AddMemberBody = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().optional(),
  role: z.enum(['PASTOR', 'TREASURER', 'SECRETARY', 'AUDITOR']),
});

export async function POST(
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

    const { id: organizationId } = await ctx.params;
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) {
      return NextResponse.json({ error: 'ORGANIZATION_NOT_FOUND' }, { status: 404 });
    }

    const parsed = AddMemberBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { email, name, role } = parsed.data;

    let targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: { email, name: name || null, role: 'USER' },
      });
    }

    const anyMembership = await prisma.organizationMember.findFirst({
      where: { userId: targetUser.id },
    });
    if (anyMembership) {
      if (anyMembership.organizationId === organizationId) {
        return NextResponse.json(
          { error: 'ALREADY_MEMBER', message: 'Cet utilisateur est déjà membre de cette église.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: 'EMAIL_ALREADY_IN_USE',
          message: 'Cette adresse email est déjà associée à une autre église.',
        },
        { status: 409 },
      );
    }

    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.organizationMember.create({
        data: { organizationId, userId: targetUser.id, role },
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true, status: true } },
        },
      });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'organization.member.add',
        targetType: 'OrganizationMember',
        targetId: created.id,
        metadata: { organizationId, email, role },
      });
      return created;
    });

    // Best-effort, after the response is on the wire — a mail hiccup must
    // never fail the membership that already committed above.
    after(() =>
      sendCriticalEmailNow({
        to: email,
        ...memberAddedEmail({
          churchName: org.name,
          role,
          loginUrl: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
        }),
      }),
    );

    return NextResponse.json({ member }, { status: 201 });
  });
}
