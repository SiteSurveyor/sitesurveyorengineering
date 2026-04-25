import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesUpdate } from "../supabase/types.ts";

export type ProfileRow = Tables<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

export async function getMyProfile(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateMyProfile(
  patch: ProfileUpdate,
): Promise<ProfileRow> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be signed in to update your profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
