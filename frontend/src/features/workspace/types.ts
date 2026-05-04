export type AccountType = "personal" | "business";

/** Stored at signup (`profiles.auth_signup_account_type`); drives shell routing. */
export type SignupAccountType = "personal" | "business" | "platform_admin";
export type LicenseTier = "free" | "pro" | "enterprise";
export type LicenseStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

export const WORKSPACE_VIEWS = [
  "dashboard",
  "files",
  "quotes",
  "projects",
  "dispatch",
  "assets",
  "marketplace",
  "professionals",
  "team",
  "jobs",
  "profile",
  "schedule",
  "invoices",
  "billing",
  "contacts",
  "timeTracking",
  "admin_overview",
  "admin_licenses",
  "admin_activity",
  "admin_users",
  "admin_workspaces",
  "admin_audit",
] as const;

export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

const WORKSPACE_VIEW_SET: ReadonlySet<string> = new Set(WORKSPACE_VIEWS);

export function isWorkspaceView(value: unknown): value is WorkspaceView {
  return typeof value === "string" && WORKSPACE_VIEW_SET.has(value);
}

export interface UiUser {
  workspaceId: string;
  name: string;
  email: string;
  company: string;
  accountType: AccountType;
  signupAccountType: SignupAccountType | null;
  licenseTier: LicenseTier;
  licenseStatus: LicenseStatus;
  isPlatformAdmin: boolean;
}

export interface WorkspaceNavItem {
  view: WorkspaceView;
  label: string;
  icon: string;
}

export interface WorkspaceNavGroup {
  label?: string;
  items: WorkspaceNavItem[];
}
