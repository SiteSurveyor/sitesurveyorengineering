import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listAuditLogs,
  listWorkspacesWithLicenses,
  listProfilesSummary,
  type AuditLogEntry,
  type WorkspaceRowWithLicense,
} from "../../lib/repositories/adminPlatform.ts";

const PAGE_SIZE = 50;

interface AdminAuditPageProps {
  isPlatformAdmin: boolean;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminAuditPage({
  isPlatformAdmin,
}: AdminAuditPageProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceRowWithLicense[]>([]);
  const [actorLabels, setActorLabels] = useState<Map<string, string>>(new Map());
  const [wsLabels, setWsLabels] = useState<Map<string, string>>(new Map());

  const [filterWsId, setFilterWsId] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");

  const loadWorkspaces = useCallback(async () => {
    try {
      const ws = await listWorkspacesWithLicenses();
      setWorkspaces(ws);
      const map = new Map<string, string>();
      for (const w of ws) map.set(w.id, w.name);
      setWsLabels(map);
    } catch {
      // non-critical — workspace labels just won't show
    }
  }, []);

  const loadPage = useCallback(
    async (start: number, append: boolean) => {
      if (!isPlatformAdmin) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const batch = await listAuditLogs({
          limit: PAGE_SIZE,
          offset: start,
          workspaceId: filterWsId || null,
          action: filterAction || null,
        });
        if (append) {
          setEntries((prev) => [...prev, ...batch]);
        } else {
          setEntries(batch);
        }
        setHasMore(batch.length === PAGE_SIZE);

        const actorIds = batch
          .map((e) => e.actor_user_id)
          .filter((id): id is string => id != null);
        if (actorIds.length > 0) {
          const labels = await listProfilesSummary(actorIds);
          setActorLabels((prev) => {
            const next = new Map(prev);
            labels.forEach((v, k) => next.set(k, v));
            return next;
          });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load audit log.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isPlatformAdmin, filterWsId, filterAction],
  );

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const actionOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.action));
    return Array.from(set).sort();
  }, [entries]);

  if (!isPlatformAdmin) return null;

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>Audit log</h1>
          <p className="page-subtitle">
            Cross-workspace activity trail — who did what, when
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void loadPage(0, false)}
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert-bar alert-warning">{error}</div>}

      <div className="admin-console-toolbar" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select
          className="input-field"
          style={{ maxWidth: "240px" }}
          value={filterWsId}
          onChange={(e) => setFilterWsId(e.target.value)}
        >
          <option value="">All workspaces</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ maxWidth: "180px" }}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="admin-console-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="admin-console-muted">No audit entries found.</p>
      ) : (
        <>
          <div className="card admin-console-card admin-console-table-wrap">
            <table className="invoice-table admin-console-table admin-console-table--stacked">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Workspace</th>
                  <th>Actor</th>
                  <th>Table</th>
                  <th>Action</th>
                  <th>Entity ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((ev) => (
                  <tr key={ev.id}>
                    <td data-label="When">{formatWhen(ev.created_at)}</td>
                    <td data-label="Workspace">
                      {ev.workspace_id
                        ? wsLabels.get(ev.workspace_id) ?? ev.workspace_id.slice(0, 8) + "…"
                        : <span className="admin-console-muted">—</span>}
                    </td>
                    <td data-label="Actor">
                      {ev.actor_user_id
                        ? actorLabels.get(ev.actor_user_id) ?? ev.actor_user_id.slice(0, 8) + "…"
                        : <span className="admin-console-muted">system</span>}
                    </td>
                    <td data-label="Table">
                      <code style={{ fontSize: "12px" }}>{ev.entity_table}</code>
                    </td>
                    <td data-label="Action">
                      <span className="badge badge-gray">{ev.action}</span>
                    </td>
                    <td data-label="Entity ID">
                      {ev.entity_id ? (
                        <code style={{ fontSize: "11px" }}>{ev.entity_id.slice(0, 8)}…</code>
                      ) : (
                        <span className="admin-console-muted">—</span>
                      )}
                    </td>
                    <td className="admin-console-notes-cell" data-label="Details">
                      {Object.keys(ev.details).length > 0 ? (
                        <details>
                          <summary style={{ cursor: "pointer", fontSize: "12px" }}>
                            {Object.keys(ev.details).length} field{Object.keys(ev.details).length === 1 ? "" : "s"}
                          </summary>
                          <pre
                            style={{
                              fontSize: "11px",
                              maxHeight: "120px",
                              overflow: "auto",
                              marginTop: "4px",
                              background: "var(--bg-card, #f5f5f5)",
                              padding: "6px",
                              borderRadius: "4px",
                            }}
                          >
                            {JSON.stringify(ev.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="admin-console-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="admin-console-load-more">
              <button
                type="button"
                className="btn btn-outline"
                disabled={loadingMore}
                onClick={() => void loadPage(entries.length, true)}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
