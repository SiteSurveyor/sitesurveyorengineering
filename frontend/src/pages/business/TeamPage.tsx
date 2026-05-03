import { useState, useEffect, useCallback } from 'react'
import {
  listWorkspaceMembers,
} from '../../lib/repositories/workspaceMembers.ts'
import type { WorkspaceMemberWithProfile } from '../../lib/repositories/workspaceMembers.ts'
import { inviteWorkspaceMember, listWorkspaceInvitations, type WorkspaceInvitationRow } from '../../lib/repositories/invitations.ts'
import { getMyWorkspaceMembership, getWorkspaceById } from '../../lib/repositories/workspaces.ts'
import { canManageTeam } from '../../lib/permissions.ts'
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
  const [pendingInvitations, setPendingInvitations] = useState<WorkspaceInvitationRow[]>([])
  const [search, setSearch] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [membersPage, setMembersPage] = useState(1)
  const [invitesPage, setInvitesPage] = useState(1)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [workspaceType, setWorkspaceType] = useState<'personal' | 'business' | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as 'admin' | 'ops_manager' | 'finance' | 'sales' | 'technician' | 'viewer',
  })

  const fetchMembers = useCallback(async () => {
    try {
      setError(null)
      const [data, invites] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        listWorkspaceInvitations(workspaceId),
      ])
      setMembers(data)
      setPendingInvitations(invites)
      const [membership, workspace] = await Promise.all([
        getMyWorkspaceMembership(workspaceId),
        getWorkspaceById(workspaceId),
      ])
      setMyRole(membership?.role ?? null)
      setWorkspaceType(workspace?.type ?? null)
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
  const promoCodeCount = members.filter((m) => m.promo_code).length

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [m.full_name, m.professional_title, m.promo_code, m.role, m.work_email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
  const canInvite = canManageTeam(
    (myRole as 'owner' | 'admin' | 'ops_manager' | 'finance' | 'sales' | 'technician' | 'viewer' | null),
    workspaceType,
  )
  const membersPageSize = 10
  const invitesPageSize = 8
  const totalMembersPages = Math.max(1, Math.ceil(filteredMembers.length / membersPageSize))
  const totalInvitesPages = Math.max(1, Math.ceil(pendingInvitations.length / invitesPageSize))
  const paginatedMembers = filteredMembers.slice((membersPage - 1) * membersPageSize, membersPage * membersPageSize)
  const paginatedInvitations = pendingInvitations.slice((invitesPage - 1) * invitesPageSize, invitesPage * invitesPageSize)

  useEffect(() => {
    setMembersPage(1)
  }, [search])

  useEffect(() => {
    if (membersPage > totalMembersPages) setMembersPage(totalMembersPages)
  }, [membersPage, totalMembersPages])

  useEffect(() => {
    if (invitesPage > totalInvitesPages) setInvitesPage(totalInvitesPages)
  }, [invitesPage, totalInvitesPages])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canInvite) return
    setInviting(true)
    try {
      await inviteWorkspaceMember({
        workspaceId,
        email: inviteForm.email,
        role: inviteForm.role,
      })
      setInviteForm({ email: '', role: 'viewer' })
      setShowInviteModal(false)
      await fetchMembers()
    } catch (err: any) {
      setError(err.message ?? 'Failed to invite team member')
    } finally {
      setInviting(false)
    }
  }

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
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)} disabled={!canInvite}>+ Add Member</button>
        </div>
      </header>
      {!canInvite && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px' }}>
          You need admin permissions in a business workspace to invite team members.
        </div>
      )}

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
          <span className="invoice-summary-label">With Promo Code</span>
          <span className="invoice-summary-value team-kpi-value">{promoCodeCount}</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-spacer" />
        <input className="search-input" placeholder="Search personnel..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card team-table-card" style={{ overflowX: 'auto' }}>
        <table className="invoice-table team-table" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th className="team-col-name">NAME</th>
              <th className="team-col-role">ROLE</th>
              <th className="team-col-license hide-on-mobile">TITLE</th>
              <th className="team-col-crew hide-on-mobile">PROMO CODE</th>
              <th className="team-col-projects">EMAIL</th>
              <th className="team-col-surveys hide-on-mobile">PHONE</th>
              <th className="team-col-status team-col-status-center">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMembers.map((m) => {
              const cfg = statusConfig[m.status] ?? statusConfig.active
              return (
                <tr key={m.id} className="team-row">
                  <td className="team-cell-name">{m.full_name ?? '—'}</td>
                  <td className="team-cell-role">{roleLabels[m.role] ?? m.role}</td>
                  <td className="team-cell-license hide-on-mobile">{m.professional_title ?? m.title ?? '—'}</td>
                  <td className="team-cell-crew hide-on-mobile"><code>{m.promo_code ?? '—'}</code></td>
                  <td className="team-cell-projects">{m.work_email ?? m.email ?? '—'}</td>
                  <td className="team-cell-surveys hide-on-mobile">{m.work_phone ?? m.phone ?? '—'}</td>
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
        {filteredMembers.length > membersPageSize && (
          <div className="list-pagination">
            <button className="btn btn-outline btn-sm" onClick={() => setMembersPage((p) => Math.max(1, p - 1))} disabled={membersPage <= 1}>Previous</button>
            <span className="list-pagination-label">Page {membersPage} / {totalMembersPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setMembersPage((p) => Math.min(totalMembersPages, p + 1))} disabled={membersPage >= totalMembersPages}>Next</button>
          </div>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <div className="card team-table-card" style={{ marginTop: '12px', overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>Pending Invitations</h3>
          </div>
          <table className="invoice-table team-table" style={{ minWidth: '400px' }}>
            <thead>
              <tr>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th className="hide-on-mobile">EXPIRES</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvitations.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{roleLabels[invite.role] ?? invite.role}</td>
                  <td className="hide-on-mobile">{new Date(invite.expires_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingInvitations.length > invitesPageSize && (
            <div className="list-pagination">
              <button className="btn btn-outline btn-sm" onClick={() => setInvitesPage((p) => Math.max(1, p - 1))} disabled={invitesPage <= 1}>Previous</button>
              <span className="list-pagination-label">Page {invitesPage} / {totalInvitesPages}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setInvitesPage((p) => Math.min(totalInvitesPages, p + 1))} disabled={invitesPage >= totalInvitesPages}>Next</button>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <div className="hub-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="hub-modal-title">Invite Team Member</h2>
            <form className="hub-modal-form" onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="input-field"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value as typeof inviteForm.role }))}
                >
                  <option value="viewer">Viewer</option>
                  <option value="technician">Technician</option>
                  <option value="sales">Sales</option>
                  <option value="finance">Finance</option>
                  <option value="ops_manager">Ops Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
