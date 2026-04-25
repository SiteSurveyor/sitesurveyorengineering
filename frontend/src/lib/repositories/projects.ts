import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type ProjectRow = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
export type ProjectMemberRow = Tables<"project_members">;
export type ProjectActivityRow = Tables<"project_activities">;

export interface ProjectWithOrg extends ProjectRow {
  organization_name: string | null;
}

export interface ProjectMemberWithProfile extends ProjectMemberRow {
  full_name: string | null;
  email: string | null;
}

export async function listProjects(
  workspaceId: string,
): Promise<ProjectWithOrg[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*, organizations(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const org = row.organizations as { name: string } | null;
    return {
      ...row,
      organizations: row.organizations,
      organization_name: org?.name ?? null,
    } as ProjectWithOrg;
  });
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProject(
  workspaceId: string,
  input: Omit<ProjectInsert, "workspace_id" | "created_by">,
): Promise<ProjectRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create a project.");

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("project_members").insert({
    workspace_id: workspaceId,
    project_id: data.id,
    user_id: user.id,
    role: "manager",
  });

  return data;
}

export async function updateProject(
  id: string,
  patch: ProjectUpdate,
): Promise<ProjectRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to update a project.");

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveProject(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to archive a project.");

  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function unarchiveProject(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to unarchive a project.");

  const { error } = await supabase
    .from("projects")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to delete a project.");

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profileError) throw profileError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return members.map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      ...m,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });
}

export type ProjectActivity = ProjectActivityRow & {
  user_name?: string;
};

export async function listProjectActivities(projectId: string): Promise<ProjectActivity[]> {
  const { data, error } = await supabase
    .from("project_activities")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to fetch project activities:", error.message);
    return [];
  }

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  const profileNameMap = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileError) {
      console.warn("Failed to resolve activity user names:", profileError.message);
    } else {
      for (const profile of profiles ?? []) {
        profileNameMap.set(profile.id, profile.full_name ?? null);
      }
    }
  }

  return rows.map(row => ({
    ...row,
    user_name: row.user_id
      ? profileNameMap.get(row.user_id) ?? "Unknown User"
      : "System",
  }));
}

export async function createProjectActivity(
  projectId: string,
  content: string,
  type: 'note' | 'action' | 'system' = 'note'
): Promise<ProjectActivityRow> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from("project_activities")
    .insert({
      project_id: projectId,
      user_id: user?.id ?? null,
      content,
      activity_type: type
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addProjectMember(
  workspaceId: string,
  projectId: string,
  userId: string,
  role: string = "member",
): Promise<ProjectMemberRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to add a project member.");

  const { data, error } = await supabase
    .from("project_members")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: userId,
      role,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeProjectMember(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to remove a project member.");

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
