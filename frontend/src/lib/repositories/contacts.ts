import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types.ts";

export type ContactRow = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

export interface ContactWithOrg extends ContactRow {
  organization_name: string | null;
}

export async function listContacts(
  workspaceId: string,
): Promise<ContactWithOrg[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("contacts")
    .select("*, organizations(name)")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const org = row.organizations as { name: string } | null;
    return {
      ...row,
      organizations: row.organizations,
      organization_name: org?.name ?? null,
    } as ContactWithOrg;
  });
}

export async function getContact(id: string): Promise<ContactRow | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createContact(
  workspaceId: string,
  input: Omit<ContactInsert, "workspace_id" | "created_by">,
): Promise<ContactRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to create a contact.");

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...input, workspace_id: workspaceId, created_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateContact(
  id: string,
  patch: ContactUpdate,
): Promise<ContactRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to update a contact.");

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function archiveContact(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to archive a contact.");

  const { error } = await supabase
    .from("contacts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
