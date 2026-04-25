import { useState, useEffect } from 'react'
import '../../styles/pages.css'
import { listContacts, createContact, archiveContact } from '../../lib/repositories/contacts.ts'
import { listOrganizations } from '../../lib/repositories/organizations.ts'
import type { OrganizationRow } from '../../lib/repositories/organizations.ts'
import { mapContactRowToUi, type UiContact } from '../../lib/mappers.ts'
import SelectDropdown from '../../components/SelectDropdown.tsx'

interface ContactsPageProps {
  workspaceId: string
}

const CONTACT_TYPES = ['Client', 'Subcontractor', 'Vendor', 'Government', 'Lead'] as const

export default function ContactsPage({ workspaceId }: ContactsPageProps) {
  const [contacts, setContacts] = useState<UiContact[]>([])
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Client' | 'Subcontractor' | 'Vendor' | 'Government'>('All')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ full_name: '', organization_id: '', title: '', contact_type: 'Client', email: '', phone: '' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchContacts = async () => {
    try {
      setLoading(true)
      setError(null)
      const [rows, orgs] = await Promise.all([
        listContacts(workspaceId),
        listOrganizations(workspaceId),
      ])
      setContacts(rows.map(mapContactRowToUi))
      setOrganizations(orgs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [workspaceId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = createForm.full_name.trim()
    if (!name) { setCreateError('Name is required.'); return }

    setSaving(true)
    setCreateError(null)
    try {
      await createContact(workspaceId, {
        full_name: name,
        organization_id: createForm.organization_id || null,
        title: createForm.title || null,
        contact_type: createForm.contact_type || null,
        email: createForm.email || null,
        phone: createForm.phone || null,
      })
      setShowCreateModal(false)
      setCreateForm({ full_name: '', organization_id: '', title: '', contact_type: 'Client', email: '', phone: '' })
      await fetchContacts()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create contact.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (dbId: string) => {
    try {
      await archiveContact(dbId)
      await fetchContacts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive contact.')
    }
  }

  const totalContacts = contacts.length
  const activeClients = contacts.filter(c => c.type === 'Client').length
  const networkPartners = contacts.filter(c => c.type === 'Vendor' || c.type === 'Subcontractor').length

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeFilter === 'All' ? true : c.type === activeFilter
    return matchesSearch && matchesTab
  })

  const typeConfig: Record<string, { bg: string, color: string }> = {
    Client: { bg: '#dbeafe', color: '#1d4ed8' },
    Lead: { bg: '#e0e7ff', color: '#4338ca' },
    Government: { bg: '#fef3c7', color: '#92400e' },
    Vendor: { bg: '#f3e8ff', color: '#6b21a8' },
    Subcontractor: { bg: '#dcfce7', color: '#15803d' },
  }

  const getAvatarColor = (name: string) => {
    const colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777']
    const index = name.length % colors.length
    return colors[index]
  }

  if (loading) {
    return (
      <div className="hub-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'var(--text)', fontSize: '14px' }}>Loading contacts...</p>
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

      <header className="page-header" style={{ padding: 0 }}>
        <div>
          <h1>Directory</h1>
          <p className="page-subtitle">Manage clients, subcontractors, and authorities</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-outline" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Export CSV
           </button>
          <button className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Contact
          </button>
        </div>
      </header>

      {/* Directory Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
           </div>
           <div>
             <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)', fontWeight: 700 }}>{totalContacts}</h3>
             <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>Total Contacts</p>
           </div>
        </div>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
           </div>
           <div>
             <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)', fontWeight: 700 }}>{activeClients}</h3>
             <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>Active Clients</p>
           </div>
        </div>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
           </div>
           <div>
             <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--text-h)', fontWeight: 700 }}>{networkPartners}</h3>
             <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>Network Partners</p>
           </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>

        {/* Table Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Client', 'Subcontractor', 'Vendor', 'Government'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab as any)}
                style={{
                  background: activeFilter === tab ? 'var(--text-h)' : 'transparent',
                  color: activeFilter === tab ? '#fff' : 'var(--text)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
             <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
             <input
               type="text"
               placeholder="Search people or companies..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="input-field"
               style={{
                 paddingLeft: '32px',
                 height: '34px',
                 fontSize: '13px',
                 width: '240px'
               }}
             />
           </div>
        </div>

        {/* Directory Table */}
        <table className="invoice-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '16px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Contact Person</th>
              <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Company & Role</th>
              <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Category</th>
              <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Contact Details</th>
              <th style={{ padding: '16px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Last Interaction</th>
              <th style={{ padding: '16px 20px', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
               const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
               const avatarColor = getAvatarColor(c.name)
               const badge = typeConfig[c.type] ?? { bg: '#e2e8f0', color: '#475569' }

               return (
                <tr
                  key={c.id}
                  style={{ transition: 'all 0.2s ease', borderBottom: '1px solid var(--border)' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ paddingLeft: '20px', paddingBlock: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{c.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{c.company}</span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>{c.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <span style={{
                      background: badge.bg,
                      color: badge.color,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {c.email && (
                        <a href={`mailto:${c.email}`} style={{ color: '#0f172a', textDecoration: 'none', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {c.phone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>{c.lastContact}</span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '20px', paddingBlock: '16px' }}>
                    <button
                      onClick={() => handleArchive(c.dbId)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                      className="hover-bg"
                      title="Archive contact"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </td>
                </tr>
               )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-heavy)" strokeWidth="1" style={{ marginBottom: '16px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h3 style={{ margin: '0 0 4px', color: 'var(--text-h)' }}>No contacts found</h3>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '13px' }}>
              {contacts.length === 0 ? 'Add your first contact to get started.' : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="invoices-create-overlay" role="dialog" aria-modal="true">
          <div className="invoices-create-modal" style={{ maxWidth: '520px' }}>
            <div className="invoices-create-header">
              <h3>Add Contact</h3>
              <button className="invoices-create-close" onClick={() => setShowCreateModal(false)}>Close</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="invoices-create-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '20px' }}>
                <input
                  className="input-field"
                  placeholder="Full name *"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  autoFocus
                  style={{ gridColumn: '1 / -1' }}
                />
                <SelectDropdown
                  className="input-field"
                  value={createForm.organization_id}
                  onChange={(val) => setCreateForm(f => ({ ...f, organization_id: val }))}
                  options={[
                    { value: "", label: "No organization" },
                    ...organizations.map(org => ({ value: org.id, label: org.name }))
                  ]}
                />
                <input
                  className="input-field"
                  placeholder="Job title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                />
                <SelectDropdown
                  className="input-field"
                  value={createForm.contact_type}
                  onChange={(val) => setCreateForm(f => ({ ...f, contact_type: val }))}
                  options={CONTACT_TYPES.map(t => ({ value: t, label: t }))}
                />
                <input
                  className="input-field"
                  type="email"
                  placeholder="Email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ gridColumn: '1 / -1' }}
                />
              </div>

              <div className="invoices-create-footer">
                {createError && <span className="invoices-create-error">{createError}</span>}
                <div className="invoices-create-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Add Contact'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
