import { useState, useEffect, useCallback } from 'react'
import { listMarketplaceListings, createMarketplaceListing } from '../../lib/repositories/marketplace.ts'
import type { MarketplaceListingRow, MarketplaceListingInsert } from '../../lib/repositories/marketplace.ts'
import '../../styles/pages.css'
import SelectDropdown from '../../components/SelectDropdown.tsx'

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
}

export default function MarketplacePage({ workspaceId }: MarketplacePageProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [selectedListing, setSelectedListing] = useState<MarketplaceListingRow | null>(null)
  const [showMine, setShowMine] = useState(false)
  const [isPostOpen, setIsPostOpen] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<FilterType>('Total Station')
  const [newCondition, setNewCondition] = useState('Good')
  const [newPrice, setNewPrice] = useState<number>(0)
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newSeller, setNewSeller] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSpecs, setNewSpecs] = useState('')

  const [listingState, setListingState] = useState<MarketplaceListingRow[]>([])

  const fetchListings = useCallback(async () => {
    try {
      setFetchError(null)
      const data = await listMarketplaceListings(workspaceId)
      setListingState(data)
    } catch (err: any) {
      setFetchError(err.message ?? 'Failed to load listings')
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

  const clearMarketplaceFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setShowMine(false)
  }

  const resetPostForm = () => {
    setNewName('')
    setNewType('Total Station')
    setNewCondition('Good')
    setNewPrice(0)
    setNewCurrency('USD')
    setNewSeller('')
    setNewLocation('')
    setNewDesc('')
    setNewSpecs('')
    setPostError(null)
  }

  const submitPostListing = async () => {
    if (!newName.trim() || !newLocation.trim() || !newSeller.trim()) {
      setPostError('Name, seller/provider, and location are required.')
      return
    }
    if (!newDesc.trim()) {
      setPostError('Please add a short description.')
      return
    }
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      setPostError('Enter a valid price.')
      return
    }

    try {
      const payload: Omit<MarketplaceListingInsert, 'workspace_id'> = {
        name: newName.trim(),
        type: newType,
        condition: newCondition,
        price: Number(newPrice),
        currency: newCurrency.trim() || 'USD',
        seller: newSeller.trim(),
        location: newLocation.trim(),
        description: newDesc.trim() || null,
        specs: newSpecs.split(',').map(s => s.trim()).filter(Boolean),
      }
      const created = await createMarketplaceListing(workspaceId, payload)
      setListingState(prev => [created, ...prev])
      setIsPostOpen(false)
      resetPostForm()
    } catch (err: any) {
      setPostError(err.message ?? 'Failed to save listing')
    }
  }

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
      <header className="page-header mkt-header">
        <div>
          <h1>Instruments &amp; Calibration</h1>
          <p className="page-subtitle">Buy, sell and calibrate survey instruments across Zimbabwe</p>
        </div>
        <div className="header-actions">
          <button className={`btn btn-outline ${showMine ? 'active' : ''}`} onClick={() => setShowMine(v => !v)}>{showMine ? 'Viewing My Listings' : 'My Listings'}</button>
          <button className="btn btn-primary" onClick={() => { resetPostForm(); setIsPostOpen(true) }}>+ Post Listing</button>
        </div>
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

      {isPostOpen && (
        <div className="mkt-modal-overlay" onClick={() => setIsPostOpen(false)}>
          <div className="mkt-modal mkt-post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mkt-modal-header">
              <span className="mkt-modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              </span>
              <div>
                <h2 className="mkt-modal-title">Post Listing</h2>
                <p className="mkt-modal-type">Add an instrument or calibration service</p>
              </div>
              <button className="mkt-modal-close" onClick={() => setIsPostOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mkt-post-grid">
              <input className="input-field" placeholder="Listing title" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <SelectDropdown
                className="input-field mkt-post-select"
                value={newType}
                onChange={(val) => setNewType(val as FilterType)}
                options={[
                  { value: 'Total Station', label: 'Total Station' },
                  { value: 'GNSS Receiver', label: 'GNSS Receiver' },
                  { value: 'Digital Level', label: 'Digital Level' },
                  { value: 'UAV / Drone', label: 'UAV / Drone' },
                  { value: 'Controller', label: 'Controller' },
                  { value: 'Calibration Service', label: 'Calibration Service' }
                ]}
              />
              <SelectDropdown
                className="input-field mkt-post-select"
                value={newCondition}
                onChange={(val) => setNewCondition(val)}
                options={[
                  { value: 'New', label: 'New' },
                  { value: 'Like New', label: 'Like New' },
                  { value: 'Good', label: 'Good' },
                  { value: 'Fair', label: 'Fair' },
                  { value: 'Service', label: 'Service' }
                ]}
              />
              <input type="number" className="input-field" placeholder="Price" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
              <input className="input-field" placeholder="Currency (e.g. USD)" value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} />
              <input className="input-field" placeholder="Seller / Provider" value={newSeller} onChange={(e) => setNewSeller(e.target.value)} />
            </div>
            <textarea className="mkt-post-textarea" placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <input className="input-field" placeholder="Specs (comma-separated)" value={newSpecs} onChange={(e) => setNewSpecs(e.target.value)} />
            {postError && <div className="mkt-post-error">{postError}</div>}
            <div className="mkt-modal-actions">
              <button className="btn btn-primary" onClick={submitPostListing}>Post</button>
              <button className="btn btn-outline" onClick={() => setIsPostOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
              <button className="btn btn-primary">
                {selectedListing.condition === 'Service' ? 'Request Calibration' : 'Contact Seller'}
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedListing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Table */}
      <div className="card mkt-table-card">
        <table className="invoice-table mkt-table">
          <thead>
            <tr>
              <th className="mkt-col-item">INSTRUMENT</th>
              <th className="mkt-col-condition">CONDITION</th>
              <th className="mkt-col-price">PRICE</th>
              <th className="mkt-col-location">LOCATION</th>
              <th className="mkt-col-seller">SELLER</th>
              <th className="mkt-col-menu"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
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
                <td className="mkt-cell-condition">
                  <span className={`badge ${conditionBadge[l.condition]}`}>{l.condition}</span>
                </td>
                <td className="mkt-cell-price">
                  <div className="mkt-price">
                    <span className="mkt-price-val">${l.price.toLocaleString()}</span>
                    <span className="mkt-price-currency">{l.currency}</span>
                  </div>
                </td>
                <td className="mkt-cell-location">{l.location}</td>
                <td className="mkt-cell-seller">
                  <div className="mkt-seller">
                    <span className="mkt-seller-name">{l.seller}</span>
                    <span className="mkt-seller-posted">{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="mkt-cell-menu">
                  <button className="mkt-row-menu-btn" onClick={(e) => e.stopPropagation()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length === 0 && (
          <div className="mkt-empty-state">
            <h3>No listings found</h3>
            <p>Try adjusting your search criteria or clear filters.</p>
            <button className="btn btn-outline btn-sm" onClick={clearMarketplaceFilters}>Clear filters</button>
          </div>
        )}
      </div>
    </div>
  )
}
