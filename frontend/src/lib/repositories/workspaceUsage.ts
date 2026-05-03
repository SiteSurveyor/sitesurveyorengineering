import { supabase } from "../supabase/client.ts";

export function formatWorkspaceBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export interface WorkspaceUsageSnapshot {
  tier: string;
  status: string;
  seat_limit: number | null;
  seats_used: number;
  project_cap: number | null;
  projects_used: number;
  asset_cap: number | null;
  assets_used: number;
  storage_cap_bytes: number | null;
  storage_used_bytes: number;
}

export async function getWorkspaceUsage(
  workspaceId: string,
): Promise<WorkspaceUsageSnapshot | null> {
  const { data, error } = await supabase.rpc("get_workspace_usage", {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    tier: String(row.tier ?? ""),
    status: String(row.status ?? ""),
    seat_limit:
      row.seat_limit === null || row.seat_limit === undefined
        ? null
        : Number(row.seat_limit),
    seats_used: Number(row.seats_used ?? 0),
    project_cap:
      row.project_cap === null || row.project_cap === undefined
        ? null
        : Number(row.project_cap),
    projects_used: Number(row.projects_used ?? 0),
    asset_cap:
      row.asset_cap === null || row.asset_cap === undefined
        ? null
        : Number(row.asset_cap),
    assets_used: Number(row.assets_used ?? 0),
    storage_cap_bytes:
      row.storage_cap_bytes === null || row.storage_cap_bytes === undefined
        ? null
        : Number(row.storage_cap_bytes),
    storage_used_bytes: Number(row.storage_used_bytes ?? 0),
  };
}
