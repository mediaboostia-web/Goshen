import 'server-only';
import { prisma } from '@/lib/server/prisma';

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
  // Check membership first
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: true,
      branchAccess: { select: { branchId: true } },
    },
  });

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
