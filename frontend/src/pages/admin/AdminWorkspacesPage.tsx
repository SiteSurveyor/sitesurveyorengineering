import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listWorkspacesWithLicenses,
  pickWorkspaceLicense,
  listWorkspaceMembersAdmin,
  getWorkspaceSummary,
  archiveWorkspace,
  unarchiveWorkspace,
  listProfilesSummary,
  type WorkspaceRowWithLicense,
  type WorkspaceMemberAdmin,
  type WorkspaceSummary,
} from "../../lib/repositories/adminPlatform.ts";
import type { LicenseStatus, LicenseTier } from "../../lib/repositories/workspaceLicenses.ts";

interface AdminWorkspacesPageProps {
  isPlatformAdmin: boolean;
}

function tierBadge(tier: LicenseTier) {
  const cls = tier === "enterprise" ? "badge-purple" : tier === "pro" ? "badge-blue" : "badge-gray";
  return <span className={`badge ${cls}`}>{tier.toUpperCase()}</span>;
}

function statusBadge(status: LicenseStatus) {
  const cls =
    status === "active" || status === "trialing"
      ? "badge-green"
      : status === "past_due"
        ? "badge-yellow"
        : "badge-gray";
  return <span className={`badge ${cls}`}>{status.replaceAll("_", " ")}</span>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export default function AdminWorkspacesPage({
  isPlatformAdmin,
}: AdminWorkspacesPageProps) {
  const [rows, setRows] = useState<WorkspaceRowWithLicense[]>([]);
  const [ownerLabels, setOwnerLabels] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberAdmin[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkspacesWithLicenses();
      setRows(data);
      const owners = await listProfilesSummary(data.map((r) => r.owner_user_id));
      setOwnerLabels(owners);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = rows;
    if (!showArchived) result = result.filter((r) => !r.archived_at);
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const lic = pickWorkspaceLicense(r);
        const owner = ownerLabels.get(r.owner_user_id) ?? "";
        return (
          r.name.toLowerCase().includes(q) ||
          (r.slug ?? "").toLowerCase().includes(q) ||
          (lic?.tier ?? "").includes(q) ||
          owner.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [rows, query, showArchived, ownerLabels]);

  const selectedRow = selectedWsId ? rows.find((r) => r.id === selectedWsId) ?? null : null;

  const openDetail = async (wsId: string) => {
    setSelectedWsId(wsId);
    setDetailLoading(true);
    try {
      const [m, s] = await Promise.all([
        listWorkspaceMembersAdmin(wsId),
        getWorkspaceSummary(wsId),
      ]);
      setMembers(m);
      setSummary(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspace details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!selectedRow) return;
    const isArchived = !!selectedRow.archived_at;
    const verb = isArchived ? "Unarchive" : "Archive";
    if (!window.confirm(`${verb} workspace "${selectedRow.name}"?`)) return;

    setArchiving(true);
    try {
      if (isArchived) {
        await unarchiveWorkspace(selectedRow.id);
      } else {
        await archiveWorkspace(selectedRow.id);
      }
      setNotice(`Workspace ${verb.toLowerCase()}d.`);
      window.setTimeout(() => setNotice(null), 2300);
      setSelectedWsId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${verb.toLowerCase()} workspace.`);
    } finally {
      setArchiving(false);
    }
  };

  if (!isPlatformAdmin) return null;

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>Workspace details</h1>
          <p className="page-subtitle">
            Inspect any workspace — members, entity counts, archive status
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert-bar alert-warning">{error}</div>}
      {notice && <div className="alert-bar alert-success">{notice}</div>}

      <div className="admin-console-toolbar" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          className="input-field admin-console-search"
          placeholder="Filter by name, slug, tier, or owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter workspaces"
        />
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <p className="admin-console-muted">Loading…</p>
      ) : (
        <div className="card admin-console-card admin-console-table-wrap">
          <table className="invoice-table admin-console-table admin-console-table--stacked">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    No workspaces found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const lic = pickWorkspaceLicense(row);
                  return (
                    <tr key={row.id}>
                      <td data-label="Workspace">
                        <div className="admin-console-cell-title">{row.name}</div>
                        {row.archived_at && (
                          <span className="admin-console-muted">Archived</span>
                        )}
                      </td>
                      <td data-label="Type">{row.type}</td>
                      <td data-label="Owner">{ownerLabels.get(row.owner_user_id) ?? "—"}</td>
                      <td data-label="Tier">{tierBadge(lic?.tier ?? "free")}</td>
                      <td data-label="Status">{statusBadge(lic?.status ?? "active")}</td>
                      <td data-label="Created">{formatDate(row.created_at)}</td>
                      <td data-label="Actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm admin-console-row-action"
                          onClick={() => void openDetail(row.id)}
                          disabled={detailLoading}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedRow && (
        <div className="billing-modal-overlay" role="dialog" aria-modal="true">
          <div className="billing-modal admin-console-modal" style={{ maxWidth: "600px" }}>
            <div className="billing-modal-header">
              <h3>{selectedRow.name}</h3>
              <button
                type="button"
                className="billing-modal-close"
                onClick={() => setSelectedWsId(null)}
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="admin-console-muted" style={{ padding: "20px" }}>Loading…</p>
            ) : (
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--text-m)" }}>Type</span>
                    <div>{selectedRow.type}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--text-m)" }}>Owner</span>
                    <div>{ownerLabels.get(selectedRow.owner_user_id) ?? "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--text-m)" }}>Slug</span>
                    <div>{selectedRow.slug ?? "—"}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--text-m)" }}>Created</span>
                    <div>{formatDate(selectedRow.created_at)}</div>
                  </div>
                  {selectedRow.archived_at && (
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--text-m)" }}>Archived</span>
                      <div>{formatDate(selectedRow.archived_at)}</div>
                    </div>
                  )}
                </div>

                {summary && (
                  <>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                      Entity counts
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                        gap: "8px",
                        marginBottom: "16px",
                      }}
                    >
                      {(Object.entries(summary) as [string, number][]).map(([key, val]) => (
                        <div
                          key={key}
                          style={{
                            background: "var(--bg-card, #f9fafb)",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: "18px", fontWeight: 700 }}>{val}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-m)", textTransform: "capitalize" }}>
                            {key}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                  Members ({members.length})
                </h4>
                {members.length === 0 ? (
                  <p className="admin-console-muted">No members.</p>
                ) : (
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <table className="invoice-table admin-console-table" style={{ fontSize: "13px" }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id}>
                            <td>{m.full_name ?? "—"}</td>
                            <td>{m.email ?? "—"}</td>
                            <td>
                              <span className="badge badge-gray">{m.role}</span>
                            </td>
                            <td>
                              <span className={`badge ${m.status === "active" ? "badge-green" : "badge-gray"}`}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="billing-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedWsId(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`btn ${selectedRow.archived_at ? "btn-primary" : "btn-outline"}`}
                onClick={() => void handleArchiveToggle()}
                disabled={archiving}
              >
                {archiving
                  ? "Saving…"
                  : selectedRow.archived_at
                    ? "Unarchive"
                    : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
