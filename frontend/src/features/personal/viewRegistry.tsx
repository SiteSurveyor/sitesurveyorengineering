import type { UiUser, WorkspaceView } from "../workspace/types";
import PersonalDashboardPage from "../../pages/personal/PersonalDashboardPage";
import SchedulePage from "../../pages/personal/SchedulePage";
import AssetManagementPage from "../../pages/shared/AssetManagementPage";
import BillingPage from "../../pages/shared/BillingPage";
import ContactsPage from "../../pages/shared/ContactsPage";
import FileManagerPage from "../../pages/shared/FileManagerPage";
import InvoicesPage from "../../pages/shared/InvoicesPage";
import JobsPage from "../../pages/shared/JobsPage";
import MarketplacePage from "../../pages/shared/MarketplacePage";
import ProfileSettingsPage from "../../pages/shared/ProfileSettingsPage";
import ProjectHubPage from "../../pages/shared/ProjectHubPage";
import QuotesPage from "../../pages/shared/QuotesPage";
import ProfessionalsPage from "../../pages/business/ProfessionalsPage";

interface PersonalViewRendererOptions {
  user: UiUser;
  onEnterFullscreenProject: () => void;
  onExitFullscreenProject: () => void;
}

export function renderPersonalView(
  activeView: WorkspaceView,
  options: PersonalViewRendererOptions,
) {
  const { user, onEnterFullscreenProject, onExitFullscreenProject } = options;

  switch (activeView) {
    case "dashboard":
      return <PersonalDashboardPage userName={user.name} workspaceId={user.workspaceId} />;

    case "schedule":
      return <SchedulePage workspaceId={user.workspaceId} />;

    case "projects":
      return (
        <ProjectHubPage
          userName={user.name}
          workspaceId={user.workspaceId}
          onEnterFullscreenProject={onEnterFullscreenProject}
          onExitFullscreenProject={onExitFullscreenProject}
        />
      );

    case "files":
      return <FileManagerPage workspaceId={user.workspaceId} />;

    case "quotes":
      return <QuotesPage workspaceId={user.workspaceId} />;

    case "invoices":
      return <InvoicesPage workspaceId={user.workspaceId} />;

    case "billing":
      return <BillingPage workspaceId={user.workspaceId} />;

    case "contacts":
      return <ContactsPage workspaceId={user.workspaceId} />;

    case "jobs":
      return <JobsPage workspaceId={user.workspaceId} />;

    case "marketplace":
      return <MarketplacePage workspaceId={user.workspaceId} />;

    case "assets":
      return <AssetManagementPage workspaceId={user.workspaceId} />;

    case "professionals":
      return <ProfessionalsPage workspaceId={user.workspaceId} />;

    case "profile":
    default:
      return <ProfileSettingsPage />;
  }
}
