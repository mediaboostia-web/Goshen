import { describe, it, expect } from 'vitest';
import { allowedBranchIds, canAccessBranch } from './branch-access';
import type { ChurchUserAccess } from './resolve-church';

function makeAccess(branchIds: string[]): ChurchUserAccess {
  return {
    church: {
      id: 'org-1',
      slug: 'org-1',
      name: 'Église Test',
      denomination: null,
      logoUrl: null,
      currency: 'FCFA',
      plan: 'FREE',
      planExpiresAt: null,
      ownerId: 'user-1',
      paymentMethods: [],
      paymentDetails: null,
      email: null,
      phone: null,
    },
    member: {
      id: 'mem-1',
      role: 'TREASURER',
      branchAccess: branchIds.map((branchId) => ({ branchId })),
    },
    isPastor: false,
    isTreasurer: true,
    isAuditor: false,
    isSecretary: false,
  };
}

describe('allowedBranchIds', () => {
  it('returns null (unrestricted) when branchAccess is empty', () => {
    expect(allowedBranchIds(makeAccess([]))).toBeNull();
  });

  it('returns the exact branch id list when branchAccess is non-empty', () => {
    expect(allowedBranchIds(makeAccess(['branch-a', 'branch-b']))).toEqual([
      'branch-a',
      'branch-b',
    ]);
  });
});

describe('canAccessBranch', () => {
  it('allows any branch when unrestricted', () => {
    const access = makeAccess([]);
    expect(canAccessBranch(access, 'branch-a')).toBe(true);
    expect(canAccessBranch(access, 'branch-z')).toBe(true);
  });

  it('allows only the granted branches when restricted', () => {
    const access = makeAccess(['branch-a']);
    expect(canAccessBranch(access, 'branch-a')).toBe(true);
    expect(canAccessBranch(access, 'branch-b')).toBe(false);
  });
});
