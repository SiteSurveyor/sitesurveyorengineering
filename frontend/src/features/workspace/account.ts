import type { AppUserContext } from "../../lib/auth/app-user.ts";
import type {
  AccountType,
  LicenseStatus,
  LicenseTier,
  SignupAccountType,
  UiUser,
  WorkspaceView,
} from "./types.ts";

function normalizeSignupAccountType(
  raw: string | null | undefined,
): SignupAccountType | null {
  if (raw == null || raw === "") return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "personal" || v === "business" || v === "platform_admin") return v;
  return null;
}

function resolveSignupAccountType(input: {
  profile: { auth_signup_account_type?: string | null } | null;
  metadata: Record<string, unknown>;
}): SignupAccountType | null {
  const fromProfile = normalizeSignupAccountType(
    input.profile?.auth_signup_account_type ?? undefined,
  );
  if (fromProfile) return fromProfile;
  const meta = input.metadata.account_type;
  return normalizeSignupAccountType(
    typeof meta === "string" ? meta : undefined,
  );
}

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

export const ADMIN_PLATFORM_VIEWS: WorkspaceView[] = [
  "admin_overview",
  "admin_licenses",
  "admin_activity",
];

const FREE_BLOCKED_VIEWS: WorkspaceView[] = ["dispatch", "team", "timeTracking"];
const INACTIVE_LICENSE_ALLOWED_VIEWS: WorkspaceView[] = [
  "dashboard",
  "billing",
  "profile",
];

function mergePlatformAdminViews(
  views: Set<WorkspaceView>,
  isPlatformAdmin: boolean,
): Set<WorkspaceView> {
  if (!isPlatformAdmin) return views;
  const next = new Set(views);
  ADMIN_PLATFORM_VIEWS.forEach((view) => next.add(view));
  return next;
}

export function getAllowedViews(
  accountType: AccountType,
  licenseTier: LicenseTier = "free",
  licenseStatus: LicenseStatus = "active",
  isPlatformAdmin = false,
): Set<WorkspaceView> {
  const accountViews = new Set(
    accountType === "business"
      ? [...SHARED_VIEWS, ...BUSINESS_ONLY_VIEWS]
      : [...SHARED_VIEWS, ...PERSONAL_ONLY_VIEWS],
  );

  if (!["active", "trialing"].includes(licenseStatus)) {
    const allowed = new Set(
      INACTIVE_LICENSE_ALLOWED_VIEWS.filter((view) => accountViews.has(view)),
    );
    return mergePlatformAdminViews(allowed, isPlatformAdmin);
  }

  if (licenseTier === "free") {
    FREE_BLOCKED_VIEWS.forEach((view) => accountViews.delete(view));
  }

  return mergePlatformAdminViews(accountViews, isPlatformAdmin);
}

export function getAccessibleView(
  accountType: AccountType,
  requestedView: WorkspaceView,
  licenseTier: LicenseTier = "free",
  licenseStatus: LicenseStatus = "active",
  isPlatformAdmin = false,
): WorkspaceView {
  return getAllowedViews(
    accountType,
    licenseTier,
    licenseStatus,
    isPlatformAdmin,
  ).has(requestedView)
    ? requestedView
    : "dashboard";
}

export function getAccountTypeLabel(accountType: AccountType): string {
  return accountType === "business" ? "Business account" : "Personal account";
}

/** Shell header label aligned with signup paths. */
export function getWorkspaceShellAccountLabel(user: UiUser): string {
  if (user.signupAccountType === "platform_admin") {
    return "Platform administration";
  }
  return getAccountTypeLabel(user.accountType);
}

/**
 * Profile-only platform operators may have `is_platform_admin` without
 * `default_workspace_id` or `workspace_members` (SQL grant). Workspace-scoped
 * queries use this id and typically return no rows; admin console pages do not
 * depend on `workspaceId`.
 */
export const PLATFORM_ADMIN_FALLBACK_WORKSPACE_ID =
  "00000000-0000-0000-0000-000000000000";

export function mapAppUserToUiUser(input: AppUserContext): UiUser | null {
  if (!input.session) return null;

  const metadata = (input.session.user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;
  const workspace =
    input.defaultWorkspace ?? input.workspaces[0]?.workspace ?? null;
  const email = input.profile?.email ?? input.session.user.email ?? "";

  const signupAccountType = resolveSignupAccountType({
    profile: input.profile,
    metadata,
  });

  const accountType: AccountType =
    workspace?.type === "business"
      ? "business"
      : metadata["account_type"] === "business"
        ? "business"
        : "personal";

  const workspaceId =
    workspace?.id ?? input.workspaces[0]?.workspaceId ?? "";

  if (!workspaceId) {
    if (!input.profile?.is_platform_admin) return null;

    return {
      workspaceId: PLATFORM_ADMIN_FALLBACK_WORKSPACE_ID,
      name:
        input.profile?.full_name ||
        (typeof metadata.full_name === "string" ? metadata.full_name : "") ||
        (typeof metadata.name === "string" ? metadata.name : "") ||
        email.split("@")[0] ||
        "User",
      email,
      company: "Platform operator",
      accountType,
      signupAccountType,
      licenseTier: input.workspaceLicense?.tier ?? "free",
      licenseStatus: input.workspaceLicense?.status ?? "active",
      isPlatformAdmin: true,
    };
  }

  return {
    workspaceId,
    name:
      input.profile?.full_name ||
      (typeof metadata.full_name === "string" ? metadata.full_name : "") ||
      (typeof metadata.name === "string" ? metadata.name : "") ||
      email.split("@")[0] ||
      "User",
    email,
    company:
      accountType === "business"
        ? workspace?.name ||
          (typeof metadata.workspace_name === "string"
            ? metadata.workspace_name
            : "") ||
          (typeof metadata.company === "string" ? metadata.company : "") ||
          "My Workspace"
        : "Independent Surveyor",
    accountType,
    signupAccountType,
    licenseTier: input.workspaceLicense?.tier ?? "free",
    licenseStatus: input.workspaceLicense?.status ?? "active",
    isPlatformAdmin: Boolean(input.profile?.is_platform_admin),
  };
}
