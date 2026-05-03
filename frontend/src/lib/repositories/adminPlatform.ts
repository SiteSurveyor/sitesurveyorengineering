import { supabase } from "../supabase/client.ts";
import type { LicenseEvent, WorkspaceLicense } from "./workspaceLicenses.ts";

const adminDb = supabase as any;

export interface WorkspaceRowWithLicense {
  id: string;
  name: string;
  type: "personal" | "business";
  slug: string | null;
  owner_user_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  workspace_licenses: WorkspaceLicense | WorkspaceLicense[] | null;
}

export function pickWorkspaceLicense(
  row: WorkspaceRowWithLicense,
): WorkspaceLicense | null {
  const wl = row.workspace_licenses;
  if (!wl) return null;
  return Array.isArray(wl) ? (wl[0] ?? null) : wl;
}

export async function listWorkspacesWithLicenses(): Promise<
  WorkspaceRowWithLicense[]
> {
  const { data, error } = await adminDb
    .from("workspaces")
    .select(
      "id, name, type, slug, owner_user_id, archived_at, created_at, updated_at, workspace_licenses(*)",
    )
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as WorkspaceRowWithLicense[] | null) ?? [];
}

export interface LicenseEventWithWorkspace extends LicenseEvent {
  workspaces:
    | { name: string; type: string }
    | { name: string; type: string }[]
    | null;
}

export function workspaceFromEvent(
  row: LicenseEventWithWorkspace,
): { name: string; type: string } | null {
  const w = row.workspaces;
  if (!w) return null;
  return Array.isArray(w) ? (w[0] ?? null) : w;
}

export async function listGlobalLicenseEvents(opts: {
  limit: number;
  offset?: number;
}): Promise<LicenseEventWithWorkspace[]> {
  const { limit, offset = 0 } = opts;
  const { data, error } = await adminDb
    .from("license_events")
    .select("*, workspaces(name, type)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data as LicenseEventWithWorkspace[] | null) ?? [];
}

export async function countProfiles(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function listProfilesSummary(
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", unique);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const label =
      (row.full_name && row.full_name.trim()) ||
      row.email ||
      `${String(row.id).slice(0, 8)}…`;
    map.set(row.id, label);
  }
  return map;
}
