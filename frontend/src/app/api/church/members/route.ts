export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { memberAddedEmail } from '@/lib/server/church/member-added-email';
import { sendCriticalEmailNow } from '@/lib/server/notifications/send-critical-email-now';

const InviteMemberBody = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().optional(),
  role: z.enum(['PASTOR', 'TREASURER', 'SECRETARY', 'AUDITOR']),
  branchIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND', members: [] }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: access.church.id },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, status: true } },
        branchAccess: { include: { branch: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ members, isPastor: access.isPastor });
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
    if (!access || !access.isPastor) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Seul le pasteur peut inviter des membres.' },
        { status: 403 },
      );
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const body = await req.json().catch(() => null);
    const parsed = InviteMemberBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, name, role, branchIds } = parsed.data;

    // Check if user exists or find-or-create user
    let targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          email,
          name: name || null,
          role: 'USER',
        },
      });
    }

    // One email = one church. Check ANY existing membership (not just this
    // org) — a pastor must not be able to silently pull someone who already
    // belongs to (or owns) a different church into their own.
    const anyMembership = await prisma.organizationMember.findFirst({
      where: { userId: targetUser.id },
    });

    if (anyMembership) {
      if (anyMembership.organizationId === access.church.id) {
        return NextResponse.json(
          { error: 'ALREADY_MEMBER', message: 'Cet utilisateur est déjà membre de l’église.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: 'EMAIL_ALREADY_IN_USE',
          message:
            'Cette adresse email est déjà associée à une autre église sur Goshen. Utilisez une autre adresse email pour cette personne.',
        },
        { status: 409 },
      );
    }

    // branchIds come from the client — verify they all belong to the
    // caller's own organization before granting access, otherwise a pastor
    // could grant a new member access to another church's branch id.
    if (branchIds && branchIds.length > 0) {
      const ownedBranches = await prisma.branch.findMany({
        where: { id: { in: branchIds }, organizationId: access.church.id },
        select: { id: true },
      });
      if (ownedBranches.length !== branchIds.length) {
        return NextResponse.json({ error: 'BRANCH_NOT_FOUND' }, { status: 404 });
      }
    }

    const newMembership = await prisma.$transaction(
      async (tx) => {
        const member = await tx.organizationMember.create({
          data: {
            organizationId: access.church.id,
            userId: targetUser.id,
            role,
          },
        });

        if (branchIds && branchIds.length > 0) {
          await tx.memberBranchAccess.createMany({
            data: branchIds.map((branchId) => ({
              memberId: member.id,
              branchId,
            })),
          });
        }

        return member;
      },
      { timeout: 15000 },
    );

    // Best-effort, after the response is on the wire — the person must be
    // told a new church granted them access, but a mail hiccup must never
    // fail the membership that already committed above.
    after(() =>
      sendCriticalEmailNow({
        to: email,
        ...memberAddedEmail({
          churchName: access.church.name,
          role,
          loginUrl: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
        }),
      }),
    );

    return NextResponse.json({ success: true, member: newMembership }, { status: 201 });
  });
}
