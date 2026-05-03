import { useCallback, useEffect, useState } from "react";
import "../../styles/pages.css";
import {
  listGlobalLicenseEvents,
  workspaceFromEvent,
  type LicenseEventWithWorkspace,
} from "../../lib/repositories/adminPlatform.ts";

const PAGE_SIZE = 40;

interface AdminActivityPageProps {
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

export default function AdminActivityPage({
  isPlatformAdmin,
}: AdminActivityPageProps) {
  const [events, setEvents] = useState<LicenseEventWithWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (start: number, append: boolean) => {
      if (!isPlatformAdmin) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const batch = await listGlobalLicenseEvents({
          limit: PAGE_SIZE,
          offset: start,
        });
        if (append) {
          setEvents((prev) => [...prev, ...batch]);
        } else {
          setEvents(batch);
        }
        setHasMore(batch.length === PAGE_SIZE);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isPlatformAdmin],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const loadMore = () => {
    void loadPage(events.length, true);
  };

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>License activity</h1>
          <p className="page-subtitle">Recent tier and status changes across workspaces</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              void loadPage(0, false);
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert-bar alert-warning">{error}</div>}

      {loading ? (
        <p className="admin-console-muted">Loading…</p>
      ) : events.length === 0 ? (
        <p className="admin-console-muted">No license events yet.</p>
      ) : (
        <>
          <div className="card admin-console-card admin-console-table-wrap">
            <table className="invoice-table admin-console-table admin-console-table--stacked">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Workspace</th>
                  <th>Tier change</th>
                  <th>Status change</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const ws = workspaceFromEvent(ev);
                  return (
                    <tr key={ev.id}>
                      <td data-label="When">{formatWhen(ev.created_at)}</td>
                      <td data-label="Workspace">
                        {ws ? (
                          <>
                            <div className="admin-console-cell-title">{ws.name}</div>
                            <span className="admin-console-muted">{ws.type}</span>
                          </>
                        ) : (
                          <span className="admin-console-muted">—</span>
                        )}
                      </td>
                      <td data-label="Tier change">
                        {(ev.previous_tier ?? "—")} → {(ev.new_tier ?? "—")}
                      </td>
                      <td data-label="Status change">
                        {(ev.previous_status ?? "—")} → {(ev.new_status ?? "—")}
                      </td>
                      <td className="admin-console-notes-cell" data-label="Notes">
                        {ev.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="admin-console-load-more">
              <button
                type="button"
                className="btn btn-outline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
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
