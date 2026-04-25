import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type JobAssignmentRow = Tables<"job_assignments">;
export type JobAssignmentInsert = TablesInsert<"job_assignments">;
export type JobAssignmentUpdate = TablesUpdate<"job_assignments">;
export type AssignmentMemberRow = Tables<"job_assignment_members">;
export type AssignmentMemberInsert = TablesInsert<"job_assignment_members">;
export type AssignmentAssetRow = Tables<"job_assignment_assets">;
export type AssignmentAssetInsert = TablesInsert<"job_assignment_assets">;

export interface AssignmentWithDetails extends JobAssignmentRow {
  project_name: string | null;
  job_title: string | null;
  member_ids: string[];
  asset_ids: string[];
}

export async function listJobAssignments(
  workspaceId: string,
): Promise<AssignmentWithDetails[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("job_assignments")
    .select("*, projects(name), jobs(title)")
    .eq("workspace_id", workspaceId)
    .order("assignment_date", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const assignmentIds = data.map((a) => a.id);

  const [membersResult, assetsResult] = await Promise.all([
    supabase
      .from("job_assignment_members")
      .select("assignment_id, workspace_member_id")
      .in("assignment_id", assignmentIds),
    supabase
      .from("job_assignment_assets")
      .select("assignment_id, asset_id")
      .in("assignment_id", assignmentIds),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (assetsResult.error) throw assetsResult.error;

  const membersByAssignment = new Map<string, string[]>();
  for (const m of membersResult.data ?? []) {
    const list = membersByAssignment.get(m.assignment_id) ?? [];
    list.push(m.workspace_member_id);
    membersByAssignment.set(m.assignment_id, list);
  }

  const assetsByAssignment = new Map<string, string[]>();
  for (const a of assetsResult.data ?? []) {
    const list = assetsByAssignment.get(a.assignment_id) ?? [];
    list.push(a.asset_id);
    assetsByAssignment.set(a.assignment_id, list);
  }

  return data.map((row) => {
    const proj = row.projects as { name: string } | null;
    const job = row.jobs as { title: string } | null;
    return {
      ...row,
      projects: row.projects,
      jobs: row.jobs,
      project_name: proj?.name ?? null,
      job_title: job?.title ?? null,
      member_ids: membersByAssignment.get(row.id) ?? [],
      asset_ids: assetsByAssignment.get(row.id) ?? [],
    } as AssignmentWithDetails;
  });
}

export async function createJobAssignment(
  workspaceId: string,
  input: Omit<JobAssignmentInsert, "workspace_id" | "created_by">,
  memberIds: string[],
  assetIds: string[],
): Promise<JobAssignmentRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to create an assignment.");

  const { data, error } = await supabase
    .from("job_assignments")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;

  if (memberIds.length > 0) {
    const { error: memberError } = await supabase
      .from("job_assignment_members")
      .insert(
        memberIds.map((workspace_member_id) => ({
          assignment_id: data.id,
          workspace_member_id,
          workspace_id: workspaceId,
        })),
      );
    if (memberError) throw memberError;
  }

  if (assetIds.length > 0) {
    const { error: assetError } = await supabase
      .from("job_assignment_assets")
      .insert(
        assetIds.map((asset_id) => ({
          assignment_id: data.id,
          asset_id,
          workspace_id: workspaceId,
        })),
      );
    if (assetError) throw assetError;
  }

  return data;
}

export async function updateJobAssignment(
  id: string,
  patch: JobAssignmentUpdate,
): Promise<JobAssignmentRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to update an assignment.");

  const { data, error } = await supabase
    .from("job_assignments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function replaceAssignmentMembers(
  workspaceId: string,
  assignmentId: string,
  memberIds: string[],
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const { error: deleteError } = await supabase
    .from("job_assignment_members")
    .delete()
    .eq("assignment_id", assignmentId);
  if (deleteError) throw deleteError;

  if (memberIds.length > 0) {
    const { error: insertError } = await supabase
      .from("job_assignment_members")
      .insert(
        memberIds.map((workspace_member_id) => ({
          assignment_id: assignmentId,
          workspace_member_id,
          workspace_id: workspaceId,
        })),
      );
    if (insertError) throw insertError;
  }
}

export async function replaceAssignmentAssets(
  workspaceId: string,
  assignmentId: string,
  assetIds: string[],
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const { error: deleteError } = await supabase
    .from("job_assignment_assets")
    .delete()
    .eq("assignment_id", assignmentId);
  if (deleteError) throw deleteError;

  if (assetIds.length > 0) {
    const { error: insertError } = await supabase
      .from("job_assignment_assets")
      .insert(
        assetIds.map((asset_id) => ({
          assignment_id: assignmentId,
          asset_id,
          workspace_id: workspaceId,
        })),
      );
    if (insertError) throw insertError;
  }
}

export async function deleteJobAssignment(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to delete an assignment.");

  await supabase
    .from("job_assignment_members")
    .delete()
    .eq("assignment_id", id);

  await supabase
    .from("job_assignment_assets")
    .delete()
    .eq("assignment_id", id);

  const { error } = await supabase
    .from("job_assignments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
