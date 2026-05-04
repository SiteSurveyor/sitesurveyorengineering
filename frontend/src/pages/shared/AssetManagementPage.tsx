import { useState, useEffect, useCallback } from "react";
import "../../styles/project-hub.css";
import "../../styles/pages.css";
import { listAssets, createAsset, updateAsset, listCalibrations, listMaintenanceEvents, type AssetUpdate, type AssetInsert } from "../../lib/repositories/assets.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import WorkspaceUsageBanner from "../../components/WorkspaceUsageBanner.tsx";
import { mapAssetRowToInstrument, type UiInstrument } from "../../lib/mappers.ts";

/* ── Types ── */
type Instrument = UiInstrument;

interface AssetManagementPageProps {
  workspaceId: string;
}

/* Demo data removed — now fetched from Supabase */

/* ── Helpers ── */
function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calClass(days: number): string {
  if (days < 0) return "cal-overdue";
  if (days <= 30) return "cal-urgent";
  if (days <= 60) return "cal-warning";
  return "cal-ok";
}

function calLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d remaining`;
}

const statusClass: Record<string, string> = {
  Available: "ast-status-green",
  Deployed: "ast-status-blue",
  Maintenance: "ast-status-orange",
  Retired: "ast-status-gray",
};

type Tab = "register" | "calibration" | "deployments" | "maintenance";
type TypeFilter =
  | "all"
  | "Total Station"
  | "GNSS Receiver"
  | "Digital Level"
  | "UAV / Drone"
  | "Controller";

/* ── Component ── */
export default function AssetManagementPage({ workspaceId }: AssetManagementPageProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedAsset, setSelectedAsset] = useState<Instrument | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', kind: 'instrument' as const, category: '', make: '', model: '', serial_number: '', purchase_date: '', purchase_cost: '' });
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [assets, calibrations, maintenance] = await Promise.all([
        listAssets(workspaceId),
        listCalibrations(workspaceId),
        listMaintenanceEvents(workspaceId),
      ]);

      const calByAsset = new Map<string, typeof calibrations>();
      for (const c of calibrations) {
        const arr = calByAsset.get(c.asset_id) ?? [];
        arr.push(c);
        calByAsset.set(c.asset_id, arr);
      }

      const maintByAsset = new Map<string, typeof maintenance>();
      for (const m of maintenance) {
        const arr = maintByAsset.get(m.asset_id) ?? [];
        arr.push(m);
        maintByAsset.set(m.asset_id, arr);
      }

      setInstruments(
        assets.map((a) =>
          mapAssetRowToInstrument(
            a,
            calByAsset.get(a.id) ?? [],
            maintByAsset.get(a.id) ?? [],
          ),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setSaving(true);
    try {
      await createAsset(workspaceId, {
        name: createForm.name.trim(),
        kind: createForm.kind,
        category: createForm.category || null,
        make: createForm.make || null,
        model: createForm.model || null,
        serial_number: createForm.serial_number || null,
        purchase_date: createForm.purchase_date || null,
        purchase_cost: createForm.purchase_cost ? Number(createForm.purchase_cost) : null,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', kind: 'instrument', category: '', make: '', model: '', serial_number: '', purchase_date: '', purchase_cost: '' });
      await fetchAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (dbId: string, newStatus: string) => {
    try {
      await updateAsset(dbId, { status: newStatus as AssetUpdate["status"] });
      await fetchAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update asset.");
    }
  };

  const filtered = instruments.filter((inst) => {
    if (typeFilter !== "all" && inst.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [
        inst.name,
        inst.make,
        inst.model,
        inst.serial,
        inst.type,
        inst.assignedTo,
        inst.assignedProject,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }
    return true;
  });

  /* ── Summary Stats ── */
  const totalValue = instruments.reduce((s, i) => s + i.currentValue, 0);

  const deployed = instruments.filter((i) => i.status === "Deployed").length;
  const inMaintenance = instruments.filter(
    (i) => i.status === "Maintenance",
  ).length;
  const calibDue = instruments.filter((i) => {
    const d = daysUntil(i.nextCalibration);
    return d <= 30 && d !== 999;
  }).length;

  if (loading) {
    return (
      <div className="hub-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <p style={{ color: "var(--text)", fontSize: "14px" }}>Loading instruments...</p>
      </div>
    );
  }

  return (
    <>
      <div className="hub-body ast-body">
        {error && (
          <div style={{ padding: "12px 16px", background: "var(--surface-muted)", color: "#dc2626", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--text-h)",
                margin: 0,
                letterSpacing: "-0.4px",
              }}
            >
              My Instruments
            </h1>
            <p
              style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text)" }}
            >
              Track, calibrate and deploy your survey fleet
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-outline">Export Register</button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Add Instrument</button>
          </div>
        </div>

        <WorkspaceUsageBanner workspaceId={workspaceId} />

        {/* Overview Tiles */}
        <div className="invoice-summary-row">
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: "var(--accent)" }}
          >
            <span className="invoice-summary-label">Instruments</span>
            <span className="invoice-summary-value">{instruments.length}</span>
          </div>
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: "#22c55e" }}
          >
            <span className="invoice-summary-label">Fleet Value</span>
            <span className="invoice-summary-value">${totalValue.toLocaleString()}</span>
          </div>
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: "#8b5cf6" }}
          >
            <span className="invoice-summary-label">Utilisation</span>
            <span className="invoice-summary-value">
              {Math.round((deployed / instruments.length) * 100)}%
            </span>
          </div>
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: "#3b82f6" }}
          >
            <span className="invoice-summary-label">Deployed</span>
            <span className="invoice-summary-value" style={{ color: "#1d4ed8" }}>
              {deployed}
            </span>
          </div>
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: "#06b6d4" }}
          >
            <span className="invoice-summary-label">Available</span>
            <span className="invoice-summary-value" style={{ color: "#15803d" }}>
              {instruments.filter((i) => i.status === "Available").length}
            </span>
          </div>
          <div
            className="invoice-summary-card"
            style={{ borderLeftColor: calibDue > 0 ? "#ef4444" : "#f59e0b" }}
          >
            <span className="invoice-summary-label">Calibrations Due</span>
            <span
              className="invoice-summary-value"
              style={{ color: calibDue > 0 ? "#dc2626" : "var(--text-h)" }}
            >
              {calibDue}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="ast-tabs">
          <button
            className={`ast-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Register
          </button>
          <button
            className={`ast-tab ${activeTab === "calibration" ? "active" : ""}`}
            onClick={() => setActiveTab("calibration")}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
            </svg>
            Calibration
            {calibDue > 0 && <span className="ast-tab-badge">{calibDue}</span>}
          </button>
          <button
            className={`ast-tab ${activeTab === "deployments" ? "active" : ""}`}
            onClick={() => setActiveTab("deployments")}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="10" r="3" />
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
            </svg>
            Deployments
          </button>
          <button
            className={`ast-tab ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Maintenance
            {inMaintenance > 0 && (
              <span className="ast-tab-badge ast-tab-badge-warn">
                {inMaintenance}
              </span>
            )}
          </button>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <button
            className={`filter-chip ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-chip ${typeFilter === "Total Station" ? "active" : ""}`}
            onClick={() => setTypeFilter("Total Station")}
          >
            Total Stations
          </button>
          <button
            className={`filter-chip ${typeFilter === "GNSS Receiver" ? "active" : ""}`}
            onClick={() => setTypeFilter("GNSS Receiver")}
          >
            GNSS
          </button>
          <button
            className={`filter-chip ${typeFilter === "Digital Level" ? "active" : ""}`}
            onClick={() => setTypeFilter("Digital Level")}
          >
            Levels
          </button>
          <button
            className={`filter-chip ${typeFilter === "UAV / Drone" ? "active" : ""}`}
            onClick={() => setTypeFilter("UAV / Drone")}
          >
            Drones
          </button>
          <button
            className={`filter-chip ${typeFilter === "Controller" ? "active" : ""}`}
            onClick={() => setTypeFilter("Controller")}
          >
            Controllers
          </button>
          <div className="filter-spacer" />
          <input
            className="search-input"
            placeholder="Search instruments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ═══ TAB: Register ═══ */}
        {activeTab === "register" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: 'auto' }}>
            <table
              className="invoice-table"
              style={{ margin: 0, width: "100%", borderCollapse: "collapse", minWidth: "600px" }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th
                    style={{
                      padding: "16px 20px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text)",
                    }}
                  >
                    ASSET ID
                  </th>
                  <th
                    style={{
                      padding: "16px 8px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text)",
                    }}
                  >
                    EQUIPMENT
                  </th>
                  <th
                    style={{
                      padding: "16px 8px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text)",
                      textAlign: "center",
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    className="hide-on-mobile"
                    style={{
                      padding: "16px 8px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text)",
                    }}
                  >
                    LOCATION / ASSIGNMENT
                  </th>
                  <th
                    className="hide-on-mobile"
                    style={{
                      padding: "16px 8px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text)",
                    }}
                  >
                    NEXT CALIBRATION
                  </th>
                  <th style={{ padding: "16px 20px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inst) => {
                  const days = daysUntil(inst.nextCalibration);
                  const calCls = calClass(days);

                  return (
                    <tr
                      key={inst.id}
                      onClick={() => setSelectedAsset(inst)}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        borderBottom: "1px solid var(--border)",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "var(--table-row-hover-bg)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={{ paddingLeft: "20px", paddingBlock: "12px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--text-h)",
                              fontSize: "14.5px",
                            }}
                          >
                            {inst.id}
                          </span>
                          <code
                            style={{
                              fontSize: "12px",
                              color: "var(--text)",
                              marginTop: "2px",
                            }}
                          >
                            {inst.serial}
                          </code>
                        </div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-h)",
                              fontSize: "14px",
                            }}
                          >
                            {inst.name}
                          </span>
                          <span style={{ fontSize: "12.5px", color: "var(--text)" }}>
                            {inst.type}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <span
                          className={`ast-status ${statusClass[inst.status]}`}
                          style={{
                            display: "inline-block",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td className="hide-on-mobile" style={{ padding: "12px 8px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              color: "var(--text-h)",
                              fontWeight: 500,
                            }}
                          >
                            {inst.assignedTo || "—"}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text)" }}>
                            {inst.assignedProject}
                          </span>
                        </div>
                      </td>
                      <td className="hide-on-mobile" style={{ padding: "12px 8px" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--text-h)",
                              fontWeight: 600,
                            }}
                          >
                            {inst.nextCalibration || "—"}
                          </span>
                          {inst.nextCalibration && (
                            <span
                              className={calCls}
                              style={{
                                fontSize: "11.5px",
                                fontWeight: 600,
                                marginTop: "2px",
                              }}
                            >
                              {calLabel(days)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          paddingRight: "20px",
                          paddingBlock: "12px",
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text)",
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
                  No instruments found
                </h3>
                <p
                  style={{ margin: 0, color: "var(--text)", fontSize: "13px" }}
                >
                  Try adjusting your search criteria or clear filters.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Calibration ═══ */}
        {activeTab === "calibration" && (
          <div className="ast-cal-grid">
            {filtered
              .filter((i) => i.nextCalibration)
              .map((inst) => {
                const days = daysUntil(inst.nextCalibration);
                const cls = calClass(days);
                return (
                  <div
                    key={inst.id}
                    className={`card ast-cal-card ${cls}`}
                    onClick={() => setSelectedAsset(inst)}
                  >
                    <div className="ast-cal-top">
                      <div>
                        <h3 className="ast-cal-name">{inst.name}</h3>
                        <span className="ast-cal-type">{inst.type}</span>
                      </div>
                      <span className={`ast-cal-days ${cls}`}>
                        {calLabel(days)}
                      </span>
                    </div>
                    <div className="ast-cal-bar-track">
                      <div
                        className={`ast-cal-bar-fill ${cls}`}
                        style={{
                          width: `${Math.max(0, Math.min(100, ((180 - days) / 180) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="ast-cal-dates">
                      <span>Last: {inst.lastCalibration}</span>
                      <span>Next: {inst.nextCalibration}</span>
                    </div>
                    {inst.calibrationCert && (
                      <span className="ast-cal-cert">
                        Cert: {inst.calibrationCert}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* ═══ TAB: Deployments ═══ */}
        {activeTab === "deployments" && (
          <div className="ast-deploy-grid">
            {instruments
              .filter((i) => i.status === "Deployed")
              .map((inst) => (
                <div
                  key={inst.id}
                  className="card ast-deploy-card"
                  onClick={() => setSelectedAsset(inst)}
                >
                  <div className="ast-deploy-header">
                    <h3 className="ast-deploy-name">{inst.name}</h3>
                    <span className="ast-status ast-status-blue">Deployed</span>
                  </div>
                  <div className="ast-deploy-details">
                    <div className="ast-deploy-row">
                      <span className="ast-deploy-label">Crew</span>
                      <span className="ast-deploy-value">
                        {inst.assignedTo}
                      </span>
                    </div>
                    <div className="ast-deploy-row">
                      <span className="ast-deploy-label">Project</span>
                      <span className="ast-deploy-value">
                        {inst.assignedProject}
                      </span>
                    </div>
                    <div className="ast-deploy-row">
                      <span className="ast-deploy-label">Serial</span>
                      <span className="ast-deploy-value">
                        <code>{inst.serial}</code>
                      </span>
                    </div>
                  </div>
                  <div className="ast-deploy-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(inst.dbId, "available");
                      }}
                    >
                      Check In
                    </button>
                  </div>
                </div>
              ))}
            {instruments.filter((i) => i.status === "Available").length > 0 && (
              <>
                <div className="ast-deploy-divider">
                  Available for Deployment
                </div>
                {instruments
                  .filter((i) => i.status === "Available")
                  .map((inst) => (
                    <div
                      key={inst.id}
                      className="card ast-deploy-card ast-deploy-available"
                      onClick={() => setSelectedAsset(inst)}
                    >
                      <div className="ast-deploy-header">
                        <h3 className="ast-deploy-name">{inst.name}</h3>
                        <span className="ast-status ast-status-green">
                          Available
                        </span>
                      </div>
                      <div className="ast-deploy-details">
                        <div className="ast-deploy-row">
                          <span className="ast-deploy-label">Type</span>
                          <span className="ast-deploy-value">{inst.type}</span>
                        </div>
                        <div className="ast-deploy-row">
                          <span className="ast-deploy-label">Serial</span>
                          <span className="ast-deploy-value">
                            <code>{inst.serial}</code>
                          </span>
                        </div>
                      </div>
                      <div className="ast-deploy-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(inst.dbId, "deployed");
                          }}
                        >
                          Deploy
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: Maintenance ═══ */}
        {activeTab === "maintenance" && (
          <div className="ast-maint-list">
            {filtered
              .filter((i) => i.maintenanceLog.length > 0)
              .map((inst) => (
                <div
                  key={inst.id}
                  className="card ast-maint-card"
                  onClick={() => setSelectedAsset(inst)}
                >
                  <div className="ast-maint-header">
                    <div>
                      <h3 className="ast-maint-name">{inst.name}</h3>
                      <span className="ast-maint-serial">
                        {inst.serial} — {inst.type}
                      </span>
                    </div>
                    <span className={`ast-status ${statusClass[inst.status]}`}>
                      {inst.status}
                    </span>
                  </div>
                  <div className="ast-maint-timeline">
                    {inst.maintenanceLog.map((log, i) => (
                      <div key={i} className="ast-maint-event">
                        <div className="ast-maint-dot" />
                        <div className="ast-maint-event-content">
                          <span className="ast-maint-date">{log.date}</span>
                          <span className="ast-maint-desc">
                            {log.description}
                          </span>
                          {log.cost > 0 && (
                            <span className="ast-maint-cost">${log.cost}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ast-maint-total">
                    Total maintenance: $
                    {inst.maintenanceLog
                      .reduce((s, l) => s + l.cost, 0)
                      .toLocaleString()}
                  </div>
                </div>
              ))}
            {filtered.filter((i) => i.maintenanceLog.length > 0).length ===
              0 && (
              <div className="mkt-empty">
                <p>No maintenance records found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Create Asset Modal ═══ */}
      {showCreateModal && (
        <div className="mkt-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="mkt-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="ast-detail-top">
              <h2 className="mkt-modal-title">Add Instrument</h2>
              <button className="mkt-modal-close" onClick={() => setShowCreateModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="responsive-grid-2" style={{ padding: "20px" }}>
              <input className="input-field" style={{ gridColumn: "1 / -1" }} placeholder="Name *" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} autoFocus required />
              <SelectDropdown
                className="input-field"
                value={createForm.kind}
                onChange={(val) => setCreateForm(f => ({ ...f, kind: val as "instrument" | "vehicle" | "equipment" | "other" }))}
                options={[
                  { value: "instrument", label: "Instrument" },
                  { value: "vehicle", label: "Vehicle" },
                  { value: "equipment", label: "Equipment" },
                  { value: "other", label: "Other" }
                ]}
              />
              <input className="input-field" placeholder="Category (e.g. Total Station)" value={createForm.category} onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))} />
              <input className="input-field" placeholder="Make" value={createForm.make} onChange={(e) => setCreateForm(f => ({ ...f, make: e.target.value }))} />
              <input className="input-field" placeholder="Model" value={createForm.model} onChange={(e) => setCreateForm(f => ({ ...f, model: e.target.value }))} />
              <input className="input-field" style={{ gridColumn: "1 / -1" }} placeholder="Serial Number" value={createForm.serial_number} onChange={(e) => setCreateForm(f => ({ ...f, serial_number: e.target.value }))} />
              <input className="input-field" type="date" placeholder="Purchase Date" value={createForm.purchase_date} onChange={(e) => setCreateForm(f => ({ ...f, purchase_date: e.target.value }))} />
              <input className="input-field" type="number" placeholder="Purchase Cost ($)" value={createForm.purchase_cost} onChange={(e) => setCreateForm(f => ({ ...f, purchase_cost: e.target.value }))} />
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Add Instrument"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Asset Detail Modal ═══ */}
      {selectedAsset && (
        <div
          className="mkt-modal-overlay"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="mkt-modal ast-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ast-detail-top">
              <div>
                <h2 className="mkt-modal-title">{selectedAsset.name}</h2>
                <p className="mkt-modal-type">
                  {selectedAsset.type} &middot;{" "}
                  <code className="ast-serial">{selectedAsset.serial}</code>
                </p>
              </div>
              <button
                className="mkt-modal-close"
                onClick={() => setSelectedAsset(null)}
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
            <div className="ast-detail-grid">
              <div className="ast-detail-item">
                <span className="ast-detail-label">Status</span>
                <span
                  className={`ast-status ${statusClass[selectedAsset.status]}`}
                >
                  {selectedAsset.status}
                </span>
              </div>
              <div className="ast-detail-item">
                <span className="ast-detail-label">Assigned</span>
                <span className="ast-detail-value">
                  {selectedAsset.assignedTo || "—"}
                </span>
              </div>
              <div className="ast-detail-item">
                <span className="ast-detail-label">Project</span>
                <span className="ast-detail-value">
                  {selectedAsset.assignedProject || "—"}
                </span>
              </div>
              <div className="ast-detail-item">
                <span className="ast-detail-label">Purchase</span>
                <span className="ast-detail-value">
                  ${selectedAsset.purchaseCost.toLocaleString()} (
                  {selectedAsset.purchaseDate})
                </span>
              </div>
              <div className="ast-detail-item">
                <span className="ast-detail-label">Book Value</span>
                <span className="ast-detail-value">
                  ${selectedAsset.currentValue.toLocaleString()}
                </span>
              </div>
              <div className="ast-detail-item">
                <span className="ast-detail-label">Depreciation</span>
                <span className="ast-detail-value">
                  {Math.round(
                    ((selectedAsset.purchaseCost - selectedAsset.currentValue) /
                      selectedAsset.purchaseCost) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
            {selectedAsset.nextCalibration && (
              <div className="ast-detail-cal">
                <span className="pro-section-label">Calibration</span>
                <div className="ast-detail-grid">
                  <div className="ast-detail-item">
                    <span className="ast-detail-label">Last</span>
                    <span className="ast-detail-value">
                      {selectedAsset.lastCalibration}
                    </span>
                  </div>
                  <div className="ast-detail-item">
                    <span className="ast-detail-label">Next Due</span>
                    <span
                      className={`ast-detail-value ${calClass(daysUntil(selectedAsset.nextCalibration))}`}
                    >
                      {selectedAsset.nextCalibration} (
                      {calLabel(daysUntil(selectedAsset.nextCalibration))})
                    </span>
                  </div>
                  <div className="ast-detail-item">
                    <span className="ast-detail-label">Certificate</span>
                    <span className="ast-detail-value">
                      {selectedAsset.calibrationCert}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {selectedAsset.maintenanceLog.length > 0 && (
              <div>
                <span className="pro-section-label">Maintenance History</span>
                <div className="ast-maint-timeline">
                  {selectedAsset.maintenanceLog.map((log, i) => (
                    <div key={i} className="ast-maint-event">
                      <div className="ast-maint-dot" />
                      <div className="ast-maint-event-content">
                        <span className="ast-maint-date">{log.date}</span>
                        <span className="ast-maint-desc">
                          {log.description}
                        </span>
                        {log.cost > 0 && (
                          <span className="ast-maint-cost">${log.cost}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mkt-modal-actions">
              <button className="btn btn-primary">
                {selectedAsset.status === "Available" ? "Deploy" : "Edit Asset"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedAsset(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
