import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type JobEventRow = Tables<"job_events">;
export type JobEventInsert = TablesInsert<"job_events">;
export type JobEventUpdate = TablesUpdate<"job_events">;

export async function listJobEvents(
  workspaceId: string,
): Promise<JobEventRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("job_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("event_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getJobEvent(
  id: string,
): Promise<JobEventRow | null> {
  const { data, error } = await supabase
    .from("job_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createJobEvent(
  workspaceId: string,
  input: Omit<JobEventInsert, "workspace_id" | "created_by">,
): Promise<JobEventRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create an event.");

  const { data, error } = await supabase
    .from("job_events")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateJobEvent(
  id: string,
  patch: JobEventUpdate,
): Promise<JobEventRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to update an event.");

  const { data, error } = await supabase
    .from("job_events")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJobEvent(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to delete an event.");

  const { error } = await supabase
    .from("job_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
