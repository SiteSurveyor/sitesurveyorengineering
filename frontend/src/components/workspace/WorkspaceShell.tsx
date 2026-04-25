import { useMemo, useState } from "react";
import "../../styles/project-hub.css";
import { useServerStatus } from "../../lib/serverStatus.ts";
import type {
  AccountType,
  UiUser,
  WorkspaceNavGroup,
  WorkspaceView,
} from "../../features/workspace/types.ts";

interface WorkspaceShellProps {
  user: UiUser;
  activeView: WorkspaceView;
  navGroups: WorkspaceNavGroup[];
  accountLabel: string;
  isProjectFullscreen?: boolean;
  onChangeView: (view: WorkspaceView) => void;
  onLogout: () => Promise<void> | void;
  children: React.ReactNode;
}

interface WorkspaceTopbarProps {
  user: UiUser;
  accountLabel: string;
  onProfile: () => void;
  onLogout: () => Promise<void> | void;
}

interface WorkspaceSidebarProps {
  navGroups: WorkspaceNavGroup[];
  activeView: WorkspaceView;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChangeView: (view: WorkspaceView) => void;
}

function DashboardIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileManagerIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <path d="M12 11v6" />
      <path d="M9 14l3 3 3-3" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PersonPlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function MarketplaceIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ShoppingIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a4 4 0 0 0-8 0v2" />
    </svg>
  );
}

function ChevronCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: collapsed ? "rotate(180deg)" : "none",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function getNavIcon(icon: string) {
  switch (icon) {
    case "dashboard":
      return <DashboardIcon />;
    case "calendar":
      return <CalendarIcon />;
    case "clock":
      return <ClockIcon />;
    case "folder":
      return <FolderIcon />;
    case "file-manager":
      return <FileManagerIcon />;
    case "document":
      return <DocumentIcon />;
    case "billing":
      return <BillingIcon />;
    case "people":
      return <PeopleIcon />;
    case "person-plus":
      return <PersonPlusIcon />;
    case "person":
      return <PersonIcon />;
    case "briefcase":
      return <BriefcaseIcon />;
    case "marketplace":
      return <MarketplaceIcon />;
    case "shopping":
      return <ShoppingIcon />;
    case "asset":
      return <AssetIcon />;
    default:
      return <DashboardIcon />;
  }
}

function WorkspaceTopbar({
  user,
  accountLabel,
  onProfile,
  onLogout,
}: WorkspaceTopbarProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const serverStatus = useServerStatus();
  const accountClassName = useMemo<AccountType>(
    () => user.accountType,
    [user.accountType],
  );
  const statusLabel =
    serverStatus === "online"
      ? "Online"
      : serverStatus === "offline"
        ? "Offline"
        : "Checking...";

  const closeMenu = () => setProfileDropdownOpen(false);

  return (
    <>
      <header className="hub-topbar">
        <div className="hub-topbar-left">
          <img src="/logo.svg" alt="SiteSurveyor" className="hub-logo" />
          <span className="hub-brand">SiteSurveyor for Engineers</span>
        </div>

        <div className="hub-topbar-right">
          <div
            className={`hub-status-pill ${serverStatus}`}
            aria-live="polite"
            aria-label={`Server status: ${statusLabel}`}
          >
            <span className="hub-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="hub-profile-wrap">
            <button
              className="hub-avatar-btn"
              onClick={() => setProfileDropdownOpen((open) => !open)}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {profileDropdownOpen && (
              <>
                <div className="hub-dropdown-overlay" onClick={closeMenu} />
                <div className="hub-profile-dropdown">
                  <div className="hub-dropdown-user">
                    <span className="hub-dropdown-name">{user.name}</span>
                    <span className="hub-dropdown-email">{user.email}</span>
                    <span className={`hub-account-badge ${accountClassName}`}>
                      {accountLabel}
                    </span>
                  </div>

                  <div className="hub-dropdown-divider" />

                  <button
                    className="hub-dropdown-item"
                    onClick={() => {
                      closeMenu();
                      onProfile();
                    }}
                  >
                    <ProfileIcon />
                    Profile Settings
                  </button>

                  <button
                    className="hub-dropdown-item"
                    onClick={() => {
                      closeMenu();
                      onProfile();
                    }}
                  >
                    <EditIcon />
                    Edit Information
                  </button>

                  <div className="hub-dropdown-divider" />

                  <button
                    className="hub-dropdown-item"
                    onClick={() => {
                      closeMenu();
                      setShowAbout(true);
                    }}
                  >
                    <AboutIcon />
                    About
                  </button>

                  <a
                    href="https://sitesurveyor.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="hub-dropdown-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                    onClick={closeMenu}
                  >
                    <ExternalLinkIcon />
                    sitesurveyor.dev
                  </a>

                  <div className="hub-dropdown-divider" />

                  <button
                    className="hub-dropdown-item hub-dropdown-logout"
                    onClick={async () => {
                      closeMenu();
                      await onLogout();
                    }}
                  >
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showAbout && (
        <div className="hub-modal-overlay" onClick={() => setShowAbout(false)}>
          <div
            className="hub-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="hub-about-logo-wrap">
              <img
                src="/logo.svg"
                alt="SiteSurveyor Logo"
                className="hub-about-logo"
              />
            </div>

            <h2 className="hub-about-title">
              SiteSurveyor for Engineers
            </h2>

            <p className="hub-about-version">
              Version 2.0
            </p>

            <div className="hub-about-company-card">
              <p className="hub-about-company-text">
                A product of <strong>Eineva Incorporated</strong>
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px" }}
              onClick={() => setShowAbout(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WorkspaceSidebar({
  navGroups,
  activeView,
  collapsed,
  onToggleCollapsed,
  onChangeView,
}: WorkspaceSidebarProps) {
  return (
    <aside className={`hub-sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav className="hub-sidebar-nav">
        {navGroups.map((group, groupIndex) => (
          <div
            className="hub-nav-group"
            key={`${group.label ?? "group"}-${groupIndex}`}
          >
            {group.label ? (
              <span className="hub-nav-label">{group.label}</span>
            ) : null}

            {group.items.map((item) => (
              <button
                key={item.view}
                className={`hub-side-tab ${activeView === item.view ? "active" : ""}`}
                onClick={() => onChangeView(item.view)}
              >
                {getNavIcon(item.icon)}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        className="hub-sidebar-toggle"
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronCollapseIcon collapsed={collapsed} />
        <span className="hub-sidebar-toggle-label">Collapse</span>
      </button>
    </aside>
  );
}

export default function WorkspaceShell({
  user,
  activeView,
  navGroups,
  accountLabel,
  isProjectFullscreen = false,
  onChangeView,
  onLogout,
  children,
}: WorkspaceShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const shouldHideGlobalChrome =
    activeView === "projects" && isProjectFullscreen;

  return (
    <div className="hub-screen">
      {!shouldHideGlobalChrome && (
        <WorkspaceTopbar
          user={user}
          accountLabel={accountLabel}
          onProfile={() => onChangeView("profile")}
          onLogout={onLogout}
        />
      )}

      <div className="hub-workspace">
        {!shouldHideGlobalChrome && (
          <WorkspaceSidebar
            navGroups={navGroups}
            activeView={activeView}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
            onChangeView={onChangeView}
          />
        )}

        <main className="hub-main-content">{children}</main>
      </div>
    </div>
  );
}
