import { useState, useEffect, useMemo } from 'react'
import '../../styles/project-hub.css'
import '../../styles/pages.css'
import { listProjects, createProject, updateProject, archiveProject, unarchiveProject, deleteProject, listProjectMembers, listProjectActivities, createProjectActivity, type ProjectActivity } from '../../lib/repositories/projects.ts'
import SelectDropdown from '../../components/SelectDropdown.tsx'
import { listOrganizations, createOrganization } from '../../lib/repositories/organizations.ts'
import type { OrganizationRow } from '../../lib/repositories/organizations.ts'
import { mapProjectRowToHubProject, type UiHubProject } from '../../lib/mappers.ts'

export type HubProject = UiHubProject

interface ProjectHubPageProps {
  userName: string
  workspaceId: string
  onEnterFullscreenProject?: () => void
  onExitFullscreenProject?: () => void
}

const ACTIVE_PROJECT_KEY = 'sitesurveyorActiveProjectId'
const RECENT_TOOLS_KEY = 'sitesurveyorRecentProjectTools'

type ToolCategory =
  | 'Survey Setup'
  | 'Geodesy & Computation'
  | 'Field Data'
  | 'Drafting & Outputs'

type ToolFilter = 'all' | ToolCategory

interface ProjectTool {
  id: string
  label: string
  category: ToolCategory
  description: string
  pinned?: boolean
}

const PROJECT_TOOLS: ProjectTool[] = [
  { id: 'control-points', label: 'Control Points', category: 'Survey Setup', description: 'Manage control stations and baseline references.', pinned: true },
  { id: 'datum-projection', label: 'Datum & Projection', category: 'Survey Setup', description: 'Configure CRS, datum, and projection settings.' },
  { id: 'instrument-calibration', label: 'Instrument Calibration', category: 'Survey Setup', description: 'Track calibration status for project instruments.' },
  { id: 'coordinate-transform', label: 'Coordinate Transformation', category: 'Geodesy & Computation', description: 'Convert between local grid, UTM, and WGS84.', pinned: true },
  { id: 'traverse-adjustment', label: 'Traverse Adjustment', category: 'Geodesy & Computation', description: 'Adjust traverse loops and close errors.' },
  { id: 'area-volume', label: 'Area & Volume', category: 'Geodesy & Computation', description: 'Compute cut/fill, area measurements, and quantities.' },
  { id: 'bearing-distance', label: 'Bearing/Distance Converter', category: 'Geodesy & Computation', description: 'Convert azimuth, bearing, and chainage values.' },
  { id: 'raw-observations', label: 'Raw Observations', category: 'Field Data', description: 'Review and validate imported field observations.' },
  { id: 'gnss-import', label: 'GNSS Import', category: 'Field Data', description: 'Import and map GNSS logs and rover points.', pinned: true },
  { id: 'field-notes', label: 'Field Notes', category: 'Field Data', description: 'Capture notes, issues, and field actions.' },
  { id: 'qa-flags', label: 'QA Flags', category: 'Field Data', description: 'Track outliers and pending QA checks.' },
  { id: 'cad-export', label: 'CAD Export (DXF/DWG)', category: 'Drafting & Outputs', description: 'Prepare CAD-ready linework and layers.' },
  { id: 'map-layouts', label: 'Map Layouts', category: 'Drafting & Outputs', description: 'Generate map layouts for submissions.' },
  { id: 'deliverable-pack', label: 'Deliverable Pack', category: 'Drafting & Outputs', description: 'Assemble PDF, CSV, and report bundles.' },
]

const TOOL_CATEGORIES: ToolCategory[] = [
  'Survey Setup',
  'Geodesy & Computation',
  'Field Data',
  'Drafting & Outputs',
]

const projectStatusColors: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#dcfce7', color: '#15803d' },
  Completed: { bg: '#dbeafe', color: '#1d4ed8' },
  'On Hold': { bg: '#fef3c7', color: '#92400e' },
  Draft: { bg: '#f1f5f9', color: '#475569' },
  Archived: { bg: '#f1f5f9', color: '#475569' },
}

export default function ProjectHubPage({ userName, workspaceId, onEnterFullscreenProject, onExitFullscreenProject }: ProjectHubPageProps) {
  const [projects, setProjects] = useState<HubProject[]>([])
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<HubProject | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignEmail, setAssignEmail] = useState('')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PROJECT_KEY) || null
  })
  const [activeProjectTab, setActiveProjectTab] = useState<'overview' | 'files' | 'team' | 'quotes' | 'invoices' | 'cad' | 'settings'>('overview')
  const [editName, setEditName] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editPhase, setEditPhase] = useState('')
  const [editDatum, setEditDatum] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [newActivityText, setNewActivityText] = useState('')
  const [submittingActivity, setSubmittingActivity] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Completed' | 'Mine' | 'Archived'>('All')

  const [newName, setNewName] = useState('')
  const [newOrgId, setNewOrgId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPhase, setNewPhase] = useState('Planning')
  const [newDatum, setNewDatum] = useState('WGS84 / UTM 36S')
  const [customDatum, setCustomDatum] = useState('')
  const [saving, setSaving] = useState(false)

  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(false)
  const [toolSearchQuery, setToolSearchQuery] = useState('')
  const [activeToolCategory, setActiveToolCategory] = useState<ToolFilter>('all')
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((id): id is string => typeof id === 'string').slice(0, 8)
    } catch {
      return []
    }
  })

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const [rows, orgs] = await Promise.all([
        listProjects(workspaceId),
        listOrganizations(workspaceId),
      ])
      setOrganizations(orgs)

      const mapped = await Promise.all(
        rows.map(async (row) => {
          try {
            const members = await listProjectMembers(row.id)
            return mapProjectRowToHubProject(
              { ...row, organization_name: row.organization_name },
              members.map(m => ({ full_name: m.full_name, email: m.email, role: m.role })),
            )
          } catch {
            return mapProjectRowToHubProject(
              { ...row, organization_name: row.organization_name },
              [],
            )
          }
        }),
      )
      setProjects(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [workspaceId])

  useEffect(() => {
    if (activeProjectId) localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId)
    else localStorage.removeItem(ACTIVE_PROJECT_KEY)
  }, [activeProjectId])

  useEffect(() => {
    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recentToolIds))
  }, [recentToolIds])

  const activeProject = activeProjectId ? projects.find(p => p.dbId === activeProjectId || p.id === activeProjectId) ?? null : null

  useEffect(() => {
    if (!activeProjectId) return
    if (!activeProject) setActiveProjectId(null)
  }, [activeProject, activeProjectId])

  const filteredProjects = projects.filter((p) => {
    if (activeFilter === 'Active' && p.status !== 'Active') return false
    if (activeFilter === 'Completed' && p.status !== 'Completed') return false
    if (activeFilter === 'Archived' && p.status !== 'Archived') return false
    if (activeFilter === 'Mine' && (!p.members.some((m) => m.name === userName) || p.status === 'Archived')) return false
    if (activeFilter === 'All' && p.status === 'Archived') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const searchable = [p.name, p.client, p.id, p.datum, p.phase].join(' ').toLowerCase()
      if (!searchable.includes(q)) return false
    }
    return true
  })

  const counts = {
    All: projects.filter(p => p.status !== 'Archived').length,
    Active: projects.filter(p => p.status === 'Active').length,
    Completed: projects.filter(p => p.status === 'Completed').length,
    Mine: projects.filter(p => p.status !== 'Archived' && p.members.some((m) => m.name === userName)).length,
    Archived: projects.filter(p => p.status === 'Archived').length
  }

  const toolsById = useMemo(() => {
    return PROJECT_TOOLS.reduce<Record<string, ProjectTool>>((acc, tool) => {
      acc[tool.id] = tool
      return acc
    }, {})
  }, [])

  const pinnedTools = useMemo(() => PROJECT_TOOLS.filter(tool => tool.pinned), [])

  const recentTools = useMemo(() => {
    return recentToolIds.map(id => toolsById[id]).filter((tool): tool is ProjectTool => Boolean(tool))
  }, [recentToolIds, toolsById])

  const filteredTools = useMemo(() => {
    const query = toolSearchQuery.trim().toLowerCase()
    return PROJECT_TOOLS.filter(tool => {
      if (activeToolCategory !== 'all' && tool.category !== activeToolCategory) return false
      if (!query) return true
      const haystack = `${tool.label} ${tool.description} ${tool.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [activeToolCategory, toolSearchQuery])

  const groupedFilteredTools = useMemo(() => {
    return TOOL_CATEGORIES.map(category => ({
      category,
      tools: filteredTools.filter(tool => tool.category === category),
    })).filter(group => group.tools.length > 0)
  }, [filteredTools])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setSaving(true)
    setError(null)
    try {
      let organizationId: string | null = newOrgId || null

      if (!organizationId && newOrgName.trim()) {
        const org = await createOrganization(workspaceId, {
          name: newOrgName.trim(),
          organization_type: 'client',
        })
        organizationId = org.id
      }

      await createProject(workspaceId, {
        name: newName.trim(),
        organization_id: organizationId,
        description: newDesc.trim() || null,
        phase: newPhase || 'Planning',
        datum: newDatum === 'custom' ? (customDatum || null) : (newDatum || null),
        status: 'active',
      })

      setShowNewModal(false)
      setNewName('')
      setNewOrgId('')
      setNewOrgName('')
      setNewDesc('')
      setNewPhase('Planning')
      setNewDatum('WGS84 / UTM 36S')
      setCustomDatum('')
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.')
    } finally {
      setSaving(false)
    }
    await fetchProjects()
  }

  const fetchActivities = async () => {
    if (!activeProjectId) return
    const logs = await listProjectActivities(activeProjectId)
    setActivities(logs)
  }

  useEffect(() => {
    if (activeProject) {
      setEditName(activeProject.name)
      setEditClient(activeProject.client)
      setEditPhase(activeProject.phase)
      setEditDatum(activeProject.datum)
      setEditStatus(activeProject.status)
      setEditDesc(activeProject.description)
      fetchActivities()
    }
  }, [activeProject?.dbId])

  const handleUpdateProject = async () => {
    if (!activeProject) return
    setSaving(true)
    try {
      await updateProject(activeProject.dbId, {
        name: editName,
        phase: editPhase,
        datum: editDatum,
        status: editStatus.toLowerCase().replace(/ /g, '_') as any, // Simple mapping
        description: editDesc
      })
      await fetchProjects()
      setNotice({ type: 'success', message: 'Project configuration updated successfully.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newActivityText.trim() || !activeProjectId) return
    setSubmittingActivity(true)
    try {
      await createProjectActivity(activeProjectId, newActivityText, 'note')
      setNewActivityText('')
      await fetchActivities()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingActivity(false)
    }
  }

  const handleQuickAction = async (action: string) => {
    if (!activeProjectId) return
    try {
      await createProjectActivity(activeProjectId, `Executed: ${action}`, 'action')
      await fetchActivities()
      setNotice({ type: 'info', message: `${action} initialized. Action logged to timeline.` })
    } catch (err) {
      console.error(err)
    }
  }

  const handleProjectRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, project: HubProject) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedProject(project)
    }
  }

  const handleDeleteProject = async (dbId: string) => {
    try {
      await archiveProject(dbId)
      setSelectedProject(null)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      if (activeProjectId === dbId) setActiveProjectId(null)
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project.')
    }
  }

  const handleUnarchiveProject = async (dbId: string) => {
    try {
      await unarchiveProject(dbId)
      setSelectedProject(null)
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unarchive project.')
    }
  }

  const handlePermanentDeleteProject = async (dbId: string) => {
    try {
      await deleteProject(dbId)
      setSelectedProject(null)
      setShowPermanentDeleteConfirm(false)
      setDeleteConfirmText('')
      if (activeProjectId === dbId) setActiveProjectId(null)
      await fetchProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project permanently.')
    }
  }

  const openProject = (p: HubProject) => {
    setActiveProjectTab('overview')
    setActiveProjectId(p.dbId)
    onEnterFullscreenProject?.()
    setSelectedProject(null)
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
  }

  const exitProject = () => {
    setActiveProjectId(null)
    onExitFullscreenProject?.()
  }

  const handleToolOpen = (toolId: string) => {
    setRecentToolIds(prev => [toolId, ...prev.filter(id => id !== toolId)].slice(0, 8))
  }

  const kpiData = activeProject ? [
    { label: 'Capture Progress', value: `${activeProject.progress}%`, sub: `${activeProject.points.toLocaleString()} points capt.` },
    { label: 'Active Teams', value: `${activeProject.members.length}`, sub: 'Personnel currently assigned' },
    { label: 'Activity Count', value: `${activities.length}`, sub: 'Log entries for this lifecycle' },
    { label: 'Actions Run', value: `${activities.filter(a => a.activity_type === 'action').length}`, sub: 'Successful tool executions' },
  ] : []

  if (loading) {
    return (
      <div className="hub-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'var(--text)', fontSize: '14px' }}>Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="hub-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {notice && (
        <div className={`hub-notice hub-notice-${notice.type}`} role="status" aria-live="polite">
          <span>{notice.message}</span>
          <button type="button" className="hub-notice-close" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      )}

      {activeProject ? (
        <div className={`project-fullscreen-shell ${projectSidebarCollapsed ? 'collapsed' : ''}`}>
          <aside className="project-fullscreen-sidebar">
            <div className="project-fullscreen-sidebar-head">
              <button className="btn btn-outline btn-sm project-workspace-back" onClick={exitProject} title="Back to Projects">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                <span className="pf-nav-label">Back to Projects</span>
              </button>
              <div className="project-fullscreen-meta">
                <strong className="project-fullscreen-name">{activeProject.name}</strong>
                <span className="project-fullscreen-id">{activeProject.id}</span>
              </div>
            </div>
            <nav className="project-fullscreen-nav">
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveProjectTab('overview')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span className="pf-nav-label">Overview</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'files' ? 'active' : ''}`} onClick={() => setActiveProjectTab('files')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span className="pf-nav-label">Survey Setup</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'team' ? 'active' : ''}`} onClick={() => setActiveProjectTab('team')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span className="pf-nav-label">Geodesy &amp; Computation</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'quotes' ? 'active' : ''}`} onClick={() => setActiveProjectTab('quotes')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                <span className="pf-nav-label">Field Data</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveProjectTab('invoices')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span className="pf-nav-label">Drafting &amp; Outputs</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'cad' ? 'active' : ''}`} onClick={() => setActiveProjectTab('cad')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                <span className="pf-nav-label">Surveyor CAD</span>
              </button>
              <button className={`project-fullscreen-nav-btn ${activeProjectTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveProjectTab('settings')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span className="pf-nav-label">Project Settings</span>
              </button>
            </nav>
            <button className="project-fullscreen-collapse-btn" onClick={() => setProjectSidebarCollapsed(v => !v)} title={projectSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: projectSidebarCollapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
              <span className="pf-nav-label">Collapse</span>
            </button>
          </aside>

          <div className="project-fullscreen-main">
            <div className="project-workspace">
              <header className="project-workspace-header">
                <div className="project-workspace-title">
                  <h1 className="project-workspace-name">{activeProject.name}</h1>
                  <div className="project-workspace-sub">
                    <code className="ast-serial">{activeProject.id}</code>
                    <span>·</span>
                    <span>{activeProject.client}</span>
                  </div>
                </div>
                <div className="project-workspace-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedProject(activeProject)}>Details</button>
                </div>
              </header>

              {activeProjectTab === 'overview' ? (
                <div className="pd-unified-col">
                  <div className="project-dashboard-kpi-grid">
                    {kpiData.map(kpi => (
                      <article key={kpi.label} className="project-dashboard-kpi-card">
                        <span className="project-dashboard-kpi-label">{kpi.label}</span>
                        <strong className="project-dashboard-kpi-value">{kpi.value}</strong>
                        <span className="project-dashboard-kpi-sub">{kpi.sub}</span>
                      </article>
                    ))}
                  </div>

                  <section className="project-dashboard-card" style={{ marginTop: '16px' }}>
                    <h3 className="project-dashboard-card-title">Quick Actions</h3>
                    <div className="project-dashboard-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      <button className="btn btn-primary btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('New Field Session')}>
                        <span>New Field Session</span>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                          {activities.find(a => a.content.includes('Field Session')) ? 'Running' : 'Start'}
                        </span>
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Run Transformation')}>
                        <span>Run Transformation</span>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
                          {activities.filter(a => a.content.includes('Transformation')).length} runs
                        </span>
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Validate QA')}>
                        <span>Validate QA</span>
                        <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>
                          {Math.max(0, 12 - activities.filter(a => a.content.includes('Validate')).length)} left
                        </span>
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Prepare Deliverable')}>
                        <span>Prepare Deliverable</span>
                        <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                          v1.{activities.filter(a => a.content.includes('Deliverable')).length}
                        </span>
                      </button>
                    </div>
                  </section>

                  <section className="project-dashboard-card" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 className="project-dashboard-card-title" style={{ margin: 0 }}>Activity Timeline</h3>
                    </div>
                    <div className="project-dashboard-timeline">
                      <form onSubmit={handleAddActivity} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                        <input className="input-field" placeholder="Add a note or log an activity..." style={{ height: '36px', fontSize: '13px' }} value={newActivityText} onChange={e => setNewActivityText(e.target.value)} />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={submittingActivity || !newActivityText.trim()}>Log</button>
                      </form>
                      {activities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {activities.map(log => (
                            <div key={log.id} className="project-dashboard-timeline-item">
                              <span className="project-dashboard-timeline-dot" style={{ background: log.activity_type === 'system' ? '#3b82f6' : '#6366f1', top: '6px' }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-h)' }}>{log.content}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_name} &bull; {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>No activities logged for this operation yet.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              ) : activeProjectTab === 'cad' ? (
                <div className="card project-workspace-card project-workspace-empty">
                  <h3 className="project-workspace-empty-title">Surveyor CAD Environment</h3>
                  <p className="project-workspace-empty-copy">
                    The 3D CAD modeling and drafting interface will be embedded here.
                  </p>
                </div>
              ) : activeProjectTab === 'settings' ? (
                  <div className="project-settings-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '32px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      <div className="card project-workspace-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Project Information</h2>
                          <button className="btn btn-primary btn-sm" onClick={handleUpdateProject} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Project Name</label>
                          <input type="text" className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Client / Organization</label>
                            <input type="text" className="input-field" value={editClient} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Phase</label>
                            <select className="input-field" value={editPhase} onChange={e => setEditPhase(e.target.value)}>
                              <option>Planning</option>
                              <option>Field Execution</option>
                              <option>Data Processing</option>
                              <option>Drafting</option>
                              <option>Quality Assurance</option>
                              <option>Delivered</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Datum / CRS</label>
                            <input type="text" className="input-field" value={editDatum} onChange={e => setEditDatum(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status</label>
                            <select className="input-field" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                              <option>Draft</option>
                              <option>Active</option>
                              <option>On Hold</option>
                              <option>Completed</option>
                              <option>Archived</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Description / Scope of Work</label>
                          <textarea className="input-field" style={{ minHeight: '100px' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                        </div>
                      </div>

                      <div className="card project-workspace-card" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)', margin: 0, marginBottom: '16px' }}>Danger Zone</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {activeProject.status === 'Archived' ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #dcfce7', background: '#f0fdf4', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>Restore Project</span>
                                  <span style={{ fontSize: '11px', color: '#15803d' }}>Make project active and editable again.</span>
                                </div>
                                <button className="btn btn-sm" style={{ background: '#22c55e', color: '#fff', border: 'none' }} onClick={() => handleUnarchiveProject(activeProject.dbId)}>Restore</button>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>Permanent Delete</span>
                                  <span style={{ fontSize: '11px', color: '#b91c1c' }}>Destroy all project data. This cannot be undone.</span>
                                </div>
                                <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => { setSelectedProject(activeProject); setShowPermanentDeleteConfirm(true); }}>Delete</button>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>Archive Project</span>
                                <span style={{ fontSize: '11px', color: '#b91c1c' }}>Mark project as inactive and read-only.</span>
                              </div>
                              <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => { setSelectedProject(activeProject); setShowDeleteConfirm(true); }}>Archive</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      <div className="card project-workspace-card" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-h)', margin: 0, marginBottom: '20px' }}>Team Members</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {activeProject.members.map((member, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>{member.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.role}</span>
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: member.status === 'active' ? '#166534' : '#92400e' }}>{member.status}</span>
                            </div>
                          ))}
                          <button className="btn btn-outline btn-sm" style={{ marginTop: '8px', width: '100%' }} onClick={() => setShowAssignModal(true)}>Assign New Member</button>
                        </div>
                      </div>

                      <div className="card project-workspace-card" style={{ padding: '24px' }}>
                        <h3 className="project-dashboard-card-title" style={{ margin: 0, marginBottom: '16px' }}>Project Activity Log</h3>
                        <div className="project-dashboard-timeline" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <form onSubmit={handleAddActivity} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                            <input className="input-field" placeholder="Add a log entry..." style={{ height: '36px', fontSize: '13px' }} value={newActivityText} onChange={e => setNewActivityText(e.target.value)} />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingActivity || !newActivityText.trim()}>Log</button>
                          </form>
                          {activities.length > 0 ? activities.slice(0, 10).map(log => (
                            <div key={log.id} className="project-dashboard-timeline-item">
                              <span className="project-dashboard-timeline-dot" style={{ background: log.activity_type === 'system' ? '#3b82f6' : '#6366f1' }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-h)' }}>{log.content}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_name} &bull; {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          )) : (
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No activity logged yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

              ) : (() => {
                const tabToCategory: Record<string, string> = {
                  files: 'Survey Setup',
                  team: 'Geodesy & Computation',
                  quotes: 'Field Data',
                  invoices: 'Drafting & Outputs'
                }
                const activeCat = tabToCategory[activeProjectTab]
                const categoryTools = PROJECT_TOOLS.filter(t => t.category === activeCat)

                return (
                  <div className="project-dashboard-card" style={{ border: 'none', background: 'transparent' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                      {activeCat}
                    </h3>
                    {categoryTools.length > 0 ? (
                      <div className="project-tools-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {categoryTools.map(tool => (
                          <button key={tool.id} className="project-tool-card" onClick={() => handleToolOpen(tool.id)} style={{ padding: '16px', textAlign: 'left', minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="project-tool-card-top">
                              <strong className="project-tool-name" style={{ fontSize: '15px' }}>{tool.label}</strong>
                              {tool.pinned && <span className="project-tool-pin">Pinned</span>}
                            </div>
                            <p className="project-tool-desc" style={{ fontSize: '13px', marginTop: '8px' }}>{tool.description}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="project-tools-empty">
                        <h3 className="project-workspace-empty-title">No tools mapped</h3>
                        <p className="project-workspace-empty-copy">Tools for this category are yet to be defined.</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="page-header" style={{ padding: 0 }}>
            <div>
              <h1>Projects</h1>
              <p className="page-subtitle">Manage tracking, computations, and deployments for active field operations</p>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowNewModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Project
              </button>
            </div>
          </header>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['All', 'Active', 'Completed', 'Mine', 'Archived'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab as any)}
                    style={{
                      background: activeFilter === tab ? 'var(--text-h)' : 'transparent',
                      color: activeFilter === tab ? '#fff' : 'var(--text)',
                      border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', gap: '6px', alignItems: 'center'
                    }}
                  >
                    {tab}
                    <span style={{
                      fontSize: '10px',
                      background: activeFilter === tab ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      minWidth: '18px'
                    }}>
                      {counts[tab as keyof typeof counts]}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input-field" placeholder="Search reference or client..." style={{ paddingLeft: '32px', height: '34px', fontSize: '13px', width: '240px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <table className="invoice-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>PROJECT</th>
                  <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>CLIENT</th>
                  <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>PHASE</th>
                  <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>SURVEYOR</th>
                  <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>DATUM</th>
                  <th style={{ padding: '16px 8px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>POINTS</th>
                  <th style={{ padding: '16px 8px', minWidth: '120px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>PROGRESS</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const surveyor = p.members[0]?.name || 'Unassigned'
                  const statusStyle = projectStatusColors[p.status] ?? { bg: '#f1f5f9', color: '#475569' }
                  return (
                    <tr
                      key={p.dbId}
                      className="project-row-interactive"
                      onClick={() => setSelectedProject(p)}
                      onKeyDown={(e) => handleProjectRowKeyDown(e, p)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open project ${p.name}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease', borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ paddingLeft: '20px', paddingBlock: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{p.name}</span>
                          <code style={{ fontSize: '12px', color: 'var(--accent)', background: 'var(--accent-bg)', padding: '3px 8px', borderRadius: '4px', width: 'fit-content', marginTop: '6px', fontWeight: 600 }}>{p.id}</code>
                        </div>
                      </td>
                      <td style={{ fontSize: '14px', color: '#334155', fontWeight: 600, padding: '16px 8px' }}>{p.client}</td>
                      <td style={{ fontSize: '13px', color: '#475569', padding: '16px 8px' }}>{p.phase}</td>
                      <td style={{ fontSize: '14px', color: '#475569', fontWeight: 500, padding: '16px 8px' }}>{surveyor}</td>
                      <td style={{ fontSize: '12px', color: '#64748b', padding: '16px 8px' }}>{p.datum}</td>
                      <td style={{ fontSize: '14px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: '#0f172a', padding: '16px 8px' }}>{p.points.toLocaleString()}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', width: '32px' }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', paddingBlock: '16px' }}>
                        <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{p.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredProjects.length === 0 && (
              <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text)' }}>
                {projects.length === 0 ? 'No projects yet. Create your first project to get started.' : 'No projects found.'}
              </div>
            )}
          </div>
        </>
      )}

      {showAssignModal && (
        <div className="hub-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowAssignModal(false)}>
          <div className="hub-modal" role="dialog" aria-modal="true" aria-labelledby="assign-team-member-title" style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <h2 id="assign-team-member-title" className="hub-modal-title">Assign Team Member</h2>
            <form className="hub-modal-form" onSubmit={(e) => {
              e.preventDefault()
              if (assignEmail) {
                setNotice({ type: 'info', message: `Invitation generated for ${assignEmail} (mock action pending backend logic).` })
                setShowAssignModal(false)
                setAssignEmail('')
              }
            }}>
              <div className="form-group">
                <label className="form-label">Team Member Email</label>
                <input type="email" className="input-field" placeholder="surveyor@example.com" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} autoFocus required />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="hub-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowNewModal(false)}>
          <div className="hub-modal" role="dialog" aria-modal="true" aria-labelledby="initialize-project-title" style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <h2 id="initialize-project-title" className="hub-modal-title">Initialize Project</h2>
            <form className="hub-modal-form" onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input className="input-field" value={newName} onChange={e => setNewName(e.target.value)} autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Client (Organization)</label>
                <SelectDropdown
                  className="input-field"
                  value={newOrgId}
                  onChange={(val) => { setNewOrgId(val); if (val) setNewOrgName(''); }}
                  options={[
                    { value: '', label: 'Select or create new...' },
                    ...organizations.map(org => ({ value: org.id, label: org.name }))
                  ]}
                />
                {!newOrgId && (
                  <input className="input-field" style={{ marginTop: '8px' }} placeholder="Or type a new organization name..." value={newOrgName} onChange={e => setNewOrgName(e.target.value)} />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input-field" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Project notes, scope, and deliverables..." style={{ minHeight: '84px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phase</label>
                  <input className="input-field" value={newPhase} onChange={e => setNewPhase(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Datum</label>
                  <SelectDropdown
                    className="input-field"
                    value={newDatum}
                    onChange={(val) => setNewDatum(val)}
                    options={[
                      { value: 'WGS84 / UTM 36S', label: 'WGS84 / UTM 36S' },
                      { value: 'WGS84 / UTM 35S', label: 'WGS84 / UTM 35S' },
                      { value: 'Arc 1950', label: 'Arc 1950' },
                      { value: 'custom', label: 'Custom EPSG...' }
                    ]}
                  />
                  {newDatum === 'custom' && (
                    <input
                      className="input-field"
                      style={{ marginTop: '8px' }}
                      value={customDatum}
                      onChange={(e) => setCustomDatum(e.target.value)}
                      placeholder="e.g. EPSG:4326"
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={saving}>
                {saving ? 'Creating...' : 'Launch Environment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="mkt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => { setSelectedProject(null); setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
          <div className="mkt-modal ast-detail-modal" role="dialog" aria-modal="true" aria-labelledby="project-details-title" style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="ast-detail-top">
              <div>
                <h2 id="project-details-title" className="mkt-modal-title">{selectedProject.name}</h2>
                <p className="mkt-modal-type"><code className="ast-serial">{selectedProject.id}</code> &middot; {selectedProject.phase}</p>
              </div>
              <button className="mkt-modal-close" onClick={() => setSelectedProject(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="ast-detail-grid">
              <div className="ast-detail-item"><span className="ast-detail-label">Status</span><span style={{ background: projectStatusColors[selectedProject.status]?.bg || '#f1f5f9', color: projectStatusColors[selectedProject.status]?.color || '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{selectedProject.status}</span></div>
              <div className="ast-detail-item"><span className="ast-detail-label">Client</span><span className="ast-detail-value">{selectedProject.client}</span></div>
              <div className="ast-detail-item"><span className="ast-detail-label">Datum</span><span className="ast-detail-value">{selectedProject.datum}</span></div>
              <div className="ast-detail-item"><span className="ast-detail-label">Points</span><span className="ast-detail-value">{selectedProject.points.toLocaleString()}</span></div>
              <div className="ast-detail-item"><span className="ast-detail-label">Created</span><span className="ast-detail-value">{selectedProject.createdAt}</span></div>
              <div className="ast-detail-item"><span className="ast-detail-label">Last Activity</span><span className="ast-detail-value">{selectedProject.lastActivity}</span></div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <span className="pro-section-label">Progress</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedProject.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: '5px' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{selectedProject.progress}%</span>
              </div>
            </div>

            {selectedProject.description && (
              <div style={{ marginTop: '8px' }}>
                <span className="pro-section-label">Description</span>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{selectedProject.description}</p>
              </div>
            )}

            {selectedProject.members.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="pro-section-label">Team ({selectedProject.members.length})</span>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedProject.members.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{m.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>{m.role}</span>
                      </div>
                      <span style={{ background: m.status === 'active' ? '#dcfce7' : '#fef3c7', color: m.status === 'active' ? '#15803d' : '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{m.status === 'active' ? 'Active' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPermanentDeleteConfirm ? (
              <div style={{ marginTop: '8px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Are you sure you want to PERMANENTLY DELETE this project?</p>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#b91c1c' }}>This will destroy all related field data. Type <strong>{selectedProject.name}</strong> to confirm.</p>
                <input className="input-field" style={{ width: '100%', marginBottom: '12px', borderColor: '#fecaca' }} placeholder="Type project name to confirm..." value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => { setShowPermanentDeleteConfirm(false); setDeleteConfirmText('') }}>Cancel</button>
                  <button className="btn" style={{ background: deleteConfirmText === selectedProject.name ? '#dc2626' : '#e5e7eb', color: deleteConfirmText === selectedProject.name ? '#fff' : '#9ca3af', cursor: deleteConfirmText === selectedProject.name ? 'pointer' : 'not-allowed' }} disabled={deleteConfirmText !== selectedProject.name} onClick={() => handlePermanentDeleteProject(selectedProject.dbId)}>
                    Delete Project Permanently
                  </button>
                </div>
              </div>
            ) : showDeleteConfirm ? (
              <div style={{ marginTop: '8px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Are you sure you want to archive this project?</p>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#b91c1c' }}>Type <strong>{selectedProject.name}</strong> to confirm.</p>
                <input className="input-field" style={{ width: '100%', marginBottom: '12px', borderColor: '#fecaca' }} placeholder="Type project name to confirm..." value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>Cancel</button>
                  <button className="btn" style={{ background: deleteConfirmText === selectedProject.name ? '#dc2626' : '#e5e7eb', color: deleteConfirmText === selectedProject.name ? '#fff' : '#9ca3af', cursor: deleteConfirmText === selectedProject.name ? 'pointer' : 'not-allowed' }} disabled={deleteConfirmText !== selectedProject.name} onClick={() => handleDeleteProject(selectedProject.dbId)}>
                    Archive Project
                  </button>
                </div>
              </div>
            ) : (
              <div className="mkt-modal-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                {selectedProject.status === 'Archived' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" style={{ color: '#166534', borderColor: '#bbf7d0' }} onClick={() => handleUnarchiveProject(selectedProject.dbId)}>Restore Project</button>
                    <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setShowPermanentDeleteConfirm(true)}>Delete Forever</button>
                  </div>
                ) : (
                  <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setShowDeleteConfirm(true)}>Archive Project</button>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={() => { setSelectedProject(null); setShowDeleteConfirm(false); setShowPermanentDeleteConfirm(false); setDeleteConfirmText('') }}>Close</button>
                  <button className="btn btn-primary" onClick={() => openProject(selectedProject)}>Open Project</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
