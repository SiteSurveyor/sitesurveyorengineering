import { useState, useEffect, useCallback } from "react";
import {
  archiveJob,
  createJob,
  listJobs,
  updateJob,
  type JobWithProject,
} from "../../lib/repositories/jobs.ts";
import { listProjects, type ProjectWithOrg } from "../../lib/repositories/projects.ts";
import { mapStatus } from "../../lib/mappers.ts";
import type { Database } from "../../lib/supabase/types.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import "../../styles/pages.css";

type JobStatus = Database["public"]["Enums"]["job_status"];

interface JobsPageProps {
  workspaceId: string;
  isPlatformAdmin?: boolean;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type JobFilter =
  | "all"
  | "Topographical"
  | "Cadastral"
  | "Engineering"
  | "Mining"
  | "Monitoring";

export default function JobsPage({
  workspaceId,
  isPlatformAdmin = false,
}: JobsPageProps) {
  const [jobs, setJobs] = useState<JobWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobEditorOpen, setJobEditorOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus>("planned");
  const [jobProjectId, setJobProjectId] = useState("");
  const [jobScheduledStart, setJobScheduledStart] = useState("");
  const [jobScheduledEnd, setJobScheduledEnd] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<JobFilter>("all");
  const [selectedJob, setSelectedJob] = useState<JobWithProject | null>(null);
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const data = await listJobs(workspaceId);
      setJobs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchProjects = useCallback(async () => {
    if (!isPlatformAdmin) return;
    try {
      const data = await listProjects(workspaceId);
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, [workspaceId, isPlatformAdmin]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const openCreateEditor = () => {
    setEditingJobId(null);
    setJobTitle("");
    setJobDescription("");
    setJobType("");
    setJobLocation("");
    setJobStatus("planned");
    setJobProjectId("");
    setJobScheduledStart("");
    setJobScheduledEnd("");
    setJobEditorOpen(true);
  };

  const openEditEditor = (job: JobWithProject) => {
    setEditingJobId(job.id);
    setJobTitle(job.title);
    setJobDescription(job.description ?? "");
    setJobType(job.job_type ?? "");
    setJobLocation(job.location ?? "");
    setJobStatus(job.status);
    setJobProjectId(job.project_id ?? "");
    setJobScheduledStart(toDatetimeLocal(job.scheduled_start));
    setJobScheduledEnd(toDatetimeLocal(job.scheduled_end));
    setJobEditorOpen(true);
    setSelectedJob(null);
  };

  const saveJobEditor = async () => {
    if (!jobTitle.trim()) {
      setError("Job title is required.");
      return;
    }
    setError(null);
    setSavingJob(true);
    try {
      const base = {
        title: jobTitle.trim(),
        description: jobDescription.trim() || null,
        job_type: jobType.trim() || null,
        location: jobLocation.trim() || null,
        status: jobStatus,
        project_id: jobProjectId || null,
        scheduled_start: fromDatetimeLocal(jobScheduledStart),
        scheduled_end: fromDatetimeLocal(jobScheduledEnd),
      };
      if (editingJobId) {
        await updateJob(editingJobId, base);
      } else {
        await createJob(workspaceId, base);
      }
      setJobEditorOpen(false);
      await fetchJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save job.");
    } finally {
      setSavingJob(false);
    }
  };

  const handleArchiveJob = async (id: string) => {
    if (!window.confirm("Archive this job? It will be hidden from the list.")) return;
    setError(null);
    try {
      await archiveJob(id);
      setSelectedJob(null);
      await fetchJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to archive job.");
    }
  };

  const filtered = jobs.filter((job) => {
    if (
      typeFilter !== "all" &&
      (job.job_type ?? "").toLowerCase() !== typeFilter.toLowerCase()
    )
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [job.title, job.project_name ?? "", job.location ?? "", job.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }
    return true;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status: string) => {
    const mapped = mapStatus(status);
    switch (mapped) {
      case "Planned":
      case "Scheduled":
        return "badge-green";
      case "In Progress":
        return "badge-yellow";
      case "Completed":
      case "Cancelled":
        return "badge-gray";
      default:
        return "badge-gray";
    }
  };

  if (loading) {
    return (
      <div className="hub-body mkt-body">
        <p style={{ padding: "2rem" }}>Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="hub-body mkt-body">
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
        style={{
          padding: 0,
          marginBottom: "24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <h1>Jobs</h1>
          <p className="page-subtitle">
            View field jobs, site visits, and survey assignments
          </p>
          {!isPlatformAdmin && (
            <p
              className="page-subtitle"
              style={{ fontSize: 13, marginTop: 8, opacity: 0.85 }}
            >
              Job listings are maintained by platform administrators.
            </p>
          )}
        </div>
        {isPlatformAdmin && (
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateEditor}
            >
              Add job
            </button>
          </div>
        )}
      </header>

      <div className="filter-bar">
        {(
          [
            "all",
            "Topographical",
            "Cadastral",
            "Engineering",
            "Mining",
            "Monitoring",
          ] as const
        ).map((f) => (
          <button
            key={f}
            className={`filter-chip ${typeFilter === f ? "active" : ""}`}
            onClick={() => setTypeFilter(f)}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
        <div className="filter-spacer" />
        <input
          className="search-input"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selectedJob && (
        <div className="mkt-modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="mkt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mkt-modal-header">
              <div
                className="mkt-modal-icon"
                style={{ background: "#e0e7ff", color: "#4f46e5" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <h2 className="mkt-modal-title">{selectedJob.title}</h2>
                <p className="mkt-modal-type">
                  {selectedJob.project_name ?? "No project"} &middot;{" "}
                  {selectedJob.location ?? "No location"}
                </p>
              </div>
              <button
                className="mkt-modal-close"
                onClick={() => setSelectedJob(null)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <span className={`badge ${getStatusClass(selectedJob.status)}`}>
                {mapStatus(selectedJob.status)}
              </span>
              {selectedJob.job_type && (
                <span className="badge badge-gray">{selectedJob.job_type}</span>
              )}
            </div>

            <p className="mkt-modal-desc">
              {selectedJob.description ?? "No description provided."}
            </p>

            <div className="mkt-modal-seller">
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Scheduled Start</span>
                <span className="mkt-seller-value">
                  {formatDate(selectedJob.scheduled_start)}
                </span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Scheduled End</span>
                <span className="mkt-seller-value">
                  {formatDate(selectedJob.scheduled_end)}
                </span>
              </div>
              <div className="mkt-seller-row">
                <span className="mkt-seller-label">Project</span>
                <span className="mkt-seller-value">
                  {selectedJob.project_name ?? "—"}
                </span>
              </div>
            </div>

            <div className="mkt-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </button>
              {isPlatformAdmin && selectedJob ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => openEditEditor(selectedJob)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleArchiveJob(selectedJob.id)}
                  >
                    Archive
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {jobEditorOpen && (
        <div
          className="billing-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !savingJob && setJobEditorOpen(false)}
        >
          <div
            className="billing-modal billing-modal--scrollable-form"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="billing-modal-header">
              <h3>{editingJobId ? "Edit job" : "Add job"}</h3>
              <button
                type="button"
                className="billing-modal-close"
                disabled={savingJob}
                onClick={() => setJobEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-body-scroll">
              <div className="billing-modal-grid billing-modal-form-single">
                <label className="form-label" htmlFor="job-editor-title">
                  Title
                </label>
                <input
                  id="job-editor-title"
                  className="input-field"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Job title"
                />
                <label className="form-label" htmlFor="job-editor-desc">
                  Description
                </label>
                <textarea
                  id="job-editor-desc"
                  className="input-field"
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Optional description"
                />
                <label className="form-label">Job type</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={jobType}
                  onChange={setJobType}
                  placeholder="Type"
                  options={[
                    { value: "", label: "—" },
                    { value: "Topographical", label: "Topographical" },
                    { value: "Cadastral", label: "Cadastral" },
                    { value: "Engineering", label: "Engineering" },
                    { value: "Mining", label: "Mining" },
                    { value: "Monitoring", label: "Monitoring" },
                  ]}
                />
                <label className="form-label" htmlFor="job-editor-location">
                  Location
                </label>
                <input
                  id="job-editor-location"
                  className="input-field"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="Optional"
                />
                <label className="form-label">Status</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={jobStatus}
                  onChange={(v) => setJobStatus(v as JobStatus)}
                  options={[
                    { value: "planned", label: "Planned" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "in_progress", label: "In progress" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
                <label className="form-label">Project (optional)</label>
                <SelectDropdown
                  className="input-field billing-history-select"
                  value={jobProjectId}
                  onChange={setJobProjectId}
                  options={[
                    { value: "", label: "No project" },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: p.name || "Untitled project",
                    })),
                  ]}
                />
                <label className="form-label" htmlFor="job-editor-start">
                  Scheduled start
                </label>
                <input
                  id="job-editor-start"
                  className="input-field"
                  type="datetime-local"
                  value={jobScheduledStart}
                  onChange={(e) => setJobScheduledStart(e.target.value)}
                />
                <label className="form-label" htmlFor="job-editor-end">
                  Scheduled end
                </label>
                <input
                  id="job-editor-end"
                  className="input-field"
                  type="datetime-local"
                  value={jobScheduledEnd}
                  onChange={(e) => setJobScheduledEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="billing-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={savingJob}
                onClick={() => setJobEditorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={savingJob}
                onClick={() => void saveJobEditor()}
              >
                {savingJob ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
        <table
          className="invoice-table"
          style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th
                style={{
                  padding: "16px 20px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                }}
              >
                JOB TITLE
              </th>
              <th
                className="hide-on-mobile"
                style={{
                  padding: "16px 8px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                }}
              >
                LOCATION
              </th>
              <th
                className="hide-on-mobile"
                style={{
                  padding: "16px 8px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                }}
              >
                SCHEDULED
              </th>
              <th
                style={{
                  padding: "16px 8px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                  textAlign: "right",
                }}
              >
                STATUS
              </th>
              <th style={{ padding: "16px 20px", width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((job) => {
              const statusLabel = mapStatus(job.status);
              const bgStatus =
                statusLabel === "Planned" || statusLabel === "Scheduled"
                  ? "#dcfce7"
                  : statusLabel === "In Progress"
                    ? "#fef9c3"
                    : "#f1f5f9";
              const textStatus =
                statusLabel === "Planned" || statusLabel === "Scheduled"
                  ? "#15803d"
                  : statusLabel === "In Progress"
                    ? "#a16207"
                    : "#475569";

              return (
                <tr
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td style={{ paddingLeft: "20px", paddingBlock: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#0f172a",
                          fontSize: "15px",
                        }}
                      >
                        {job.title}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#475569",
                            fontWeight: 500,
                          }}
                        >
                          {job.project_name ?? "No project"}
                        </span>
                        {job.job_type && (
                          <>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--text-h)",
                                opacity: 0.5,
                              }}
                            >
                              &bull;
                            </span>
                            <code
                              style={{
                                fontSize: "12px",
                                color: "#4f46e5",
                                fontWeight: 600,
                              }}
                            >
                              {job.job_type}
                            </code>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hide-on-mobile" style={{ padding: "16px 8px" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                        fontSize: "14px",
                      }}
                    >
                      {job.location ?? "—"}
                    </span>
                  </td>
                  <td className="hide-on-mobile" style={{ padding: "16px 8px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      {formatDate(job.scheduled_start)}
                      {job.scheduled_end
                        ? ` \u2013 ${formatDate(job.scheduled_end)}`
                        : ""}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", padding: "16px 8px" }}>
                    <span
                      style={{
                        background: bgStatus,
                        color: textStatus,
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      paddingRight: "20px",
                      paddingBlock: "16px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isPlatformAdmin ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => openEditEditor(job)}
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "default",
                          padding: "6px",
                          borderRadius: "6px",
                        }}
                        aria-hidden
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              padding: "64px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: "0 0 4px", color: "var(--text-h)" }}>
              No jobs found
            </h3>
            <p
              style={{ margin: 0, color: "var(--text)", fontSize: "13px" }}
            >
              {jobs.length === 0
                ? "No jobs available in the system yet."
                : "Try adjusting your search criteria."}
            </p>
          </div>
        )}
        {filtered.length > pageSize && (
          <div className="list-pagination">
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span className="list-pagination-label">Page {page} / {totalPages}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
