import { useState, useEffect } from "react";
import "../../styles/pages.css";
import "../../styles/project-hub.css";
import { listProjects, type ProjectWithOrg } from "../../lib/repositories/projects.ts";
import { listInvoices, type InvoiceWithDetails } from "../../lib/repositories/invoices.ts";
import { listCalibrations, listAssets } from "../../lib/repositories/assets.ts";
import { listJobEvents, type JobEventRow } from "../../lib/repositories/jobEvents.ts";
import { listQuotes } from "../../lib/repositories/quotes.ts";

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
  const [nextCalibrationDays, setNextCalibrationDays] = useState<number | null>(null);
  const [taskItems, setTaskItems] = useState<string[]>([]);
  const [todayEvents, setTodayEvents] = useState<JobEventRow[]>([]);
  const [assetSnapshot, setAssetSnapshot] = useState<
    { name: string; status: string; color: string }[]
  >([]);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    Promise.all([
      listProjects(workspaceId).catch(() => []),
      listInvoices(workspaceId).catch(() => []),
      listCalibrations(workspaceId).catch(() => []),
      listJobEvents(workspaceId).catch(() => []),
      listAssets(workspaceId).catch(() => []),
      listQuotes(workspaceId).catch(() => []),
    ]).then(([p, i, calibrations, events, assets, quotes]) => {
      setProjects(p);
      setInvoices(i);
      const upcomingCalibrations = calibrations
        .filter((item) => item.next_calibration_date)
        .sort((a, b) =>
          (a.next_calibration_date ?? "").localeCompare(b.next_calibration_date ?? ""),
        );
      if (upcomingCalibrations.length > 0) {
        const nextDate = new Date(upcomingCalibrations[0].next_calibration_date!);
        const dayDiff = Math.max(
          0,
          Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        setNextCalibrationDays(dayDiff);
      } else {
        setNextCalibrationDays(null);
      }

      const today = new Date().toISOString().slice(0, 10);
      setTodayEvents(events.filter((event) => event.event_date === today).slice(0, 2));

      const pendingInvoiceCount = i.filter(
        (invoice) =>
          invoice.status === "draft" ||
          invoice.status === "sent" ||
          invoice.status === "overdue",
      ).length;
      const activeProjectCount = p.filter((project) => project.status === "active").length;
      const sentQuotes = quotes.filter(
        (quote) => quote.status === "draft" || quote.status === "sent",
      ).length;
      const dueSoonCalibrations = upcomingCalibrations.filter((item) => {
        if (!item.next_calibration_date) return false;
        const due = new Date(item.next_calibration_date);
        const windowEnd = new Date();
        windowEnd.setDate(windowEnd.getDate() + 14);
        return due <= windowEnd;
      }).length;
      setTaskItems([
        `${activeProjectCount} active project${activeProjectCount === 1 ? "" : "s"} need tracking`,
        `${pendingInvoiceCount} pending invoice${pendingInvoiceCount === 1 ? "" : "s"} need follow-up`,
        `${sentQuotes} quote${sentQuotes === 1 ? "" : "s"} are waiting for client decision`,
        `${dueSoonCalibrations} calibration${dueSoonCalibrations === 1 ? "" : "s"} due within 14 days`,
      ]);

      setAssetSnapshot(
        assets.slice(0, 3).map((asset) => ({
          name: asset.name,
          status:
            asset.status === "available"
              ? "Ready"
              : asset.status === "maintenance"
                ? "Service Soon"
                : asset.status === "deployed"
                  ? "In Use"
                  : "Unavailable",
          color:
            asset.status === "available"
              ? "#15803d"
              : asset.status === "maintenance"
                ? "#b45309"
                : "#475569",
        })),
      );
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
          <span className="invoice-summary-value">{activeProjectsCount}</span>
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
          <span className="invoice-summary-value">
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
          <span className="invoice-summary-value" style={{ color: "var(--text-h)" }}>
            {nextCalibrationDays == null ? "-- Days" : `${nextCalibrationDays} Days`}
          </span>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "12px",
              color: "var(--text)",
            }}
          >
            {nextCalibrationDays == null ? "No calibration schedule found" : "until next calibration"}
          </p>
        </div>
      </div>

      <div className="project-dashboard-unified-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
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
                background: "var(--surface-muted)",
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
              {taskItems.map((task) => (
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
              {taskItems.length === 0 && (
                <div style={{ fontSize: "13px", color: "var(--text)" }}>
                  No priority tasks available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          <div
            className="card"
            style={{ background: "var(--surface-muted)", borderColor: "var(--accent-border)" }}
          >
            <div
              className="card-header"
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--accent-border)",
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
              {todayEvents.map((event, idx) => (
                <div key={event.id} style={{ display: "flex", gap: "12px" }}>
                  <div
                    style={{
                      color: idx === 0 ? "var(--accent)" : "var(--text)",
                      fontWeight: idx === 0 ? 700 : 600,
                      fontSize: "13px",
                      paddingTop: "2px",
                      minWidth: "50px",
                    }}
                  >
                    {event.start_time ? event.start_time.slice(0, 5) : "All day"}
                  </div>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: idx === 0 ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                      padding: "12px",
                      borderRadius: "8px",
                      flex: 1,
                      boxShadow: idx === 0 ? "0 1px 2px rgba(139, 92, 246, 0.05)" : "none",
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
                      {event.title}
                    </div>
                    <div style={{ color: "var(--text)", fontSize: "12px" }}>
                      {event.notes || event.event_type || "Scheduled activity"}
                    </div>
                  </div>
                </div>
              ))}
              {todayEvents.length === 0 && (
                <div style={{ color: "var(--text)", fontSize: "13px" }}>
                  No schedule events for today.
                </div>
              )}
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
                borderTop: "1px solid var(--accent-border)",
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
              {assetSnapshot.map((asset) => (
                <div
                  key={asset.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--text)" }}>
                    {asset.name}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: asset.color,
                    }}
                  >
                    {asset.status}
                  </span>
                </div>
              ))}
              {assetSnapshot.length === 0 && (
                <div style={{ fontSize: "13px", color: "var(--text)" }}>
                  No assets tracked yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
