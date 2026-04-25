import type { Session } from "@supabase/supabase-js";
import { getCurrentSession } from "./session.ts";
import { getMyProfile, type ProfileRow } from "../repositories/profiles.ts";
import {
  getDefaultWorkspace,
  getMyWorkspaces,
  type WorkspaceMembershipSummary,
  type WorkspaceRow,
} from "../repositories/workspaces.ts";

export interface AppUserContext {
  session: Session | null;
  profile: ProfileRow | null;
  defaultWorkspace: WorkspaceRow | null;
  workspaces: WorkspaceMembershipSummary[];
}

export async function getCurrentAppUser(): Promise<AppUserContext> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      session: null,
      profile: null,
      defaultWorkspace: null,
      workspaces: [],
    };
  }

  const [profileResult, defaultWorkspaceResult, workspacesResult] =
    await Promise.allSettled([
      getMyProfile(),
      getDefaultWorkspace(),
      getMyWorkspaces(),
    ]);

  return {
    session,
    profile: profileResult.status === "fulfilled" ? profileResult.value : null,
    defaultWorkspace:
      defaultWorkspaceResult.status === "fulfilled"
        ? defaultWorkspaceResult.value
        : null,
    workspaces:
      workspacesResult.status === "fulfilled" ? workspacesResult.value : [],
  };
}
