import type { AppUserContext } from "../../lib/auth/app-user.ts";
import type {
  AccountType,
  LicenseStatus,
  LicenseTier,
  UiUser,
  WorkspaceView,
} from "./types.ts";

export const SHARED_VIEWS: WorkspaceView[] = [
  "dashboard",
  "files",
  "quotes",
  "projects",
  "assets",
  "marketplace",
  "professionals",
  "jobs",
  "profile",
  "schedule",
  "billing",
  "timeTracking",
];

export const PERSONAL_ONLY_VIEWS: WorkspaceView[] = ["invoices", "contacts"];

export const BUSINESS_ONLY_VIEWS: WorkspaceView[] = ["dispatch", "team"];

const FREE_BLOCKED_VIEWS: WorkspaceView[] = ["dispatch", "team", "timeTracking"];
const INACTIVE_LICENSE_ALLOWED_VIEWS: WorkspaceView[] = [
  "dashboard",
  "billing",
  "profile",
];

export function getAllowedViews(
  accountType: AccountType,
  licenseTier: LicenseTier = "free",
  licenseStatus: LicenseStatus = "active",
): Set<WorkspaceView> {
  const accountViews = new Set(
    accountType === "business"
      ? [...SHARED_VIEWS, ...BUSINESS_ONLY_VIEWS]
      : [...SHARED_VIEWS, ...PERSONAL_ONLY_VIEWS],
  );

  if (!["active", "trialing"].includes(licenseStatus)) {
    return new Set(
      INACTIVE_LICENSE_ALLOWED_VIEWS.filter((view) => accountViews.has(view)),
    );
  }

  if (licenseTier === "free") {
    FREE_BLOCKED_VIEWS.forEach((view) => accountViews.delete(view));
  }

  return accountViews;
}

export function getAccessibleView(
  accountType: AccountType,
  requestedView: WorkspaceView,
  licenseTier: LicenseTier = "free",
  licenseStatus: LicenseStatus = "active",
): WorkspaceView {
  return getAllowedViews(accountType, licenseTier, licenseStatus).has(
    requestedView,
  )
    ? requestedView
    : "dashboard";
}

export function getAccountTypeLabel(accountType: AccountType): string {
  return accountType === "business" ? "Business account" : "Personal account";
}

export function mapAppUserToUiUser(input: AppUserContext): UiUser | null {
  if (!input.session) return null;

  const metadata = input.session.user.user_metadata ?? {};
  const workspace =
    input.defaultWorkspace ?? input.workspaces[0]?.workspace ?? null;
  const email = input.profile?.email ?? input.session.user.email ?? "";

  const accountType: AccountType =
    workspace?.type === "business"
      ? "business"
      : metadata.account_type === "business"
        ? "business"
        : "personal";

  const workspaceId =
    workspace?.id ?? input.workspaces[0]?.workspaceId ?? "";

  if (!workspaceId) return null;

  return {
    workspaceId,
    name:
      input.profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      email.split("@")[0] ||
      "User",
    email,
    company:
      accountType === "business"
        ? workspace?.name ||
          metadata.workspace_name ||
          metadata.company ||
          "My Workspace"
        : "Independent Surveyor",
    accountType,
    licenseTier: input.workspaceLicense?.tier ?? "free",
    licenseStatus: input.workspaceLicense?.status ?? "active",
  };
}
