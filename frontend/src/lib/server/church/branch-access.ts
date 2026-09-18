// Per-branch member restriction (MemberBranchAccess) — collected at invite
// time (POST /api/church/members' optional `branchIds`) and shown in
// Settings, but until routes call this helper it was never actually
// enforced: any Treasurer/Secretary/Auditor could read or write every
// branch in the org regardless of which ones they were granted.
//
// Convention: an empty branchAccess list means "no restriction configured"
// (the common case — the org owner, or a member invited without
// `branchIds`) — full access to every branch in the org. A non-empty list
// means the member is scoped to exactly those branches.
import 'server-only';
import type { ChurchUserAccess } from './resolve-church';

/** `null` = unrestricted (every branch in the org). Otherwise the exact set of branch ids this member may touch. */
export function allowedBranchIds(access: ChurchUserAccess): string[] | null {
  const ids = access.member.branchAccess.map((b) => b.branchId);
  return ids.length > 0 ? ids : null;
}

export function canAccessBranch(access: ChurchUserAccess, branchId: string): boolean {
  const allowed = allowedBranchIds(access);
  return allowed === null || allowed.includes(branchId);
}
