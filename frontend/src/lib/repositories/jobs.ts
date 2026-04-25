import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type JobRow = Tables<"jobs">;
export type JobInsert = TablesInsert<"jobs">;
export type JobUpdate = TablesUpdate<"jobs">;

export interface JobWithProject extends JobRow {
  project_name: string | null;
}

export async function listJobs(
  workspaceId: string,
): Promise<JobWithProject[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("jobs")
    .select("*, projects(name)")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const proj = row.projects as { name: string } | null;
    return {
      ...row,
      projects: row.projects,
      project_name: proj?.name ?? null,
    } as JobWithProject;
  });
}

export async function getJob(id: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createJob(
  workspaceId: string,
  input: Omit<JobInsert, "workspace_id" | "created_by">,
): Promise<JobRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create a job.");

  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateJob(
  id: string,
  patch: JobUpdate,
): Promise<JobRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to update a job.");

  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveJob(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to archive a job.");

  const { error } = await supabase
    .from("jobs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
