import { useState, useEffect, useCallback } from "react";
import { listJobs } from "../../lib/repositories/jobs.ts";
import { mapStatus } from "../../lib/mappers.ts";
import type { JobWithProject } from "../../lib/repositories/jobs.ts";
import "../../styles/pages.css";

interface JobsPageProps {
  workspaceId: string;
}

type JobFilter =
  | "all"
  | "Topographical"
  | "Cadastral"
  | "Engineering"
  | "Mining"
  | "Monitoring";

export default function JobsPage({ workspaceId }: JobsPageProps) {
  const [jobs, setJobs] = useState<JobWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<JobFilter>("all");
  const [selectedJob, setSelectedJob] = useState<JobWithProject | null>(null);
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const data = await listJobs(workspaceId);
      setJobs(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
        style={{ padding: 0, marginBottom: "24px" }}
      >
        <div>
          <h1>Jobs</h1>
          <p className="page-subtitle">
            View field jobs, site visits, and survey assignments
          </p>
        </div>
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
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
                  <td style={{ padding: "16px 8px" }}>
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
                  <td style={{ padding: "16px 8px" }}>
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
                  >
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "6px",
                        borderRadius: "6px",
                      }}
                      className="hover-bg"
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
