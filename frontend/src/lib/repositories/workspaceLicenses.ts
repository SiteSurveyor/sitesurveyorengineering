import { supabase } from "../supabase/client.ts";

// Re-export from the canonical source to avoid duplicate definitions
export type { LicenseTier, LicenseStatus } from "../../features/workspace/types.ts";
import type { LicenseTier, LicenseStatus } from "../../features/workspace/types.ts";

export interface WorkspaceLicense {
  workspace_id: string;
  tier: LicenseTier;
  status: LicenseStatus;
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  is_manual: boolean;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  seat_limit?: number | null;
  project_cap?: number | null;
  asset_cap?: number | null;
  storage_cap_bytes?: number | null;
}

export interface LicenseEvent {
  id: number;
  workspace_id: string;
  changed_by: string | null;
  previous_tier: LicenseTier | null;
  new_tier: LicenseTier | null;
  previous_status: LicenseStatus | null;
  new_status: LicenseStatus | null;
  notes: string | null;
  created_at: string;
}

export async function getWorkspaceLicense(
  workspaceId: string,
): Promise<WorkspaceLicense | null> {
  const { data, error } = await supabase
    .from("workspace_licenses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return (data as WorkspaceLicense | null) ?? null;
}

export async function updateWorkspaceLicense(
  workspaceId: string,
  patch: Partial<
    Pick<
      WorkspaceLicense,
      "tier" | "status" | "starts_at" | "ends_at" | "trial_ends_at" | "notes"
    >
  >,
): Promise<WorkspaceLicense> {
  const { data, error } = await supabase
    .from("workspace_licenses")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw error;
  return data as WorkspaceLicense;
}

export async function listLicenseEvents(
  workspaceId: string,
): Promise<LicenseEvent[]> {
  const { data, error } = await supabase
    .from("license_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data as LicenseEvent[] | null) ?? [];
}
