import { getCurrentUser } from "../auth/session.ts";
import { supabase } from "../supabase/client.ts";
import type { Tables, TablesInsert } from "../supabase/types.ts";

export type AttachmentRow = Tables<"attachments">;
export type AttachmentInsert = TablesInsert<"attachments">;

export async function listAttachments(
  workspaceId: string,
): Promise<AttachmentRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAttachment(
  workspaceId: string,
  input: Omit<AttachmentInsert, "workspace_id" | "uploaded_by">,
): Promise<AttachmentRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to upload a file.");

  const { data, error } = await supabase
    .from("attachments")
    .insert({ ...input, workspace_id: workspaceId, uploaded_by: user.id })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to delete a file.");

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

const sanitizeFileName = (name: string): string =>
  name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120) || "file";

export async function uploadWorkspaceAttachment(
  workspaceId: string,
  file: File,
  bucketName: "workspace-private" | "workspace-public" = "workspace-private",
): Promise<AttachmentRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to upload a file.");

  const fileName = sanitizeFileName(file.name);
  const storagePath = `${workspaceId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) throw uploadError;

  try {
    return await createAttachment(workspaceId, {
      entity_table: "workspaces",
      entity_id: workspaceId,
      bucket_name: bucketName,
      storage_path: storagePath,
      visibility: bucketName === "workspace-public" ? "public" : "private",
      mime_type: file.type || null,
      size_bytes: file.size,
    });
  } catch (error) {
    await supabase.storage.from(bucketName).remove([storagePath]);
    throw error;
  }
}

export async function getAttachmentAccessUrl(
  attachment: Pick<AttachmentRow, "bucket_name" | "storage_path" | "visibility">,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  if (attachment.visibility === "public") {
    const { data } = supabase.storage
      .from(attachment.bucket_name)
      .getPublicUrl(attachment.storage_path);
    return data.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(attachment.bucket_name)
    .createSignedUrl(attachment.storage_path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to generate file access URL.");
  }

  return data.signedUrl;
}

export async function deleteAttachmentWithObject(
  attachment: Pick<AttachmentRow, "id" | "bucket_name" | "storage_path">,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to delete a file.");

  const { error: objectError } = await supabase.storage
    .from(attachment.bucket_name)
    .remove([attachment.storage_path]);

  if (objectError) throw objectError;

  await deleteAttachment(attachment.id);
}
