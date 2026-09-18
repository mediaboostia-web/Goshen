import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/server/prisma';

const COOKIE_PREFIX = process.env.COOKIE_PREFIX || 'app';
// A user can legitimately belong to more than one Organization
// (OrganizationMember is unique per organizationId+userId, not per userId).
// This cookie remembers which one is "active" so resolveChurchUser doesn't
// have to pick arbitrarily — set by POST /api/church/switch after verifying
// membership. Absent/invalid cookie falls back to the original behavior.
export const ACTIVE_ORG_COOKIE = `${COOKIE_PREFIX}-active-org`;

export interface ChurchUserAccess {
  church: {
    id: string;
    slug: string;
    name: string;
    denomination: string | null;
    logoUrl: string | null;
    currency: string;
    plan: string;
    planExpiresAt: Date | null;
    ownerId: string;
    paymentMethods: string[];
    paymentDetails: string | null;
    email: string | null;
    phone: string | null;
  };
  member: {
    id: string;
    role: string;
    branchAccess: { branchId: string }[];
  };
  isPastor: boolean;
  isTreasurer: boolean;
  isAuditor: boolean;
  isSecretary: boolean;
}

export async function resolveChurchUser(userId: string): Promise<ChurchUserAccess | null> {
  const store = await cookies();
  const preferredOrgId = store.get(ACTIVE_ORG_COOKIE)?.value;

  const membershipInclude = {
    organization: true,
    branchAccess: { select: { branchId: true } },
  } as const;

  // Prefer the church the user explicitly switched to, if they're still a
  // member of it; otherwise fall through to the original "first found"
  // behavior (correct for the common single-church case, and a reasonable
  // default if the cookie is stale/invalid — e.g. removed from that org).
  let membership = preferredOrgId
    ? await prisma.organizationMember.findFirst({
        where: { userId, organizationId: preferredOrgId },
        include: membershipInclude,
      })
    : null;

  if (!membership) {
    // No orderBy here used to mean "whatever order Postgres happens to
    // return" — for a user belonging to more than one church (e.g. invited
    // as treasurer elsewhere before ever creating their own), that could
    // silently resolve to an older, unrelated membership instead of the one
    // they most recently joined/created. Most-recent-first is the more
    // sensible default when the cookie is absent/stale.
    membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: membershipInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  if (membership) {
    const role = membership.role.toUpperCase();
    const isOwner = membership.organization.ownerId === userId;
    const effectiveRole = isOwner && role !== 'PASTOR' ? 'PASTOR' : role;

    return {
      church: {
        id: membership.organization.id,
        slug: membership.organization.slug,
        name: membership.organization.name,
        denomination: membership.organization.denomination,
        logoUrl: membership.organization.logoUrl,
        currency: membership.organization.currency,
        plan: membership.organization.plan,
        planExpiresAt: membership.organization.planExpiresAt,
        ownerId: membership.organization.ownerId,
        paymentMethods: membership.organization.paymentMethods,
        paymentDetails: membership.organization.paymentDetails,
        email: membership.organization.email,
        phone: membership.organization.phone,
      },
      member: {
        id: membership.id,
        role: effectiveRole,
        branchAccess: membership.branchAccess,
      },
      isPastor: effectiveRole === 'PASTOR' || effectiveRole === 'OWNER' || isOwner,
      isTreasurer: effectiveRole === 'TREASURER' || effectiveRole === 'PASTOR' || isOwner,
      isAuditor: effectiveRole === 'AUDITOR',
      isSecretary: effectiveRole === 'SECRETARY',
    };
  }

  // Fallback: check if user is owner of any organization
  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
  });

  if (owned) {
    // Create owner membership row if it was somehow missing
    const newMember = await prisma.organizationMember.create({
      data: {
        organizationId: owned.id,
        userId,
        role: 'PASTOR',
      },
    });

    return {
      church: {
        id: owned.id,
        slug: owned.slug,
        name: owned.name,
        denomination: owned.denomination,
        logoUrl: owned.logoUrl,
        currency: owned.currency,
        plan: owned.plan,
        planExpiresAt: owned.planExpiresAt,
        ownerId: owned.ownerId,
        paymentMethods: owned.paymentMethods,
        paymentDetails: owned.paymentDetails,
        email: owned.email,
        phone: owned.phone,
      },
      member: {
        id: newMember.id,
        role: 'PASTOR',
        branchAccess: [],
      },
      isPastor: true,
      isTreasurer: true,
      isAuditor: false,
      isSecretary: false,
    };
  }

  return null;
}
