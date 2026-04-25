import { useState, useEffect, useCallback } from 'react'
import {
  listWorkspaceMembers,
} from '../../lib/repositories/workspaceMembers.ts'
import type { WorkspaceMemberWithProfile } from '../../lib/repositories/workspaceMembers.ts'
import '../../styles/project-hub.css'
import '../../styles/pages.css'

interface TeamPageProps {
  workspaceId: string
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  ops_manager: 'Ops Manager',
  finance: 'Finance',
  sales: 'Sales',
  technician: 'Technician',
  viewer: 'Viewer',
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  active: { label: 'Active', badge: 'badge-green' },
  invited: { label: 'Invited', badge: 'badge-blue' },
  suspended: { label: 'Suspended', badge: 'badge-gray' },
}

export default function TeamPage({ workspaceId }: TeamPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([])
  const [search, setSearch] = useState('')

  const fetchMembers = useCallback(async () => {
    try {
      setError(null)
      const data = await listWorkspaceMembers(workspaceId)
      setMembers(data)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const totalPersonnel = members.length
  const activeCount = members.filter(m => m.status === 'active').length
  const invitedCount = members.filter(m => m.status === 'invited').length
  const licensedCount = members.filter(m => m.pls_license).length

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [m.full_name, m.professional_title, m.pls_license, m.role, m.work_email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  if (loading) {
    return (
      <div className="hub-body ast-body team-page">
        <p style={{ padding: '2rem' }}>Loading team...</p>
      </div>
    )
  }

  return (
    <div className="hub-body ast-body team-page">
      {error && (
        <div
          style={{
            background: 'var(--danger-bg, #fee)',
            color: 'var(--danger, #c00)',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <header className="team-header">
        <div>
          <h1 className="team-title">Team</h1>
          <p className="team-subtitle">Personnel, certifications, and roles</p>
        </div>
        <div className="team-header-actions">
          <button className="btn btn-primary">+ Add Member</button>
        </div>
      </header>

      <div className="invoice-summary-row team-kpi-row">
        <div className="invoice-summary-card team-kpi-card team-kpi-accent">
          <span className="invoice-summary-label">Total Personnel</span>
          <span className="invoice-summary-value team-kpi-value">{totalPersonnel}</span>
        </div>
        <div className="invoice-summary-card team-kpi-card team-kpi-green">
          <span className="invoice-summary-label">Active</span>
          <span className="invoice-summary-value team-kpi-value team-kpi-value-green">{activeCount}</span>
        </div>
        <div className="invoice-summary-card team-kpi-card team-kpi-blue">
          <span className="invoice-summary-label">Invited</span>
          <span className="invoice-summary-value team-kpi-value team-kpi-value-blue">{invitedCount}</span>
        </div>
        <div className="invoice-summary-card team-kpi-card team-kpi-amber">
          <span className="invoice-summary-label">Licensed</span>
          <span className="invoice-summary-value team-kpi-value">{licensedCount}</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-spacer" />
        <input className="search-input" placeholder="Search personnel..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card team-table-card">
        <table className="invoice-table team-table">
          <thead>
            <tr>
              <th className="team-col-name">NAME</th>
              <th className="team-col-role">ROLE</th>
              <th className="team-col-license">TITLE</th>
              <th className="team-col-crew">LICENSE</th>
              <th className="team-col-projects">EMAIL</th>
              <th className="team-col-surveys">PHONE</th>
              <th className="team-col-status team-col-status-center">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => {
              const cfg = statusConfig[m.status] ?? statusConfig.active
              return (
                <tr key={m.id} className="team-row">
                  <td className="team-cell-name">{m.full_name ?? '—'}</td>
                  <td className="team-cell-role">{roleLabels[m.role] ?? m.role}</td>
                  <td className="team-cell-license">{m.professional_title ?? m.title ?? '—'}</td>
                  <td className="team-cell-crew"><code>{m.pls_license ?? '—'}</code></td>
                  <td className="team-cell-projects">{m.work_email ?? m.email ?? '—'}</td>
                  <td className="team-cell-surveys">{m.work_phone ?? m.phone ?? '—'}</td>
                  <td className="team-cell-status team-cell-status-center">
                    <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredMembers.length === 0 && (
          <div className="team-empty">
            <h3>{members.length === 0 ? 'No team members yet' : 'No personnel found'}</h3>
            <p>{members.length === 0 ? 'Invite your first team member to get started.' : 'Try adjusting your search criteria.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
