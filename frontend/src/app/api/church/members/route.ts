export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser } from '@/lib/server/church/resolve-church';

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
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access || !access.isPastor) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Seul le pasteur peut inviter des membres.' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = InviteMemberBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', details: parsed.error.issues }, { status: 400 });
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

    // Check if already member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: access.church.id,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'ALREADY_MEMBER', message: 'Cet utilisateur est déjà membre de l’église.' }, { status: 409 });
    }

    const newMembership = await prisma.$transaction(async (tx) => {
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
    });

    return NextResponse.json({ success: true, member: newMembership }, { status: 201 });
  });
}
