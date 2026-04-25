import { useMemo, useState } from "react";
import WorkspaceShell from "../../components/workspace/WorkspaceShell";
import { getAccessibleView, getAccountTypeLabel } from "../workspace/account";
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
  const [currentView, setCurrentView] = useState<WorkspaceView>("dashboard");
  const [isProjectFullscreen, setIsProjectFullscreen] = useState(false);

  const activeView = useMemo(
    () => getAccessibleView("personal", currentView),
    [currentView],
  );

  return (
    <WorkspaceShell
      user={user}
      activeView={activeView}
      navGroups={personalNavGroups}
      accountLabel={getAccountTypeLabel("personal")}
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
