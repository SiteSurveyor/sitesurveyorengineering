import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type OrganizationRow = Tables<"organizations">;
export type OrganizationInsert = TablesInsert<"organizations">;
export type OrganizationUpdate = TablesUpdate<"organizations">;

export async function listOrganizations(
  workspaceId: string,
): Promise<OrganizationRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getOrganization(
  id: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createOrganization(
  workspaceId: string,
  input: Omit<OrganizationInsert, "workspace_id" | "created_by">,
): Promise<OrganizationRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create an organization.");

  const { data, error } = await supabase
    .from("organizations")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(
  id: string,
  patch: OrganizationUpdate,
): Promise<OrganizationRow> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to update an organization.");

  const { data, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveOrganization(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user)
    throw new Error("You must be signed in to archive an organization.");

  const { error } = await supabase
    .from("organizations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
