import { useState, useEffect, useCallback } from 'react'
import {
  createMarketplaceListing,
  deleteMarketplaceListing,
  listMarketplaceListings,
  updateMarketplaceListing,
} from '../../lib/repositories/marketplace.ts'
import type { MarketplaceListingRow } from '../../lib/repositories/marketplace.ts'
import SelectDropdown from '../../components/SelectDropdown.tsx'
import '../../styles/pages.css'

/* ── SVG Icon Components ── */
function IconTotalStation() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <line x1="12" y1="11" x2="12" y2="14" />
      <line x1="8" y1="22" x2="12" y2="14" />
      <line x1="16" y1="22" x2="12" y2="14" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="12" y1="5" x2="18" y2="3" />
    </svg>
  )
}

function IconGnss() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function IconLevel() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <circle cx="12" cy="12" r="1" />
      <line x1="6" y1="14" x2="4" y2="20" />
      <line x1="18" y1="14" x2="20" y2="20" />
      <line x1="12" y1="10" x2="12" y2="6" />
      <circle cx="12" cy="5" r="1" />
    </svg>
  )
}

function IconDrone() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="10" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="4" y2="8" />
      <line x1="15" y1="12" x2="20" y2="8" />
      <line x1="9" y1="12" x2="4" y2="16" />
      <line x1="15" y1="12" x2="20" y2="16" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="20" cy="8" r="2" />
      <circle cx="4" cy="16" r="2" />
      <circle cx="20" cy="16" r="2" />
    </svg>
  )
}

function IconController() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <rect x="7" y="4" width="10" height="10" rx="1" />
      <circle cx="10" cy="18" r="1" />
      <circle cx="14" cy="18" r="1" />
    </svg>
  )
}

function IconCalibration() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/* ── Icon Map ── */
const iconMap: Record<string, React.FC> = {
  'Total Station': IconTotalStation,
  'GNSS Receiver': IconGnss,
  'Digital Level': IconLevel,
  'UAV / Drone': IconDrone,
  Controller: IconController,
  'Calibration Service': IconCalibration,
}

function ListingIcon({ type }: { type: string }) {
  const Ico = iconMap[type] || IconTotalStation
  return <Ico />
}

const conditionBadge: Record<string, string> = {
  New: 'badge-green',
  'Like New': 'badge-blue',
  Good: 'badge-yellow',
  Fair: 'badge-gray',
  Service: 'badge-purple',
}

type FilterType = 'all' | 'Total Station' | 'GNSS Receiver' | 'Digital Level' | 'UAV / Drone' | 'Controller' | 'Calibration Service'

interface MarketplacePageProps {
  workspaceId: string;
  isPlatformAdmin?: boolean;
}

export default function MarketplacePage({
  workspaceId,
  isPlatformAdmin = false,
}: MarketplacePageProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [selectedListing, setSelectedListing] = useState<MarketplaceListingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const [listingState, setListingState] = useState<MarketplaceListingRow[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingListing, setSavingListing] = useState(false)
  const [mName, setMName] = useState('')
  const [mType, setMType] = useState('Total Station')
  const [mCondition, setMCondition] = useState('Good')
  const [mPrice, setMPrice] = useState('')
  const [mCurrency, setMCurrency] = useState('USD')
  const [mSeller, setMSeller] = useState('')
  const [mLocation, setMLocation] = useState('')
  const [mDescription, setMDescription] = useState('')
  const [mSpecs, setMSpecs] = useState('')

  const fetchListings = useCallback(async () => {
    try {
      setFetchError(null)
      const data = await listMarketplaceListings(workspaceId)
      setListingState(data)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const filtered = listingState.filter((l) => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return [l.name, l.type, l.seller, l.location, l.description]
        .join(' ')
        .toLowerCase()
        .includes(q)
    }
    return true
  })
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const clearMarketplaceFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setPage(1)
  }

  const openCreateListing = () => {
    setEditingId(null)
    setMName('')
    setMType('Total Station')
    setMCondition('Good')
    setMPrice('')
    setMCurrency('USD')
    setMSeller('')
    setMLocation('')
    setMDescription('')
    setMSpecs('')
    setEditorOpen(true)
  }

  const openEditListing = (row: MarketplaceListingRow) => {
    setEditingId(row.id)
    setMName(row.name)
    setMType(row.type)
    setMCondition(row.condition)
    setMPrice(String(row.price))
    setMCurrency(row.currency)
    setMSeller(row.seller)
    setMLocation(row.location)
    setMDescription(row.description ?? '')
    setMSpecs((row.specs ?? []).join(', '))
    setEditorOpen(true)
    setSelectedListing(null)
  }

  const saveListing = async () => {
    if (!mName.trim() || !mSeller.trim() || !mLocation.trim()) {
      setFetchError('Name, seller, and location are required.')
      return
    }
    const priceNum = Number(mPrice)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFetchError('Enter a valid price.')
      return
    }
    const specsArr = mSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setSavingListing(true)
    setFetchError(null)
    try {
      const payload = {
        name: mName.trim(),
        type: mType,
        condition: mCondition,
        price: priceNum,
        currency: mCurrency.trim() || 'USD',
        seller: mSeller.trim(),
        location: mLocation.trim(),
        description: mDescription.trim() || null,
        specs: specsArr.length ? specsArr : null,
      }
      if (editingId) {
        await updateMarketplaceListing(editingId, payload)
      } else {
        await createMarketplaceListing(workspaceId, payload)
      }
      setEditorOpen(false)
      await fetchListings()
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to save listing.')
    } finally {
      setSavingListing(false)
    }
  }

  const removeListing = async (id: string) => {
    if (!window.confirm('Delete this listing permanently?')) return
    setFetchError(null)
    try {
      await deleteMarketplaceListing(id)
      setSelectedListing(null)
      await fetchListings()
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to delete.')
    }
  }

  useEffect(() => {
    setPage(1)
  }, [search, typeFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  if (loading) {
    return (
      <div className="hub-body">
        <p style={{ padding: '2rem' }}>Loading marketplace...</p>
      </div>
    )
  }

  return (
    <div className="hub-body mkt-body">
      {fetchError && (
        <div style={{ background: '#fee', color: '#c00', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {fetchError}
        </div>
      )}
      <header className="page-header mkt-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Instruments &amp; Calibration</h1>
          <p className="page-subtitle">Browse available survey instruments and calibration services</p>
          {!isPlatformAdmin && (
            <p className="page-subtitle" style={{ fontSize: 13, marginTop: 8, opacity: 0.85 }}>
              Listings are maintained by platform administrators.
            </p>
          )}
        </div>
        {isPlatformAdmin && (
          <div className="header-actions">
            <button type="button" className="btn btn-primary" onClick={openCreateListing}>
              Add listing
            </button>
          </div>
        )}
      </header>

      <div className="filter-bar">
        <button className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
        <button className={`filter-chip ${typeFilter === 'Total Station' ? 'active' : ''}`} onClick={() => setTypeFilter('Total Station')}>Total Stations</button>
        <button className={`filter-chip ${typeFilter === 'GNSS Receiver' ? 'active' : ''}`} onClick={() => setTypeFilter('GNSS Receiver')}>GNSS</button>
        <button className={`filter-chip ${typeFilter === 'Digital Level' ? 'active' : ''}`} onClick={() => setTypeFilter('Digital Level')}>Levels</button>
        <button className={`filter-chip ${typeFilter === 'UAV / Drone' ? 'active' : ''}`} onClick={() => setTypeFilter('UAV / Drone')}>Drones</button>
        <button className={`filter-chip ${typeFilter === 'Controller' ? 'active' : ''}`} onClick={() => setTypeFilter('Controller')}>Controllers</button>
        <button className={`filter-chip ${typeFilter === 'Calibration Service' ? 'active' : ''}`} onClick={() => setTypeFilter('Calibration Service')}>Calibration</button>
        <div className="filter-spacer" />
        <input
          className="search-input"
          placeholder="Search instruments & services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="mkt-modal-overlay" onClick={() => setSelectedListing(null)}>
          <div className="mkt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mkt-modal-header">
              <span className="mkt-modal-icon">
                <ListingIcon type={selectedListing.type} />
              </span>
              <div>
                <h2 className="mkt-modal-title">{selectedListing.name}</h2>
                <p className="mkt-modal-type">{selectedListing.type} &middot; <span className={`badge ${conditionBadge[selectedListing.condition]}`}>{selectedListing.condition}</span></p>
              </div>
              <button className="mkt-modal-close" onClick={() => setSelectedListing(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mkt-modal-price">${selectedListing.price.toLocaleString()} <span className="mkt-modal-currency">{selectedListing.currency}</span></div>
            {selectedListing.description && <p className="mkt-modal-desc">{selectedListing.description}</p>}
            {selectedListing.specs && selectedListing.specs.length > 0 && (
              <div className="mkt-modal-specs">
                {selectedListing.specs.map((s) => (
                  <span key={s} className="mkt-spec-chip">{s}</span>
                ))}
              </div>
            )}
            <div className="mkt-modal-seller">
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">{selectedListing.condition === 'Service' ? 'Provider' : 'Seller'}</span>
                <span className="mkt-seller-value">{selectedListing.seller}</span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Location</span>
                <span className="mkt-seller-value">{selectedListing.location}</span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Posted</span>
                <span className="mkt-seller-value">{new Date(selectedListing.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mkt-modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedListing(null)}>Close</button>
              {isPlatformAdmin && selectedListing ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => openEditListing(selectedListing)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => void removeListing(selectedListing.id)}>
                    Delete
                  </button>
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
          onClick={() => !savingListing && setEditorOpen(false)}
        >
          <div
            className="billing-modal billing-modal--scrollable-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-header">
              <h3>{editingId ? 'Edit listing' : 'Add listing'}</h3>
              <button
                type="button"
                className="billing-modal-close"
                disabled={savingListing}
                onClick={() => setEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-body-scroll">
              <div className="billing-modal-grid billing-modal-form-single">
                <label className="form-label" htmlFor="mkt-editor-name">Name</label>
                <input id="mkt-editor-name" className="input-field" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Instrument or service name" />
                <label className="form-label">Type</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={mType}
                  onChange={(v) => setMType(v)}
                  options={[
                    { value: 'Total Station', label: 'Total Station' },
                    { value: 'GNSS Receiver', label: 'GNSS Receiver' },
                    { value: 'Digital Level', label: 'Digital Level' },
                    { value: 'UAV / Drone', label: 'UAV / Drone' },
                    { value: 'Controller', label: 'Controller' },
                    { value: 'Calibration Service', label: 'Calibration Service' },
                  ]}
                />
                <label className="form-label">Condition</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={mCondition}
                  onChange={setMCondition}
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Like New', label: 'Like New' },
                    { value: 'Good', label: 'Good' },
                    { value: 'Fair', label: 'Fair' },
                    { value: 'Service', label: 'Service' },
                  ]}
                />
                <label className="form-label" htmlFor="mkt-editor-price">Price</label>
                <input id="mkt-editor-price" className="input-field" type="number" min={0} step={0.01} value={mPrice} onChange={(e) => setMPrice(e.target.value)} placeholder="0" />
                <label className="form-label" htmlFor="mkt-editor-currency">Currency</label>
                <input id="mkt-editor-currency" className="input-field" value={mCurrency} onChange={(e) => setMCurrency(e.target.value)} placeholder="USD" />
                <label className="form-label" htmlFor="mkt-editor-seller">Seller</label>
                <input id="mkt-editor-seller" className="input-field" value={mSeller} onChange={(e) => setMSeller(e.target.value)} />
                <label className="form-label" htmlFor="mkt-editor-location">Location</label>
                <input id="mkt-editor-location" className="input-field" value={mLocation} onChange={(e) => setMLocation(e.target.value)} />
                <label className="form-label" htmlFor="mkt-editor-desc">Description</label>
                <textarea id="mkt-editor-desc" className="input-field" rows={3} value={mDescription} onChange={(e) => setMDescription(e.target.value)} />
                <label className="form-label" htmlFor="mkt-editor-specs">Specs (comma-separated)</label>
                <input id="mkt-editor-specs" className="input-field" value={mSpecs} onChange={(e) => setMSpecs(e.target.value)} placeholder='e.g. 5" accuracy, Bluetooth' />
              </div>
            </div>
            <div className="billing-modal-actions">
              <button type="button" className="btn btn-outline" disabled={savingListing} onClick={() => setEditorOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={savingListing} onClick={() => void saveListing()}>{savingListing ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Table */}
      <div className="card mkt-table-card" style={{ overflowX: 'auto' }}>
        <table className="invoice-table mkt-table" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th className="mkt-col-item">INSTRUMENT</th>
              <th className="mkt-col-condition hide-on-mobile">CONDITION</th>
              <th className="mkt-col-price">PRICE</th>
              <th className="mkt-col-location hide-on-mobile">LOCATION</th>
              <th className="mkt-col-seller">SELLER</th>
              <th className="mkt-col-menu"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((l) => (
              <tr key={l.id} className="mkt-row" onClick={() => setSelectedListing(l)}>
                <td className="mkt-cell-item">
                  <div className="mkt-item">
                    <div className="mkt-item-icon">
                      <div className="mkt-item-icon-inner"><ListingIcon type={l.type} /></div>
                    </div>
                    <div className="mkt-item-text">
                      <span className="mkt-item-name">{l.name}</span>
                      <span className="mkt-item-type">{l.type}</span>
                    </div>
                  </div>
                </td>
                <td className="mkt-cell-condition hide-on-mobile">
                  <span className={`badge ${conditionBadge[l.condition]}`}>{l.condition}</span>
                </td>
                <td className="mkt-cell-price">
                  <div className="mkt-price">
                    <span className="mkt-price-val">${l.price.toLocaleString()}</span>
                    <span className="mkt-price-currency">{l.currency}</span>
                  </div>
                </td>
                <td className="mkt-cell-location hide-on-mobile">{l.location}</td>
                <td className="mkt-cell-seller">
                  <div className="mkt-seller">
                    <span className="mkt-seller-name">{l.seller}</span>
                    <span className="mkt-seller-posted">{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="mkt-cell-menu" onClick={(e) => e.stopPropagation()}>
                  {isPlatformAdmin ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditListing(l)}>Edit</button>
                  ) : (
                    <button type="button" className="mkt-row-menu-btn" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && (
          <div className="mkt-empty-state">
            <h3>No listings found</h3>
            <p>No listings are currently available in the system for this view.</p>
            <button className="btn btn-outline btn-sm" onClick={clearMarketplaceFilters}>Clear filters</button>
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
