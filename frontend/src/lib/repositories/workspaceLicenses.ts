import { supabase } from "../supabase/client.ts";

export type LicenseTier = "free" | "pro" | "enterprise";
export type LicenseStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

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
  const { data, error } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
    .from("license_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data as LicenseEvent[] | null) ?? [];
}
