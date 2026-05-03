import { useEffect, useMemo, useState, useCallback } from "react";
import {
  listJobEvents,
  createJobEvent,
  updateJobEvent,
  deleteJobEvent,
} from "../../lib/repositories/jobEvents.ts";
import type { JobEventRow } from "../../lib/repositories/jobEvents.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import "../../styles/pages.css";

const TYPE_COLORS: Record<string, string> = {
  boundary: "#dbeafe",
  topo: "#dcfce7",
  construction: "#fef3c7",
  pegging: "#f3e8ff",
  other: "#f1f5f9",
};

const TYPE_LABELS: Record<string, string> = {
  boundary: "Boundary Survey",
  topo: "Topographic",
  construction: "Construction",
  pegging: "Stand Pegging",
  other: "Other",
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TypeFilter = "all" | "boundary" | "topo" | "construction" | "pegging" | "other";

const startOfWeekMonday = (d: Date) => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
};

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

interface SchedulePageProps {
  workspaceId: string;
}

export default function SchedulePage({ workspaceId }: SchedulePageProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = toIsoDate(today);

  const [events, setEvents] = useState<JobEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    id: "",
    title: "",
    location: "",
    event_date: todayStr,
    start_time: "08:00",
    event_type: "other",
    notes: "",
  });

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await listJobEvents(workspaceId);
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const weekStart = useMemo(
    () => addDays(startOfWeekMonday(today), weekOffset * 7),
    [today, weekOffset],
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(weekStart, i))),
    [weekStart],
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (!q) return true;
      return [e.title, e.location ?? "", e.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [events, search, typeFilter]);

  const selectedEvent = selectedEventId
    ? (events.find((e) => e.id === selectedEventId) ?? null)
    : null;

  const openCreate = (defaultDate?: string) => {
    setModalMode("create");
    setFormError(null);
    setDraft({
      id: "",
      title: "",
      location: "",
      event_date: defaultDate ?? todayStr,
      start_time: "08:00",
      event_type: "other",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (ev: JobEventRow) => {
    setModalMode("edit");
    setFormError(null);
    setDraft({
      id: ev.id,
      title: ev.title,
      location: ev.location ?? "",
      event_date: ev.event_date,
      start_time: ev.start_time ?? "08:00",
      event_type: ev.event_type,
      notes: ev.notes ?? "",
    });
    setIsModalOpen(true);
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!draft.event_date || !draft.start_time) {
      setFormError("Date and time are required.");
      return;
    }
    setFormError(null);

    try {
      if (modalMode === "edit" && draft.id) {
        await updateJobEvent(draft.id, {
          title: draft.title.trim(),
          location: draft.location.trim() || null,
          event_date: draft.event_date,
          start_time: draft.start_time,
          event_type: draft.event_type,
          notes: draft.notes.trim() || null,
        });
        setSelectedEventId(draft.id);
      } else {
        const created = await createJobEvent(workspaceId, {
          title: draft.title.trim(),
          location: draft.location.trim() || null,
          event_date: draft.event_date,
          start_time: draft.start_time,
          event_type: draft.event_type,
          notes: draft.notes.trim() || null,
        });
        setSelectedEventId(created.id);
      }
      setIsModalOpen(false);
      await fetchEvents();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteJobEvent(selectedEvent.id);
      setSelectedEventId(null);
      await fetchEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  if (loading) {
    return (
      <div className="hub-body">
        <p style={{ padding: "2rem" }}>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="hub-body">
      {error && (
        <div
          style={{
            background: "var(--danger-bg, #fee)",
            color: "var(--danger, #c00)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <header
        className="page-header"
        style={{ padding: 0, marginBottom: "14px" }}
      >
        <div>
          <h1>My Schedule</h1>
          <p className="page-subtitle">
            Weekly site visits, lodgements, and appointments
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => openCreate()}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Event
          </button>
        </div>
      </header>

      <div className="schedule-toolbar">
        <div className="schedule-nav">
          <button
            className="btn btn-outline btn-sm schedule-nav-btn"
            onClick={() => setWeekOffset((v) => v - 1)}
          >
            Prev
          </button>
          <button
            className="btn btn-outline btn-sm schedule-nav-btn"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button
            className="btn btn-outline btn-sm schedule-nav-btn"
            onClick={() => setWeekOffset((v) => v + 1)}
          >
            Next
          </button>
          <span className="schedule-week-label">
            Week of{" "}
            {new Date(weekDates[0]).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="schedule-filters">
          <input
            className="input-field schedule-search"
            placeholder="Search schedule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="schedule-type-pills">
            {(
              [
                "all",
                "boundary",
                "topo",
                "construction",
                "pegging",
                "other",
              ] as const
            ).map((t) => (
              <button
                key={t}
                className={`schedule-type-pill ${typeFilter === t ? "active" : ""}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <span className="schedule-result-count">
            {filteredEvents.length} event
            {filteredEvents.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="schedule-layout">
        <div className="schedule-week-strip">
          {weekDates.map((date, i) => {
            const dayEvents = filteredEvents
              .filter((e) => e.event_date === date)
              .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
            const isToday = date === todayStr;
            const dayNum = new Date(date).getDate();
            return (
              <div
                key={date}
                className={`schedule-day-cell ${isToday ? "today" : ""}`}
              >
                <div className="schedule-day-header">
                  <span className="schedule-day-name">{WEEK_DAYS[i]}</span>
                  <span
                    className={`schedule-day-num ${isToday ? "today" : ""}`}
                  >
                    {dayNum}
                  </span>
                </div>
                <div className="schedule-day-events">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      className={`schedule-event-chip ${selectedEventId === ev.id ? "selected" : ""}`}
                      style={{
                        background: TYPE_COLORS[ev.event_type] ?? TYPE_COLORS.other,
                      }}
                      onClick={() => setSelectedEventId(ev.id)}
                    >
                      <span className="schedule-event-time">
                        {ev.start_time ?? ""}
                      </span>
                      <span className="schedule-event-title">{ev.title}</span>
                    </button>
                  ))}
                  {dayEvents.length === 0 && (
                    <span className="schedule-no-events">No events</span>
                  )}
                  <button
                    className="schedule-add-mini"
                    onClick={() => openCreate(date)}
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedEvent ? (
          <div className="schedule-detail card">
            <div
              className="schedule-detail-badge"
              style={{
                background:
                  TYPE_COLORS[selectedEvent.event_type] ?? TYPE_COLORS.other,
              }}
            >
              {TYPE_LABELS[selectedEvent.event_type] ?? selectedEvent.event_type}
            </div>
            <div className="schedule-detail-head">
              <div>
                <h2 className="schedule-detail-title">
                  {selectedEvent.title}
                </h2>
                <p className="page-subtitle schedule-detail-client">
                  {selectedEvent.location ?? ""}
                </p>
              </div>
              <div className="schedule-detail-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => openEdit(selectedEvent)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="schedule-detail-grid">
              <div className="schedule-detail-item">
                <span className="schedule-detail-label">Date</span>
                <span>{formatDate(selectedEvent.event_date)}</span>
              </div>
              <div className="schedule-detail-item">
                <span className="schedule-detail-label">Time</span>
                <span>{selectedEvent.start_time ?? "—"}</span>
              </div>
              <div className="schedule-detail-item">
                <span className="schedule-detail-label">Location</span>
                <span>{selectedEvent.location ?? "—"}</span>
              </div>
            </div>

            <div className="schedule-notes">
              <span className="schedule-detail-label">Notes</span>
              <p className="schedule-notes-text">
                {selectedEvent.notes ?? "No notes."}
              </p>
            </div>
          </div>
        ) : (
          <div className="schedule-detail card schedule-detail-empty">
            <div className="empty-state">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--border-heavy)"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>Select an Event</h3>
              <p>Click on any scheduled event to see details.</p>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="schedule-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3>{modalMode === "edit" ? "Edit Event" : "New Event"}</h3>
              <button
                className="schedule-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="schedule-modal-grid">
              <input
                className="input-field"
                placeholder="Title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <input
                className="input-field"
                placeholder="Location"
                value={draft.location}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, location: e.target.value }))
                }
              />
              <SelectDropdown
                className="input-field schedule-modal-select"
                value={draft.event_type}
                onChange={(val) =>
                  setDraft((prev) => ({
                    ...prev,
                    event_type: val,
                  }))
                }
                options={[
                  { value: "boundary", label: TYPE_LABELS.boundary },
                  { value: "topo", label: TYPE_LABELS.topo },
                  { value: "construction", label: TYPE_LABELS.construction },
                  { value: "pegging", label: TYPE_LABELS.pegging },
                  { value: "other", label: TYPE_LABELS.other }
                ]}
              />
              <input
                type="date"
                className="input-field"
                value={draft.event_date}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    event_date: e.target.value,
                  }))
                }
              />
              <input
                type="time"
                className="input-field"
                value={draft.start_time}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    start_time: e.target.value,
                  }))
                }
              />
            </div>
            <textarea
              className="schedule-modal-notes"
              placeholder="Notes"
              value={draft.notes}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
            {formError && (
              <div className="schedule-modal-error">{formError}</div>
            )}
            <div className="schedule-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveDraft}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
