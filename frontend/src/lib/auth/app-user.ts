import type { Session } from "@supabase/supabase-js";
import { getCurrentSession } from "./session.ts";
import { getMyProfile, type ProfileRow } from "../repositories/profiles.ts";
import {
  getDefaultWorkspace,
  getMyWorkspaces,
  type WorkspaceMembershipSummary,
  type WorkspaceRow,
} from "../repositories/workspaces.ts";
import {
  getWorkspaceLicense,
  type WorkspaceLicense,
} from "../repositories/workspaceLicenses.ts";

export interface AppUserContext {
  session: Session | null;
  profile: ProfileRow | null;
  defaultWorkspace: WorkspaceRow | null;
  workspaces: WorkspaceMembershipSummary[];
  workspaceLicense: WorkspaceLicense | null;
}

export async function getCurrentAppUser(): Promise<AppUserContext> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      session: null,
      profile: null,
      defaultWorkspace: null,
      workspaces: [],
      workspaceLicense: null,
    };
  }

  const [profileResult, defaultWorkspaceResult, workspacesResult] =
    await Promise.allSettled([
      getMyProfile(),
      getDefaultWorkspace(),
      getMyWorkspaces(),
    ]);

  const defaultWorkspaceId =
    defaultWorkspaceResult.status === "fulfilled"
      ? (defaultWorkspaceResult.value?.id ?? null)
      : null;
  const fallbackWorkspaceId =
    workspacesResult.status === "fulfilled"
      ? (workspacesResult.value[0]?.workspaceId ?? null)
      : null;
  const targetWorkspaceId = defaultWorkspaceId ?? fallbackWorkspaceId;

  const workspaceLicenseResult = targetWorkspaceId
    ? await Promise.allSettled([getWorkspaceLicense(targetWorkspaceId)])
    : null;

  return {
    session,
    profile: profileResult.status === "fulfilled" ? profileResult.value : null,
    defaultWorkspace:
      defaultWorkspaceResult.status === "fulfilled"
        ? defaultWorkspaceResult.value
        : null,
    workspaces:
      workspacesResult.status === "fulfilled" ? workspacesResult.value : [],
    workspaceLicense:
      workspaceLicenseResult &&
      workspaceLicenseResult[0] &&
      workspaceLicenseResult[0].status === "fulfilled"
        ? workspaceLicenseResult[0].value
        : null,
  };
}
