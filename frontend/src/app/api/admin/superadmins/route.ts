// POST /api/admin/superadmins — grant SUPERADMIN to an existing or brand-new
// user by email. SUPERADMIN-only: elevating to the top role must never be an
// ADMIN capability (unlike PATCH /api/admin/users/[id]/role, which any ADMIN
// can reach for USER/ADMIN moves but which the route itself doesn't
// specially protect for the SUPERADMIN target — this dedicated endpoint is
// the deliberately-narrower door for that specific elevation).
//
// Find-or-create mirrors organizations/[id]/members/route.ts's pattern. No
// last-SUPERADMIN guard needed — this route only ever adds.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, after, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf, generateVerificationCode } from '@/lib/server/auth';
import { requireSuperadmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { superadminGrantedEmail } from '@/lib/server/admin/superadmin-granted-email';
import { sendCriticalEmailNow } from '@/lib/server/notifications/send-critical-email-now';

const Body = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().optional(),
});

const VERIFICATION_TTL_MS = Number(process.env.AUTH_VERIFICATION_TTL_MIN ?? 15) * 60 * 1000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const email = parsed.data.email.toLowerCase();

    let target = await prisma.user.findUnique({ where: { email } });
    if (!target) {
      target = await prisma.user.create({
        data: { email, name: parsed.data.name || null, role: 'USER' },
      });
    }

    if (target.role === 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'ALREADY_SUPERADMIN', message: 'Ce compte est déjà SUPERADMIN.' },
        { status: 409 },
      );
    }

    // A brand-new (or existing OAuth-only) account has no passwordHash and
    // no way to authenticate at all yet. Issue a real PASSWORD_RESET
    // VerificationCode — the same mechanism /forgot-password uses — so the
    // email below carries a working path to /reset-password instead of a
    // login link the person can't actually use.
    const needsPasswordCode = !target.passwordHash;
    const setPasswordCode = needsPasswordCode ? generateVerificationCode() : null;
    const codeExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

    const previousRole = target.role;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: target.id },
        data: { role: 'SUPERADMIN' },
        select: { id: true, email: true, name: true, role: true, status: true },
      });
      if (setPasswordCode) {
        await tx.verificationCode.create({
          data: {
            userId: target.id,
            code: setPasswordCode,
            type: 'PASSWORD_RESET',
            expiresAt: codeExpiresAt,
          },
        });
      }
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'user.superadmin.grant',
        targetType: 'User',
        targetId: target.id,
        metadata: { email, previousRole, setPasswordCodeIssued: needsPasswordCode },
      });
      return result;
    });

    // Best-effort, after the response is on the wire — a mail hiccup must
    // never fail the elevation that already committed above.
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    after(() =>
      sendCriticalEmailNow({
        to: email,
        ...superadminGrantedEmail({
          loginUrl: `${appUrl}/admin/login`,
          ...(setPasswordCode
            ? {
                setPasswordCode,
                resetPasswordUrl: `${appUrl}/reset-password?email=${encodeURIComponent(email)}`,
              }
            : {}),
        }),
      }),
    );

    return NextResponse.json(
      { user: updated },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
