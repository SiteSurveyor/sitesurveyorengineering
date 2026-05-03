import { useEffect, useMemo, useState } from "react";
import WorkspaceShell from "../../components/workspace/WorkspaceShell";
import { platformAdminNavGroup } from "../admin/adminNav.ts";
import {
  getAccessibleView,
  getWorkspaceShellAccountLabel,
} from "../workspace/account";
import { personalNavGroups } from "./navigation";
import { renderPersonalView } from "./viewRegistry";
import type { UiUser, WorkspaceView } from "../workspace/types";

interface PersonalWorkspaceShellProps {
  user: UiUser;
  onLogout: () => Promise<void> | void;
}

export default function PersonalWorkspaceShell({
  user,
  onLogout,
}: PersonalWorkspaceShellProps) {
  const storageKey = `sitesurveyor:lastView:personal:${user.workspaceId}`;
  const [currentView, setCurrentView] = useState<WorkspaceView>(() => {
    const saved = localStorage.getItem(storageKey) as WorkspaceView | null;
    return saved ?? "dashboard";
  });
  const [isProjectFullscreen, setIsProjectFullscreen] = useState(false);

  const activeView = useMemo(
    () =>
      getAccessibleView(
        "personal",
        currentView,
        user.licenseTier,
        user.licenseStatus,
        user.isPlatformAdmin,
      ),
    [currentView, user.isPlatformAdmin, user.licenseStatus, user.licenseTier],
  );

  const navGroups = useMemo(() => {
    const allowed = new Set(
      personalNavGroups
        .flatMap((group) => group.items.map((item) => item.view))
        .filter((view) =>
          getAccessibleView(
            "personal",
            view,
            user.licenseTier,
            user.licenseStatus,
            user.isPlatformAdmin,
          ) === view,
        ),
    );
    const base = personalNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowed.has(item.view)),
      }))
      .filter((group) => group.items.length > 0);

    if (!user.isPlatformAdmin) return base;

    const adminItems = platformAdminNavGroup.items.filter(
      (item) =>
        getAccessibleView(
          "personal",
          item.view,
          user.licenseTier,
          user.licenseStatus,
          user.isPlatformAdmin,
        ) === item.view,
    );
    if (adminItems.length === 0) return base;
    return [...base, { ...platformAdminNavGroup, items: adminItems }];
  }, [user.isPlatformAdmin, user.licenseStatus, user.licenseTier]);

  useEffect(() => {
    localStorage.setItem(storageKey, activeView);
  }, [activeView, storageKey]);

  return (
    <WorkspaceShell
      user={user}
      activeView={activeView}
      navGroups={navGroups}
      accountLabel={getWorkspaceShellAccountLabel(user)}
      isProjectFullscreen={isProjectFullscreen}
      onChangeView={setCurrentView}
      onLogout={onLogout}
    >
      {renderPersonalView(activeView, {
        user,
        onEnterFullscreenProject: () => setIsProjectFullscreen(true),
        onExitFullscreenProject: () => setIsProjectFullscreen(false),
      })}
    </WorkspaceShell>
  );
}
