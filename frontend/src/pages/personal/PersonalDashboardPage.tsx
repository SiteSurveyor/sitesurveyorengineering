import { useState, useEffect } from "react";
import "../../styles/pages.css";
import "../../styles/project-hub.css";
import { listProjects, type ProjectWithOrg } from "../../lib/repositories/projects.ts";
import { listInvoices, type InvoiceWithDetails } from "../../lib/repositories/invoices.ts";

interface PersonalDashboardPageProps {
  userName?: string;
  workspaceId: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getFirstName(name?: string): string {
  if (!name) return "there";
  const firstName = name.trim().split(/\s+/)[0];
  return firstName || "there";
}

export default function PersonalDashboardPage({
  userName,
  workspaceId,
}: PersonalDashboardPageProps) {
  const [projects, setProjects] = useState<ProjectWithOrg[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    Promise.all([
      listProjects(workspaceId).catch(() => []),
      listInvoices(workspaceId).catch(() => [])
    ]).then(([p, i]) => {
      setProjects(p);
      setInvoices(i);
    });
  }, [workspaceId]);

  const activeProjectsCount = projects.filter(p => p.status === 'active').length;
  const pendingInvoices = invoices.filter(i => i.status === 'draft' || i.status === 'sent' || i.status === 'overdue');
  const pendingInvoicesTotal = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="hub-body">
      <header
        className="page-header"
        style={{ padding: 0, marginBottom: "24px" }}
      >
        <div>
          <span
            className="hub-account-badge personal"
            style={{ marginBottom: "10px" }}
          >
            Personal account
          </span>
          <h1 style={{ fontSize: "22px", letterSpacing: "-0.4px", margin: 0 }}>
            {getGreeting()}, {getFirstName(userName)}
          </h1>
          <p className="page-subtitle" style={{ marginTop: "6px" }}>
            {currentDate}
          </p>
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: "13px",
              color: "var(--text)",
              maxWidth: "760px",
              lineHeight: 1.5,
            }}
          >
            Your personal dashboard is focused on your own schedule, projects,
            invoices, contacts, and field equipment so you can manage solo work
            efficiently.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
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
            Create Quote
          </button>
        </div>
      </header>

      <div className="invoice-summary-row" style={{ marginBottom: "32px" }}>
        <div
          className="invoice-summary-card"
          style={{ borderLeftColor: "var(--accent)" }}
        >
          <span className="invoice-summary-label">Open Projects</span>
          <span className="invoice-summary-value" style={{ fontSize: "32px" }}>
            {activeProjectsCount}
          </span>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "12px",
              color: "var(--text)",
            }}
          >
            {projects.length} total projects
          </p>
        </div>

        <div
          className="invoice-summary-card"
          style={{ borderLeftColor: "#f59e0b" }}
        >
          <span className="invoice-summary-label">Pending Invoices</span>
          <span className="invoice-summary-value" style={{ fontSize: "32px" }}>
            ${pendingInvoicesTotal.toLocaleString()}
          </span>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "12px",
              color: "var(--text)",
            }}
          >
            {pendingInvoices.length} invoices awaiting payment
          </p>
        </div>

        <div
          className="invoice-summary-card"
          style={{ borderLeftColor: "#22c55e" }}
        >
          <span className="invoice-summary-label">Next Calibration</span>
          <span
            className="invoice-summary-value"
            style={{ fontSize: "32px", color: "var(--text-h)" }}
          >
            -- Days
          </span>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "12px",
              color: "var(--text)",
            }}
          >
            No assets tracked
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card">
            <div
              className="card-header"
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: "16px", margin: 0 }}>Recent Projects</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {projects.slice(0, 3).map((project, idx) => (
                <div
                  key={project.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px",
                    borderBottom: idx < 2 ? "1px solid var(--border)" : "none",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        color: "var(--text-h)",
                        margin: "0 0 4px 0",
                      }}
                    >
                      {project.name}
                    </h3>
                    <span style={{ fontSize: "13px", color: "var(--text)" }}>
                      {project.organization_name || "Private Client"}
                    </span>
                  </div>
                  <span
                    className="status-badge"
                    style={
                      project.status === "completed"
                        ? { background: "#dcfce7", color: "#15803d" }
                        : { background: "#dbeafe", color: "#1d4ed8" }
                    }
                  >
                    {project.status === "completed" ? "Completed" : "Active"}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <div style={{ padding: "16px", color: "var(--text)", fontSize: "14px" }}>
                  No recent projects found.
                </div>
              )}
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "#f8fafc",
                border: "none",
                color: "var(--accent)",
                fontWeight: 600,
                cursor: "pointer",
                borderTop: "1px solid var(--border)",
                borderBottomLeftRadius: "12px",
                borderBottomRightRadius: "12px",
              }}
            >
              View All Projects
            </button>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: "16px", margin: 0 }}>Priority Tasks</h2>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "16px",
              }}
            >
              {[
                "Confirm boundary beacon coordinates for Stand 432",
                "Prepare invoice for Borrowdale topo deliverable",
                "Book calibration slot for Leica GS18 rover",
              ].map((task) => (
                <div
                  key={task}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-h)",
                      lineHeight: 1.5,
                    }}
                  >
                    {task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            className="card"
            style={{ background: "#f8f6ff", borderColor: "#e0d4fc" }}
          >
            <div
              className="card-header"
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid #e0d4fc",
              }}
            >
              <h2
                style={{ fontSize: "16px", margin: 0, color: "var(--accent)" }}
              >
                Today&apos;s Schedule
              </h2>
            </div>

            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "12px" }}>
                <div
                  style={{
                    color: "var(--accent)",
                    fontWeight: 700,
                    fontSize: "13px",
                    paddingTop: "2px",
                    minWidth: "50px",
                  }}
                >
                  08:00
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e0d4fc",
                    padding: "12px",
                    borderRadius: "8px",
                    flex: 1,
                    boxShadow: "0 1px 2px rgba(139, 92, 246, 0.05)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-h)",
                      fontSize: "14px",
                      marginBottom: "4px",
                    }}
                  >
                    Field Visit: Stand 432
                  </div>
                  <div style={{ color: "var(--text)", fontSize: "12px" }}>
                    Boundary verification and beacon check
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div
                  style={{
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: "13px",
                    paddingTop: "2px",
                    minWidth: "50px",
                  }}
                >
                  14:30
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--border)",
                    padding: "12px",
                    borderRadius: "8px",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-h)",
                      fontSize: "14px",
                      marginBottom: "4px",
                    }}
                  >
                    Client Call
                  </div>
                  <div style={{ color: "var(--text)", fontSize: "12px" }}>
                    Review draft subdivision sketch and next steps
                  </div>
                </div>
              </div>
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontWeight: 600,
                cursor: "pointer",
                borderTop: "1px solid #e0d4fc",
              }}
            >
              Open Full Schedule
            </button>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2 style={{ fontSize: "16px", margin: 0 }}>
                Equipment Snapshot
              </h2>
            </div>

            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text)" }}>
                  Leica GS18 GNSS Rover
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  Ready
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text)" }}>
                  Trimble S5 Total Station
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#b45309",
                  }}
                >
                  Service Soon
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text)" }}>
                  Field Tablet
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
