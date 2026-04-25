import { useMemo, useState } from "react";
import WorkspaceShell from "../../components/workspace/WorkspaceShell";
import { getAccessibleView, getAccountTypeLabel } from "../workspace/account";
import type { UiUser, WorkspaceView } from "../workspace/types";
import { businessNavGroups } from "./navigation";
import { renderBusinessView } from "./viewRegistry";

interface BusinessWorkspaceShellProps {
  user: UiUser;
  onLogout: () => Promise<void> | void;
}

export default function BusinessWorkspaceShell({
  user,
  onLogout,
}: BusinessWorkspaceShellProps) {
  const [currentView, setCurrentView] = useState<WorkspaceView>("dashboard");
  const [isProjectFullscreen, setIsProjectFullscreen] = useState(false);

  const activeView = useMemo(
    () => getAccessibleView("business", currentView),
    [currentView],
  );

  return (
    <WorkspaceShell
      user={user}
      activeView={activeView}
      navGroups={businessNavGroups}
      accountLabel={getAccountTypeLabel("business")}
      isProjectFullscreen={isProjectFullscreen}
      onChangeView={setCurrentView}
      onLogout={onLogout}
    >
      {renderBusinessView(activeView, {
        user,
        onEnterFullscreenProject: () => setIsProjectFullscreen(true),
        onExitFullscreenProject: () => setIsProjectFullscreen(false),
      })}
    </WorkspaceShell>
  );
}
