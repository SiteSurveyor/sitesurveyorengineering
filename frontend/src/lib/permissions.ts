import type { WorkspaceMemberRow } from "./repositories/workspaces.ts";
import type { LicenseStatus, LicenseTier } from "../features/workspace/types.ts";

type WorkspaceRole = WorkspaceMemberRow["role"];

const roleRank: Record<WorkspaceRole, number> = {
  owner: 100,
  admin: 90,
  ops_manager: 70,
  finance: 60,
  sales: 60,
  technician: 40,
  viewer: 10,
};

export function hasMinimumRole(
  role: WorkspaceRole | null | undefined,
  minimumRole: WorkspaceRole,
): boolean {
  if (!role) return false;
  return roleRank[role] >= roleRank[minimumRole];
}

export function canManageTeam(role: WorkspaceRole | null | undefined, workspaceType: "personal" | "business" | null | undefined): boolean {
  if (workspaceType !== "business") return false;
  return hasMinimumRole(role, "admin");
}

export function canManageProjects(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return ["owner", "admin", "ops_manager", "sales"].includes(role);
}

export function canAccessFeatureByLicense(
  tier: LicenseTier | null | undefined,
  status: LicenseStatus | null | undefined,
  minimumTier: LicenseTier,
): boolean {
  const active = status === "active" || status === "trialing";
  if (!active) return false;

  const rank: Record<LicenseTier, number> = {
    free: 1,
    pro: 2,
    enterprise: 3,
  };
  const actual = rank[tier ?? "free"];
  return actual >= rank[minimumTier];
}
