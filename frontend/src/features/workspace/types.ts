export type AccountType = "personal" | "business";

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
  | "contacts";

export interface UiUser {
  workspaceId: string;
  name: string;
  email: string;
  company: string;
  accountType: AccountType;
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
