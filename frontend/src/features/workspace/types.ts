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

export type WorkspaceView =
  | "dashboard"
  | "files"
  | "quotes"
  | "projects"
  | "dispatch"
  | "assets"
  | "marketplace"
  | "professionals"
  | "team"
  | "jobs"
  | "profile"
  | "schedule"
  | "invoices"
  | "billing"
  | "contacts"
  | "timeTracking"
  | "admin_overview"
  | "admin_licenses"
  | "admin_activity";

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
