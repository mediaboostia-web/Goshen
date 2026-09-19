export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { resolveChurchUser, orgSuspendedResponse } from '@/lib/server/church/resolve-church';

const UpdateCategoryBody = z.object({
  name: z.string().min(2, 'Nom requis'),
});

// Duck-typed Prisma error code check — mirrors the P2002 pattern already
// used in lib/server/notifications/index.ts.
function isPrismaErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === code
  );
}

// A DELETE blocked by ChurchCategory's onDelete: Restrict does NOT always
// surface as Prisma's own P2003 (that code models an insert/update pointing
// at a missing row). A delete blocked by RESTRICT is a distinct Postgres
// condition (SQLSTATE 23001) that Prisma's query engine sometimes reports
// as an untyped PrismaClientUnknownRequestError instead — verified
// empirically against this schema: isPrismaErrorCode(err, 'P2003') never
// matched, and the real error was a plain object with `code: undefined`.
function isRestrictViolation(err: unknown): boolean {
  if (isPrismaErrorCode(err, 'P2003')) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('violates') && message.includes('foreign key constraint');
}

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
    // Mirrors POST /api/church/categories — same gate.
    if (!access.isPastor && !access.isTreasurer) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seuls le pasteur et le trésorier peuvent gérer les catégories.',
        },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = UpdateCategoryBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const category = await prisma.churchCategory.findFirst({
      where: { id, organizationId: access.church.id },
    });
    if (!category) {
      return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 });
    }

    const updated = await prisma.churchCategory.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
    });

    return NextResponse.json({ category: updated });
  });
}

export async function DELETE(
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
          message: 'Seuls le pasteur et le trésorier peuvent gérer les catégories.',
        },
        { status: 403 },
      );
    }

    const { id } = await ctx.params;
    const category = await prisma.churchCategory.findFirst({
      where: { id, organizationId: access.church.id },
    });
    if (!category) {
      return NextResponse.json({ error: 'CATEGORY_NOT_FOUND' }, { status: 404 });
    }

    try {
      await prisma.churchCategory.delete({ where: { id } });
    } catch (err) {
      // Foreign key RESTRICT violation: transactions/recurring expenses
      // still reference this category (FinancialTransaction.categoryId is
      // onDelete: Restrict by design — losing the audit trail on a real
      // financial record would be worse than refusing the delete).
      if (isRestrictViolation(err)) {
        return NextResponse.json(
          {
            error: 'CATEGORY_IN_USE',
            message:
              'Cette catégorie est utilisée par des écritures existantes et ne peut pas être supprimée.',
          },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  });
}
