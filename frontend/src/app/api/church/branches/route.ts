export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';
import { allowedBranchIds } from '@/lib/server/church/branch-access';

const CreateBranchBody = z.object({
  name: z.string().min(2, 'Le nom de l’annexe doit contenir au moins 2 caractères'),
  city: z.string().optional(),
  isMain: z.boolean().optional().default(false),
  lowBalanceThreshold: z.number().int().nonnegative().optional().default(25000),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (auth instanceof NextResponse) return auth;

    const access = await resolveChurchUser(auth.user.sub);
    if (!access) {
      return NextResponse.json({ error: 'CHURCH_NOT_FOUND', branches: [] }, { status: 404 });
    }
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    const allowed = allowedBranchIds(access);
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: access.church.id,
        status: 'ACTIVE',
        ...(allowed ? { id: { in: allowed } } : {}),
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      church: {
        ...access.church,
        role: access.member.role,
        isPastor: access.isPastor,
        isTreasurer: access.isTreasurer,
        isSecretary: access.isSecretary,
        isAuditor: access.isAuditor,
      },
      branches,
    });
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
    if (access.church.status === 'SUSPENDED') return orgSuspendedResponse();

    if (!access.isPastor) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Seul le pasteur peut ajouter une annexe.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateBranchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, city, isMain, lowBalanceThreshold } = parsed.data;

    const branch = await prisma.branch.create({
      data: {
        organizationId: access.church.id,
        name,
        city: city || null,
        isMain: !!isMain,
        lowBalanceThreshold,
        currentBalance: 0,
      },
    });

    return NextResponse.json({ branch }, { status: 201 });
  });
}
