import type { WorkspaceNavGroup } from "../workspace/types.ts";

export const platformAdminNavGroup: WorkspaceNavGroup = {
  label: "System administration",
  items: [
    { view: "admin_overview", label: "Overview", icon: "shield" },
    { view: "admin_licenses", label: "Licenses & workspaces", icon: "admin-grid" },
    { view: "admin_activity", label: "License activity log", icon: "activity" },
  ],
};
