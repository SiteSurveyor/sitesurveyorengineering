import { useState, useEffect, useCallback } from 'react'
import {
  createProfessional,
  deleteProfessional,
  listProfessionals,
  updateProfessional,
} from '../../lib/repositories/professionals.ts'
import type { ProfessionalRow } from '../../lib/repositories/professionals.ts'
import SelectDropdown from '../../components/SelectDropdown.tsx'
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
  isPlatformAdmin?: boolean;
}

export default function ProfessionalsPage({
  workspaceId,
  isPlatformAdmin = false,
}: ProfessionalsPageProps) {
  const [search, setSearch] = useState('')
  const [discFilter, setDiscFilter] = useState<DisciplineFilter>('all')
  const [selectedPro, setSelectedPro] = useState<ProfessionalRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingPro, setSavingPro] = useState(false)
  const [pName, setPName] = useState('')
  const [pTitle, setPTitle] = useState('')
  const [pDiscipline, setPDiscipline] = useState('Land Surveying')
  const [pExperience, setPExperience] = useState('')
  const [pLocation, setPLocation] = useState('')
  const [pRate, setPRate] = useState('')
  const [pRatePer, setPRatePer] = useState('hour')
  const [pCurrency, setPCurrency] = useState('USD')
  const [pAvailability, setPAvailability] = useState('Available')
  const [pRating, setPRating] = useState('0')
  const [pReviews, setPReviews] = useState('0')
  const [pBio, setPBio] = useState('')
  const [pSkills, setPSkills] = useState('')
  const [pCerts, setPCerts] = useState('')

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

  const openCreatePro = () => {
    setEditingId(null)
    setPName('')
    setPTitle('')
    setPDiscipline('Land Surveying')
    setPExperience('')
    setPLocation('')
    setPRate('')
    setPRatePer('hour')
    setPCurrency('USD')
    setPAvailability('Available')
    setPRating('0')
    setPReviews('0')
    setPBio('')
    setPSkills('')
    setPCerts('')
    setEditorOpen(true)
  }

  const openEditPro = (p: ProfessionalRow) => {
    setEditingId(p.id)
    setPName(p.name)
    setPTitle(p.title)
    setPDiscipline(p.discipline)
    setPExperience(p.experience)
    setPLocation(p.location)
    setPRate(String(p.rate))
    setPRatePer(p.rate_per)
    setPCurrency(p.currency)
    setPAvailability(p.availability)
    setPRating(String(p.rating ?? 0))
    setPReviews(String(p.reviews ?? 0))
    setPBio(p.bio ?? '')
    setPSkills((p.skills ?? []).join(', '))
    setPCerts((p.certifications ?? []).join(', '))
    setEditorOpen(true)
    setSelectedPro(null)
  }

  const savePro = async () => {
    if (!pName.trim() || !pTitle.trim() || !pLocation.trim() || !pExperience.trim()) {
      setFetchError('Name, title, location, and experience are required.')
      return
    }
    const rateNum = Number(pRate)
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setFetchError('Enter a valid rate.')
      return
    }
    const ratingNum = Number(pRating)
    const reviewsNum = Number(pReviews)
    const skillsArr = pSkills.split(',').map((s) => s.trim()).filter(Boolean)
    const certsArr = pCerts.split(',').map((s) => s.trim()).filter(Boolean)
    setSavingPro(true)
    setFetchError(null)
    try {
      const payload = {
        name: pName.trim(),
        title: pTitle.trim(),
        discipline: pDiscipline,
        experience: pExperience.trim(),
        location: pLocation.trim(),
        rate: rateNum,
        rate_per: pRatePer.trim() || 'hour',
        currency: pCurrency.trim() || 'USD',
        availability: pAvailability,
        rating: Number.isFinite(ratingNum) ? ratingNum : 0,
        reviews: Number.isFinite(reviewsNum) ? Math.round(reviewsNum) : 0,
        bio: pBio.trim() || null,
        skills: skillsArr.length ? skillsArr : null,
        certifications: certsArr.length ? certsArr : null,
      }
      if (editingId) {
        await updateProfessional(editingId, payload)
      } else {
        await createProfessional(workspaceId, payload)
      }
      setEditorOpen(false)
      await fetchPros()
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSavingPro(false)
    }
  }

  const removePro = async (id: string) => {
    if (!window.confirm('Remove this professional from the directory?')) return
    setFetchError(null)
    try {
      await deleteProfessional(id)
      setSelectedPro(null)
      await fetchPros()
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to delete.')
    }
  }

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
      <header className="page-header pro-page-header" style={{ flexWrap: 'wrap', gap: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Professionals Directory</h1>
          <p className="page-subtitle">Browse qualified surveyors and geomaticians across Zimbabwe</p>
          {!isPlatformAdmin && (
            <p className="page-subtitle" style={{ fontSize: 13, marginTop: 8, opacity: 0.85 }}>
              Directory entries are maintained by platform administrators.
            </p>
          )}
        </div>
        {isPlatformAdmin && (
          <div className="header-actions">
            <button type="button" className="btn btn-primary" onClick={openCreatePro}>
              Add professional
            </button>
          </div>
        )}
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
              {isPlatformAdmin && selectedPro ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => openEditPro(selectedPro)}>Edit</button>
                  <button type="button" className="btn btn-outline" onClick={() => void removePro(selectedPro.id)}>Delete</button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div
          className="billing-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !savingPro && setEditorOpen(false)}
        >
          <div
            className="billing-modal billing-modal--scrollable-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-header">
              <h3>{editingId ? 'Edit professional' : 'Add professional'}</h3>
              <button
                type="button"
                className="billing-modal-close"
                disabled={savingPro}
                onClick={() => setEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-body-scroll">
              <div className="billing-modal-grid billing-modal-form-single">
                <label className="form-label" htmlFor="pro-editor-name">Name</label>
                <input id="pro-editor-name" className="input-field" value={pName} onChange={(e) => setPName(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-title">Title</label>
                <input id="pro-editor-title" className="input-field" value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="e.g. Principal Surveyor" />
                <label className="form-label">Discipline</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={pDiscipline}
                  onChange={setPDiscipline}
                  options={[
                    { value: 'Land Surveying', label: 'Land Surveying' },
                    { value: 'Geomatics', label: 'Geomatics' },
                    { value: 'Engineering Surveying', label: 'Engineering Surveying' },
                    { value: 'Geodesy', label: 'Geodesy' },
                    { value: 'Hydrographic Surveying', label: 'Hydrographic Surveying' },
                    { value: 'Mine Surveying', label: 'Mine Surveying' },
                  ]}
                />
                <label className="form-label" htmlFor="pro-editor-exp">Experience</label>
                <input id="pro-editor-exp" className="input-field" value={pExperience} onChange={(e) => setPExperience(e.target.value)} placeholder="e.g. 12 years" />
                <label className="form-label" htmlFor="pro-editor-location">Location</label>
                <input id="pro-editor-location" className="input-field" value={pLocation} onChange={(e) => setPLocation(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-rate">Rate</label>
                <input id="pro-editor-rate" className="input-field" type="number" min={0} step={0.01} value={pRate} onChange={(e) => setPRate(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-rate-per">Rate unit</label>
                <input id="pro-editor-rate-per" className="input-field" value={pRatePer} onChange={(e) => setPRatePer(e.target.value)} placeholder="hour, day, project…" />
                <label className="form-label" htmlFor="pro-editor-currency">Currency</label>
                <input id="pro-editor-currency" className="input-field" value={pCurrency} onChange={(e) => setPCurrency(e.target.value)} />
                <label className="form-label">Availability</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={pAvailability}
                  onChange={setPAvailability}
                  options={[
                    { value: 'Available', label: 'Available' },
                    { value: 'Busy', label: 'Busy' },
                    { value: 'Available Soon', label: 'Available Soon' },
                  ]}
                />
                <label className="form-label" htmlFor="pro-editor-rating">Rating (0–5)</label>
                <input id="pro-editor-rating" className="input-field" type="number" min={0} max={5} step={0.1} value={pRating} onChange={(e) => setPRating(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-reviews">Review count</label>
                <input id="pro-editor-reviews" className="input-field" type="number" min={0} step={1} value={pReviews} onChange={(e) => setPReviews(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-bio">Bio</label>
                <textarea id="pro-editor-bio" className="input-field" rows={3} value={pBio} onChange={(e) => setPBio(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-skills">Skills (comma-separated)</label>
                <input id="pro-editor-skills" className="input-field" value={pSkills} onChange={(e) => setPSkills(e.target.value)} />
                <label className="form-label" htmlFor="pro-editor-certs">Certifications (comma-separated)</label>
                <input id="pro-editor-certs" className="input-field" value={pCerts} onChange={(e) => setPCerts(e.target.value)} />
              </div>
            </div>
            <div className="billing-modal-actions">
              <button type="button" className="btn btn-outline" disabled={savingPro} onClick={() => setEditorOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingPro} onClick={() => void savePro()}>{savingPro ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Professionals Table */}
      <div className="card pro-table-card" style={{ overflowX: 'auto' }}>
        <table className="invoice-table pro-table">
          <thead>
            <tr>
              <th className="pro-col-person">PROFESSIONAL</th>
              <th className="pro-col-spec">SPECIALIZATION</th>
              <th className="pro-col-exp hide-on-mobile">EXPERIENCE</th>
              <th className="pro-col-rate hide-on-mobile">RATE</th>
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
                <td className="pro-cell-exp hide-on-mobile">{p.experience}</td>
                <td className="pro-cell-rate hide-on-mobile">
                  <div className="pro-row-rate">
                    <span className="pro-row-rate-val">${p.rate}</span>
                    <span className="pro-row-rate-per">per {p.rate_per}</span>
                  </div>
                </td>
                <td className="pro-cell-avail">
                  <span className={`pro-avail-badge ${availabilityClass[p.availability]}`}>{p.availability}</span>
                </td>
                <td className="pro-cell-menu" onClick={(e) => e.stopPropagation()}>
                  {isPlatformAdmin ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditPro(p)}>Edit</button>
                  ) : (
                    <button type="button" className="pro-row-menu-btn" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  )}
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
