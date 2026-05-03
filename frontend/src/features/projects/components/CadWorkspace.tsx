import type { HubProject } from "../../../pages/shared/ProjectHubPage.tsx";

interface CadWorkspaceProps {
  activeProject: HubProject;
  setProjectMobileMenuOpen: (v: boolean) => void;
  exitCadWorkspace: () => void;
}

export function CadWorkspace({
  activeProject,
  setProjectMobileMenuOpen,
  exitCadWorkspace,
}: CadWorkspaceProps) {
  return (
    <section className="cad-workspace-shell" aria-label="Surveyor CAD workspace">
      <header className="cad-topbar">
        <div className="cad-topbar-left">
          <button className="hub-mobile-menu-btn" style={{ marginRight: '8px' }} onClick={() => setProjectMobileMenuOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <strong className="cad-title">Surveyor CAD</strong>
          <span className="cad-project-ref hide-on-mobile">{activeProject.id} · {activeProject.name}</span>
        </div>
        <div className="cad-topbar-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={exitCadWorkspace}>Exit CAD</button>
        </div>
      </header>

      <div className="cad-workspace-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Surveyor CAD is Coming Soon</h2>
        <p style={{ color: '#64748b', maxWidth: '400px', textAlign: 'center' }}>
          We are currently building a powerful, fully-integrated CAD environment. Check back soon for updates.
        </p>
      </div>
    </section>
  );
}
