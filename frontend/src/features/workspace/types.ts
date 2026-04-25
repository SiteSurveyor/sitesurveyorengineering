export type AccountType = "personal" | "business";
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
  | "timeTracking";

export interface UiUser {
  workspaceId: string;
  name: string;
  email: string;
  company: string;
  accountType: AccountType;
  licenseTier: LicenseTier;
  licenseStatus: LicenseStatus;
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
