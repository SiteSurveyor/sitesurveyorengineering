import { useEffect, useMemo, useState, useCallback, type DragEvent } from 'react'
import {
  listJobAssignments,
  createJobAssignment,
  updateJobAssignment,
  replaceAssignmentMembers,
  replaceAssignmentAssets,
  deleteJobAssignment,
} from '../../lib/repositories/jobAssignments.ts'
import type { AssignmentWithDetails } from '../../lib/repositories/jobAssignments.ts'
import {
  listWorkspaceMembers,
} from '../../lib/repositories/workspaceMembers.ts'
import type { WorkspaceMemberWithProfile } from '../../lib/repositories/workspaceMembers.ts'
import { listAssets } from '../../lib/repositories/assets.ts'
import type { AssetRow } from '../../lib/repositories/assets.ts'
import { listProjects } from '../../lib/repositories/projects.ts'
import type { ProjectWithOrg } from '../../lib/repositories/projects.ts'
import SelectDropdown from '../../components/SelectDropdown.tsx'
import '../../styles/pages.css'

interface DispatchPageProps {
  workspaceId: string
}

const clampDayIndex = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(4, Math.floor(value)))
}

const startOfWeekMonday = (d: Date) => {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = (day + 6) % 7
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - diff)
  return copy
}

const addDays = (d: Date, days: number) => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10)

const formatDayLabel = (d: Date) => {
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' })
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return `${day} ${date}`
}

const COLORS = ['#dbeafe', '#fef3c7', '#dcfce7', '#fce7f3', '#e0e7ff', '#fde68a', '#d1fae5', '#ede9fe']

export default function DispatchPage({ workspaceId }: DispatchPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [members, setMembers] = useState<WorkspaceMemberWithProfile[]>([])
  const [equipment, setEquipment] = useState<AssetRow[]>([])
  const [vehicles, setVehicles] = useState<AssetRow[]>([])
  const [projects, setProjects] = useState<ProjectWithOrg[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(2)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)

  const weekStart = useMemo(() => addDays(startOfWeekMonday(today), weekOffset * 7), [today, weekOffset])
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekLabels = useMemo(() => weekDays.map(d => formatDayLabel(d)), [weekDays])
  const weekDates = useMemo(() => weekDays.map(d => toIsoDate(d)), [weekDays])
  const todayIso = toIsoDate(today)
  const todayIndex = useMemo(() => {
    const idx = weekDays.findIndex(d => toIsoDate(d) === todayIso)
    return idx >= 0 ? idx : 2
  }, [todayIso, weekDays])

  useEffect(() => {
    if (weekOffset === 0) setSelectedDay(todayIndex)
  }, [todayIndex, weekOffset])

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [membersData, assetsData, projectsData, assignmentsData] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        listAssets(workspaceId),
        listProjects(workspaceId),
        listJobAssignments(workspaceId),
      ])
      setMembers(membersData)
      setEquipment(assetsData.filter(a => a.kind !== 'vehicle'))
      setVehicles(assetsData.filter(a => a.kind === 'vehicle'))
      setProjects(projectsData)
      setAssignments(assignmentsData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatch data')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const weekAssignments = useMemo(() => {
    return assignments.filter(a => weekDates.includes(a.assignment_date))
  }, [assignments, weekDates])

  const getAssignmentsForDay = useCallback((dayIndex: number) => {
    const date = weekDates[dayIndex]
    return weekAssignments.filter(a => a.assignment_date === date)
  }, [weekDates, weekAssignments])

  useEffect(() => {
    if (!selectedAssignmentId) return
    if (!weekAssignments.some(a => a.id === selectedAssignmentId)) setSelectedAssignmentId(null)
  }, [weekAssignments, selectedAssignmentId])

  const selectedAssignment = selectedAssignmentId ? weekAssignments.find(a => a.id === selectedAssignmentId) ?? null : null

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const equipmentMap = useMemo(() => new Map(equipment.map(e => [e.id, e])), [equipment])
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formError, setFormError] = useState<string | null>(null)

  const [draftProjectId, setDraftProjectId] = useState('')
  const [draftDay, setDraftDay] = useState(0)
  const [draftCrew, setDraftCrew] = useState<string[]>([])
  const [draftEquipment, setDraftEquipment] = useState<string[]>([])
  const [draftVehicle, setDraftVehicle] = useState('')
  const [_draftColor, setDraftColor] = useState('#eef2ff')
  const [draftNotes, setDraftNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const openCreate = (day = selectedDay) => {
    setFormError(null)
    setModalMode('create')
    setDraftProjectId('')
    setDraftDay(clampDayIndex(day))
    setDraftCrew([])
    setDraftEquipment([])
    setDraftVehicle('')
    setDraftColor(COLORS[assignments.length % COLORS.length])
    setDraftNotes('')
    setEditingId(null)
    setIsModalOpen(true)
  }

  const openEdit = (a: AssignmentWithDetails) => {
    setFormError(null)
    setModalMode('edit')
    setDraftProjectId(a.project_id ?? '')
    const dayIdx = weekDates.indexOf(a.assignment_date)
    setDraftDay(dayIdx >= 0 ? dayIdx : 0)
    setDraftCrew([...a.member_ids])
    setDraftEquipment([...a.asset_ids.filter(id => equipmentMap.has(id))])
    setDraftVehicle(a.asset_ids.find(id => vehicleMap.has(id)) ?? '')
    setDraftColor('#eef2ff')
    setDraftNotes(a.notes ?? '')
    setEditingId(a.id)
    setIsModalOpen(true)
  }

  const toggleDraftId = (kind: 'crew' | 'equipment', id: string) => {
    if (kind === 'crew') {
      setDraftCrew(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setDraftEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  const saveDraft = async () => {
    if (!draftProjectId) return setFormError('Project is required.')
    if (draftCrew.length === 0) return setFormError('Select at least one crew member.')

    setSaving(true)
    setFormError(null)
    try {
      const assignmentDate = weekDates[draftDay]
      const allAssetIds = [...draftEquipment]
      if (draftVehicle) allAssetIds.push(draftVehicle)

      if (modalMode === 'edit' && editingId) {
        await updateJobAssignment(editingId, {
          project_id: draftProjectId,
          assignment_date: assignmentDate,
          notes: draftNotes.trim() || null,
        })
        await replaceAssignmentMembers(workspaceId, editingId, draftCrew)
        await replaceAssignmentAssets(workspaceId, editingId, allAssetIds)
      } else {
        await createJobAssignment(
          workspaceId,
          {
            project_id: draftProjectId,
            assignment_date: assignmentDate,
            notes: draftNotes.trim() || null,
            status: 'confirmed',
          },
          draftCrew,
          allAssetIds,
        )
      }

      setIsModalOpen(false)
      setSelectedDay(draftDay)
      await fetchAll()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  const deleteSelected = async () => {
    if (!selectedAssignment) return
    const ok = window.confirm('Delete this assignment?')
    if (!ok) return
    try {
      await deleteJobAssignment(selectedAssignment.id)
      setSelectedAssignmentId(null)
      await fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment')
    }
  }

  const [draggingAssignmentId, setDraggingAssignmentId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<number | null>(null)

  const onDayDragOver = (dayIndex: number, e: DragEvent) => {
    e.preventDefault()
    setDragOverDay(dayIndex)
  }

  const onDayDrop = async (dayIndex: number, e: DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/dispatch-assignment')
    if (!id) return
    setDraggingAssignmentId(null)
    setDragOverDay(null)
    try {
      await updateJobAssignment(id, { assignment_date: weekDates[dayIndex] })
      setSelectedDay(clampDayIndex(dayIndex))
      setSelectedAssignmentId(id)
      await fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to move assignment')
    }
  }

  const getResourceBusy = (type: 'crew' | 'equip' | 'vehicle', id: string, dayIndex: number) => {
    const dayAssignments = getAssignmentsForDay(dayIndex)
    return dayAssignments.some(a =>
      type === 'crew' ? a.member_ids.includes(id) :
      a.asset_ids.includes(id)
    )
  }

  const conflictForDay = useMemo(() => {
    const build = (dayIndex: number) => {
      const byMember = new Map<string, number>()
      const byAsset = new Map<string, number>()
      const dayAssignments = getAssignmentsForDay(dayIndex)

      for (const a of dayAssignments) {
        for (const id of a.member_ids) byMember.set(id, (byMember.get(id) ?? 0) + 1)
        for (const id of a.asset_ids) byAsset.set(id, (byAsset.get(id) ?? 0) + 1)
      }

      const crewConflicts = new Set(Array.from(byMember.entries()).filter(([, count]) => count > 1).map(([id]) => id))
      const assetConflicts = new Set(Array.from(byAsset.entries()).filter(([, count]) => count > 1).map(([id]) => id))

      return { crewConflicts, assetConflicts }
    }

    return {
      selected: build(selectedDay),
      byDay: Array.from({ length: 5 }, (_, i) => build(i)),
    }
  }, [selectedDay, getAssignmentsForDay])

  if (loading) {
    return (
      <div className="hub-body">
        <p style={{ padding: '2rem' }}>Loading dispatch board...</p>
      </div>
    )
  }

  return (
    <div className="hub-body">
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

      <header className="page-header" style={{ padding: 0, marginBottom: '24px' }}>
        <div>
          <h1>Dispatch Board</h1>
          <p className="page-subtitle">Assign crews, equipment, and vehicles to active projects</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => setWeekOffset(v => v - 1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Prev Week
          </button>
          <button className="btn btn-outline" onClick={() => setWeekOffset(0)}>Today</button>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
            Week of {weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="btn btn-outline" onClick={() => setWeekOffset(v => v + 1)}>
            Next Week
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="btn btn-primary" onClick={() => openCreate(selectedDay)}>+ New Assignment</button>
        </div>
      </header>

      <div className="dispatch-layout">
        <div className="dispatch-calendar">
          <div className="dispatch-week-header">
            {weekLabels.map((day, i) => (
              <button
                key={day}
                className={`dispatch-day-label ${i === todayIndex ? 'today' : ''} ${i === selectedDay ? 'selected' : ''}`}
                onClick={() => setSelectedDay(i)}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="dispatch-week-body">
            {weekLabels.map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={`dispatch-day-col ${dayIndex === todayIndex ? 'today' : ''} ${dayIndex === selectedDay ? 'selected' : ''} ${dragOverDay === dayIndex ? 'drag-over' : ''}`}
                onDragOver={(e) => onDayDragOver(dayIndex, e)}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={(e) => onDayDrop(dayIndex, e)}
              >
                {getAssignmentsForDay(dayIndex).map(assignment => {
                  const conflicts = conflictForDay.byDay[dayIndex]
                  const hasConflict =
                    assignment.member_ids.some(id => conflicts.crewConflicts.has(id)) ||
                    assignment.asset_ids.some(id => conflicts.assetConflicts.has(id))
                  return (
                    <button
                      key={assignment.id}
                      className={`dispatch-card ${selectedAssignmentId === assignment.id ? 'selected' : ''} ${draggingAssignmentId === assignment.id ? 'dragging' : ''} ${hasConflict ? 'conflict' : ''}`}
                      style={{ background: COLORS[assignments.indexOf(assignment) % COLORS.length] }}
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/dispatch-assignment', assignment.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingAssignmentId(assignment.id)
                      }}
                      onDragEnd={() => {
                        setDraggingAssignmentId(null)
                        setDragOverDay(null)
                      }}
                    >
                      {hasConflict && <span className="dispatch-conflict-dot" title="Conflict detected" aria-label="Conflict detected" />}
                      <span className="dispatch-card-project">{assignment.project_name ?? 'Untitled'}</span>
                      <span className="dispatch-card-client">{assignment.job_title ?? (assignment.notes ?? '')}</span>
                      <div className="dispatch-card-resources">
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {assignment.member_ids.length}
                        </span>
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>
                          {assignment.asset_ids.length}
                        </span>
                      </div>
                    </button>
                  )
                })}
                {getAssignmentsForDay(dayIndex).length === 0 && (
                  <div className="dispatch-empty">No dispatch</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="dispatch-sidebar">
          {selectedAssignment ? (
            <div className="dispatch-detail">
              <div className="dispatch-detail-header">
                <div>
                  <h3>{selectedAssignment.project_name ?? 'Untitled'}</h3>
                  <span className="page-subtitle">{selectedAssignment.job_title ?? ''} · {weekLabels[weekDates.indexOf(selectedAssignment.assignment_date)] ?? selectedAssignment.assignment_date}</span>
                </div>
                <div className="dispatch-detail-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(selectedAssignment)}>Edit</button>
                  <button className="btn btn-outline btn-sm" onClick={deleteSelected}>Delete</button>
                </div>
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Assigned Crew</span>
                {selectedAssignment.member_ids.map(id => {
                  const member = memberMap.get(id)
                  const dayIdx = weekDates.indexOf(selectedAssignment.assignment_date)
                  const conflict = dayIdx >= 0 && conflictForDay.byDay[dayIdx]?.crewConflicts.has(id)
                  return member ? (
                    <div key={id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{member.full_name ?? member.work_email ?? 'Unknown'}</span>
                      <span className={`dispatch-resource-role ${conflict ? 'conflict' : ''}`}>{conflict ? 'Conflict' : member.role}</span>
                    </div>
                  ) : null
                })}
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Equipment</span>
                {selectedAssignment.asset_ids.filter(id => equipmentMap.has(id)).map(id => {
                  const eq = equipmentMap.get(id)!
                  const dayIdx = weekDates.indexOf(selectedAssignment.assignment_date)
                  const conflict = dayIdx >= 0 && conflictForDay.byDay[dayIdx]?.assetConflicts.has(id)
                  return (
                    <div key={id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{eq.name}</span>
                      <span className={`dispatch-resource-role ${conflict ? 'conflict' : ''}`}>{conflict ? 'Conflict' : eq.kind}</span>
                    </div>
                  )
                })}
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Vehicles</span>
                {selectedAssignment.asset_ids.filter(id => vehicleMap.has(id)).map(id => {
                  const v = vehicleMap.get(id)!
                  const dayIdx = weekDates.indexOf(selectedAssignment.assignment_date)
                  const conflict = dayIdx >= 0 && conflictForDay.byDay[dayIdx]?.assetConflicts.has(id)
                  return (
                    <div key={id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{v.name}</span>
                      <span className={`dispatch-resource-role ${conflict ? 'conflict' : ''}`}>{conflict ? 'Conflict' : v.serial_number ?? ''}</span>
                    </div>
                  )
                })}
              </div>

              {selectedAssignment.notes && (
                <div className="dispatch-detail-section">
                  <span className="dispatch-section-label">Notes</span>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>{selectedAssignment.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="dispatch-pool">
              <div className="dispatch-pool-head">
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-h)' }}>Resource Pool</h3>
                <button className="btn btn-outline btn-sm" onClick={() => openCreate(selectedDay)}>New</button>
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Crew Members</span>
                {members.map(c => {
                  const busy = getResourceBusy('crew', c.id, selectedDay)
                  const conflict = conflictForDay.selected.crewConflicts.has(c.id)
                  return (
                    <div key={c.id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{c.full_name ?? c.work_email ?? 'Unknown'}</span>
                      <span className={`dispatch-avail ${conflict ? 'conflict' : busy ? 'busy' : 'free'}`}>{conflict ? 'Conflict' : busy ? 'Deployed' : 'Available'}</span>
                    </div>
                  )
                })}
                {members.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text)' }}>No team members yet.</p>}
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Equipment</span>
                {equipment.map(eq => {
                  const busy = getResourceBusy('equip', eq.id, selectedDay) || eq.status === 'maintenance'
                  const conflict = conflictForDay.selected.assetConflicts.has(eq.id)
                  return (
                    <div key={eq.id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{eq.name}</span>
                      <span className={`dispatch-avail ${eq.status === 'maintenance' ? 'calib' : conflict ? 'conflict' : busy ? 'busy' : 'free'}`}>
                        {eq.status === 'maintenance' ? 'Maintenance' : conflict ? 'Conflict' : busy ? 'Deployed' : 'Available'}
                      </span>
                    </div>
                  )
                })}
                {equipment.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text)' }}>No equipment yet.</p>}
              </div>

              <div className="dispatch-detail-section">
                <span className="dispatch-section-label">Vehicles</span>
                {vehicles.map(v => {
                  const busy = getResourceBusy('vehicle', v.id, selectedDay) || v.status === 'maintenance'
                  const conflict = conflictForDay.selected.assetConflicts.has(v.id)
                  return (
                    <div key={v.id} className="dispatch-resource-row">
                      <span className="dispatch-resource-name">{v.name} {v.serial_number ? <span style={{ color: 'var(--text)', fontSize: '11px' }}>({v.serial_number})</span> : null}</span>
                      <span className={`dispatch-avail ${v.status === 'maintenance' ? 'calib' : conflict ? 'conflict' : busy ? 'busy' : 'free'}`}>
                        {v.status === 'maintenance' ? 'In Service' : conflict ? 'Conflict' : busy ? 'Deployed' : 'Available'}
                      </span>
                    </div>
                  )
                })}
                {vehicles.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text)' }}>No vehicles yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="dispatch-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="dispatch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dispatch-modal-header">
              <h3>{modalMode === 'edit' ? 'Edit Assignment' : 'New Assignment'}</h3>
              <button className="dispatch-modal-close" onClick={() => setIsModalOpen(false)}>Close</button>
            </div>

            <div className="dispatch-modal-grid">
              <div className="form-group">
                <label>Project</label>
                <SelectDropdown
                  className="input-field"
                  value={draftProjectId}
                  onChange={(val) => setDraftProjectId(val)}
                  options={[
                    { value: "", label: "Select project" },
                    ...projects.map(p => ({ value: p.id, label: `${p.name}${p.organization_name ? ` — ${p.organization_name}` : ''}` }))
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Day</label>
                <SelectDropdown
                  className="input-field"
                  value={draftDay.toString()}
                  onChange={(val) => setDraftDay(clampDayIndex(Number(val) || 0))}
                  options={weekLabels.map((label, i) => ({ value: i.toString(), label }))}
                />
              </div>
              <div className="form-group">
                <label>Vehicle</label>
                <SelectDropdown
                  className="input-field"
                  value={draftVehicle}
                  onChange={(val) => setDraftVehicle(val)}
                  options={[
                    { value: "", label: "None" },
                    ...vehicles.map(v => ({ value: v.id, label: `${v.name}${v.serial_number ? ` (${v.serial_number})` : ''}` }))
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  className="input-field"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="dispatch-modal-picks">
              <div className="dispatch-modal-pick">
                <div className="dispatch-modal-pick-head">
                  <strong>Crew</strong>
                  <span>{draftCrew.length} selected</span>
                </div>
                <div className="dispatch-modal-pill-grid">
                  {members.map(m => (
                    <button
                      key={m.id}
                      className={`dispatch-pill ${draftCrew.includes(m.id) ? 'active' : ''}`}
                      onClick={() => toggleDraftId('crew', m.id)}
                      type="button"
                    >
                      {m.full_name ?? m.work_email ?? 'Unknown'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dispatch-modal-pick">
                <div className="dispatch-modal-pick-head">
                  <strong>Equipment</strong>
                  <span>{draftEquipment.length} selected</span>
                </div>
                <div className="dispatch-modal-pill-grid">
                  {equipment.map(eq => (
                    <button
                      key={eq.id}
                      className={`dispatch-pill ${draftEquipment.includes(eq.id) ? 'active' : ''}`}
                      onClick={() => toggleDraftId('equipment', eq.id)}
                      type="button"
                    >
                      {eq.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formError && <div className="dispatch-modal-error">{formError}</div>}

            <div className="dispatch-modal-actions">
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDraft} disabled={saving}>
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
