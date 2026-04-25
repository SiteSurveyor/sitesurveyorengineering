import { useState, useEffect, useCallback } from 'react'
import { listProfessionals } from '../../lib/repositories/professionals.ts'
import type { ProfessionalRow } from '../../lib/repositories/professionals.ts'
import '../../styles/pages.css'

/* ── Availability colours ── */
const availabilityClass: Record<string, string> = {
  Available: 'pro-avail-green',
  Busy: 'pro-avail-red',
  'Available Soon': 'pro-avail-yellow',
}

/* ── Disciplines ── */
type DisciplineFilter = 'all' | 'Land Surveying' | 'Geomatics' | 'Engineering Surveying' | 'Geodesy' | 'Hydrographic Surveying' | 'Mine Surveying'

/* ── Component ── */
interface ProfessionalsPageProps {
  workspaceId: string;
}

export default function ProfessionalsPage({ workspaceId }: ProfessionalsPageProps) {
  const [search, setSearch] = useState('')
  const [discFilter, setDiscFilter] = useState<DisciplineFilter>('all')
  const [selectedPro, setSelectedPro] = useState<ProfessionalRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [page, setPage] = useState(1)

  const fetchPros = useCallback(async () => {
    try {
      setFetchError(null)
      const data = await listProfessionals(workspaceId)
      setProfessionals(data)
    } catch (err: any) {
      setFetchError(err.message ?? 'Failed to load professionals')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchPros()
  }, [fetchPros])

  const getAvatarUrl = (name: string) =>
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&radius=50&backgroundType=gradientLinear`

  const filtered = professionals.filter((p) => {
    if (discFilter !== 'all' && p.discipline !== discFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const haystack = [p.name, p.title, p.discipline, p.location, p.bio || '']
        .concat(p.skills || [])
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    }
    return true
  })
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search, discFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  if (loading) {
    return (
      <div className="hub-body pro-body">
        <p style={{ padding: '2rem' }}>Loading professionals...</p>
      </div>
    )
  }

  return (
    <div className="hub-body pro-body">
      {fetchError && (
        <div style={{ background: '#fee', color: '#c00', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {fetchError}
        </div>
      )}
      <header className="page-header pro-page-header">
        <div>
          <h1>Professionals Directory</h1>
          <p className="page-subtitle">Browse qualified surveyors and geomaticians across Zimbabwe</p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button className={`filter-chip ${discFilter === 'all' ? 'active' : ''}`} onClick={() => setDiscFilter('all')}>All</button>
        <button className={`filter-chip ${discFilter === 'Land Surveying' ? 'active' : ''}`} onClick={() => setDiscFilter('Land Surveying')}>Land Surveying</button>
        <button className={`filter-chip ${discFilter === 'Geomatics' ? 'active' : ''}`} onClick={() => setDiscFilter('Geomatics')}>Geomatics</button>
        <button className={`filter-chip ${discFilter === 'Engineering Surveying' ? 'active' : ''}`} onClick={() => setDiscFilter('Engineering Surveying')}>Engineering</button>
        <button className={`filter-chip ${discFilter === 'Geodesy' ? 'active' : ''}`} onClick={() => setDiscFilter('Geodesy')}>Geodesy</button>
        <button className={`filter-chip ${discFilter === 'Hydrographic Surveying' ? 'active' : ''}`} onClick={() => setDiscFilter('Hydrographic Surveying')}>Hydrographic</button>
        <button className={`filter-chip ${discFilter === 'Mine Surveying' ? 'active' : ''}`} onClick={() => setDiscFilter('Mine Surveying')}>Mine Surveying</button>
        <div className="filter-spacer" />
        <input
          className="search-input"
          placeholder="Search professionals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Professional Detail Modal */}
      {selectedPro && (
        <div className="mkt-modal-overlay" onClick={() => setSelectedPro(null)}>
          <div className="mkt-modal pro-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pro-modal-header">
              <img
                className="pro-avatar-lg"
                src={getAvatarUrl(selectedPro.name)}
                alt={`${selectedPro.name} avatar`}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPro.name)}&background=6366f1&color=fff&size=128`
                }}
              />
              <div className="pro-modal-info">
                <h2 className="mkt-modal-title">{selectedPro.name}</h2>
                <p className="mkt-modal-type">{selectedPro.title}</p>
                <div className="pro-modal-meta">
                  <span className={`pro-avail-badge ${availabilityClass[selectedPro.availability]}`}>{selectedPro.availability}</span>
                  <span className="pro-rating-inline">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {selectedPro.rating} ({selectedPro.reviews})
                  </span>
                </div>
              </div>
              <button className="mkt-modal-close" onClick={() => setSelectedPro(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mkt-modal-price">${selectedPro.rate} <span className="mkt-modal-currency">/{selectedPro.rate_per}</span></div>

            <p className="mkt-modal-desc">{selectedPro.bio}</p>

            {selectedPro.skills && selectedPro.skills.length > 0 && (
              <div>
                <span className="pro-section-label">Skills</span>
                <div className="mkt-modal-specs">
                  {selectedPro.skills.map(s => (
                    <span key={s} className="mkt-spec-chip">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedPro.certifications && selectedPro.certifications.length > 0 && (
              <div>
                <span className="pro-section-label">Certifications</span>
                <div className="mkt-modal-specs">
                  {selectedPro.certifications.map(c => (
                    <span key={c} className="mkt-spec-chip pro-cert-chip">{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mkt-modal-seller">
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Discipline</span>
                <span className="mkt-seller-value">{selectedPro.discipline}</span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Experience</span>
                <span className="mkt-seller-value">{selectedPro.experience}</span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Location</span>
                <span className="mkt-seller-value">{selectedPro.location}</span>
              </div>
            </div>

            <div className="mkt-modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedPro(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Professionals Table */}
      <div className="card pro-table-card">
        <table className="invoice-table pro-table">
          <thead>
            <tr>
              <th className="pro-col-person">PROFESSIONAL</th>
              <th className="pro-col-spec">SPECIALIZATION</th>
              <th className="pro-col-exp">EXPERIENCE</th>
              <th className="pro-col-rate">RATE</th>
              <th className="pro-col-avail">AVAILABILITY</th>
              <th className="pro-col-menu"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => (
              <tr key={p.id} className="pro-row" onClick={() => setSelectedPro(p)}>
                <td className="pro-cell-person">
                  <div className="pro-row-person">
                    <img
                      className="pro-row-avatar"
                      src={getAvatarUrl(p.name)}
                      alt={`${p.name} avatar`}
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff&size=64`
                      }}
                    />
                    <div className="pro-row-person-text">
                      <span className="pro-row-name">{p.name}</span>
                      <span className="pro-row-title">{p.title}</span>
                    </div>
                  </div>
                </td>
                <td className="pro-cell-spec">
                  <div className="pro-row-spec">
                    <span className="pro-row-discipline">{p.discipline}</span>
                    <span className="pro-row-location">{p.location}</span>
                  </div>
                </td>
                <td className="pro-cell-exp">{p.experience}</td>
                <td className="pro-cell-rate">
                  <div className="pro-row-rate">
                    <span className="pro-row-rate-val">${p.rate}</span>
                    <span className="pro-row-rate-per">per {p.rate_per}</span>
                  </div>
                </td>
                <td className="pro-cell-avail">
                  <span className={`pro-avail-badge ${availabilityClass[p.availability]}`}>{p.availability}</span>
                </td>
                <td className="pro-cell-menu">
                  <button className="pro-row-menu-btn" onClick={(e) => e.stopPropagation()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && (
          <div className="pro-empty">
            <h3>No professionals found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        )}
        {filtered.length > pageSize && (
          <div className="list-pagination">
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
            <span className="list-pagination-label">Page {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
