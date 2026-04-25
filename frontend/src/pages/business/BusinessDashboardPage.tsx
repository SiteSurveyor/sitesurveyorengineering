import { useState, useEffect } from "react";
import "../../styles/pages.css";
import "../../styles/project-hub.css";
import { listProjects, type ProjectWithOrg } from "../../lib/repositories/projects.ts";
import { listInvoices, type InvoiceWithDetails } from "../../lib/repositories/invoices.ts";

interface BusinessDashboardPageProps {
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

const dispatchBoard = [
  {
    time: "07:30",
    team: "Crew Alpha",
    task: "Control points setup",
    location: "Harare Ring Road",
  },
  {
    time: "09:00",
    team: "Crew Delta",
    task: "As-built verification",
    location: "Borrowdale Pump Station",
  },
  {
    time: "13:30",
    team: "UAV Unit",
    task: "Flight block capture",
    location: "Bulawayo Industrial Corridor",
  },
] as const;

const teamUpdates = [
  "2 new invitations are pending acceptance",
  "Crew Bravo uploaded yesterday's field logs",
  "Calibration due this week for 1 GNSS base and 1 total station",
  "Finance approved 3 project expense claims this morning",
] as const;

export default function BusinessDashboardPage({
  userName,
  workspaceId,
}: BusinessDashboardPageProps) {
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

  const kpis = [
    {
      label: "Active Projects",
      value: activeProjectsCount.toString(),
      subtext: `${projects.length} total projects`,
      accent: "var(--accent)",
    },
    {
      label: "Dispatches Today",
      value: "0",
      subtext: "0 awaiting confirmation",
      accent: "#3b82f6",
    },
    {
      label: "Outstanding Billing",
      value: `$${pendingInvoicesTotal.toLocaleString()}`,
      subtext: `${pendingInvoices.length} invoices overdue`,
      accent: "#f59e0b",
    },
    {
      label: "Asset Availability",
      value: "--",
      subtext: "Tracking disabled",
      accent: "#22c55e",
    },
  ];

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
            className="hub-account-badge business"
            style={{ marginBottom: "10px" }}
          >
            Business account
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
            Manage company operations from one place — dispatch crews, monitor
            active projects, track billing, and coordinate assets across your
            workspace.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-outline"
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
            Weekly Report
          </button>
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
            New Dispatch
          </button>
        </div>
      </header>

      <div className="invoice-summary-row" style={{ marginBottom: "32px" }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="invoice-summary-card"
            style={{ borderLeftColor: kpi.accent }}
          >
            <span className="invoice-summary-label">{kpi.label}</span>
            <span className="invoice-summary-value" style={{ fontSize: "30px" }}>
              {kpi.value}
            </span>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "var(--text)",
              }}
            >
              {kpi.subtext}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
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
              <h2 style={{ fontSize: "16px", margin: 0 }}>Operations Overview</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {projects.slice(0, 3).map((project, index) => (
                <div
                  key={project.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px",
                    borderBottom:
                      index === Math.min(projects.length, 3) - 1
                        ? "none"
                        : "1px solid var(--border)",
                    alignItems: "center",
                    gap: "12px",
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

                  <span className="status-badge" style={project.status === 'completed' ? { background: "#dcfce7", color: "#15803d" } : { background: "#dbeafe", color: "#1d4ed8" }}>
                    {project.status === 'completed' ? 'Completed' : 'Active'}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <div style={{ padding: "16px", color: "var(--text)", fontSize: "14px" }}>
                  No recent operations found.
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
              Open Operations Workspace
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
              <h2 style={{ fontSize: "16px", margin: 0 }}>Team Activity</h2>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                padding: "16px",
              }}
            >
              {teamUpdates.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    fontSize: "13px",
                    color: "var(--text-h)",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "var(--accent)",
                      marginTop: "6px",
                      flexShrink: 0,
                    }}
                  />
                  <span>{item}</span>
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
                Dispatch Board
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
              {dispatchBoard.map((assignment, index) => (
                <div key={`${assignment.team}-${index}`} style={{ display: "flex", gap: "12px" }}>
                  <div
                    style={{
                      color: index === 0 ? "var(--accent)" : "var(--text)",
                      fontWeight: index === 0 ? 700 : 600,
                      fontSize: "13px",
                      paddingTop: "2px",
                      minWidth: "54px",
                    }}
                  >
                    {assignment.time}
                  </div>

                  <div
                    style={{
                      background: "#fff",
                      border:
                        index === 0
                          ? "1px solid #e0d4fc"
                          : "1px solid var(--border)",
                      padding: "12px",
                      borderRadius: "8px",
                      flex: 1,
                      boxShadow:
                        index === 0
                          ? "0 1px 2px rgba(139, 92, 246, 0.05)"
                          : "none",
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
                      {assignment.team}
                    </div>
                    <div style={{ color: "var(--text)", fontSize: "12px" }}>
                      {assignment.task}
                    </div>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      {assignment.location}
                    </div>
                  </div>
                </div>
              ))}
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
              Open Dispatch Planner
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
                Resource Snapshot
              </h2>
            </div>

            <div
              style={{
                padding: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    color: "var(--text)",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  Team Capacity
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--text-h)",
                  }}
                >
                  36
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  active field staff
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    color: "var(--text)",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  Ready Assets
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--text-h)",
                  }}
                >
                  21
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  available for deployment
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    color: "var(--text)",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  Quotes Pipeline
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--text-h)",
                  }}
                >
                  6
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  awaiting approval
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    color: "var(--text)",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  SG Submissions
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--text-h)",
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  pending lodgement
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
