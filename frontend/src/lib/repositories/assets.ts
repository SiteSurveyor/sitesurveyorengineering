import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type AssetRow = Tables<"assets">;
export type AssetInsert = TablesInsert<"assets">;
export type AssetUpdate = TablesUpdate<"assets">;
export type CalibrationRow = Tables<"asset_calibrations">;
export type CalibrationInsert = TablesInsert<"asset_calibrations">;
export type CalibrationUpdate = TablesUpdate<"asset_calibrations">;
export type MaintenanceEventRow = Tables<"asset_maintenance_events">;
export type MaintenanceEventInsert = TablesInsert<"asset_maintenance_events">;
export type MaintenanceEventUpdate = TablesUpdate<"asset_maintenance_events">;

export async function listAssets(workspaceId: string): Promise<AssetRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getAsset(id: string): Promise<AssetRow | null> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAsset(
  workspaceId: string,
  input: Omit<AssetInsert, "workspace_id" | "created_by">,
): Promise<AssetRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create an asset.");

  const { data, error } = await supabase
    .from("assets")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsset(
  id: string,
  patch: AssetUpdate,
): Promise<AssetRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to update an asset.");

  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveAsset(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to archive an asset.");

  const { error } = await supabase
    .from("assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function listCalibrations(
  workspaceId: string,
  assetId?: string,
): Promise<CalibrationRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from("asset_calibrations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("calibration_date", { ascending: false });

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCalibration(
  workspaceId: string,
  input: Omit<CalibrationInsert, "workspace_id" | "created_by">,
): Promise<CalibrationRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to create a calibration record.");

  const { data, error } = await supabase
    .from("asset_calibrations")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMaintenanceEvents(
  workspaceId: string,
  assetId?: string,
): Promise<MaintenanceEventRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from("asset_maintenance_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("serviced_on", { ascending: false });

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createMaintenanceEvent(
  workspaceId: string,
  input: Omit<MaintenanceEventInsert, "workspace_id" | "created_by">,
): Promise<MaintenanceEventRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to create a maintenance event.");

  const { data, error } = await supabase
    .from("asset_maintenance_events")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
