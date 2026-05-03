import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listAllProfiles,
  getProfileWithWorkspaces,
  togglePlatformAdmin,
  type AdminProfileRow,
  type AdminProfileWithWorkspaces,
} from "../../lib/repositories/adminPlatform.ts";

interface AdminUsersPageProps {
  isPlatformAdmin: boolean;
}

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage({
  isPlatformAdmin,
}: AdminUsersPageProps) {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterAdmin, setFilterAdmin] = useState<"all" | "admin" | "user">("all");
  const [page, setPage] = useState(1);

  const [detailUser, setDetailUser] = useState<AdminProfileWithWorkspaces | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAllProfiles();
      setProfiles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = profiles;
    if (filterAdmin === "admin") result = result.filter((p) => p.is_platform_admin);
    if (filterAdmin === "user") result = result.filter((p) => !p.is_platform_admin);
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          (p.full_name ?? "").toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.professional_title ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [profiles, query, filterAdmin]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, filterAdmin]);

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const data = await getProfileWithWorkspaces(userId);
      setDetailUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!detailUser) return;
    const newVal = !detailUser.is_platform_admin;
    const action = newVal ? "grant" : "revoke";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} platform admin for ${detailUser.full_name ?? detailUser.email ?? detailUser.id}?`)) return;

    setToggling(true);
    try {
      await togglePlatformAdmin(detailUser.id, newVal);
      setDetailUser({ ...detailUser, is_platform_admin: newVal });
      setNotice(`Platform admin ${action}d.`);
      window.setTimeout(() => setNotice(null), 2300);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} platform admin.`);
    } finally {
      setToggling(false);
    }
  };

  if (!isPlatformAdmin) return null;

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>User management</h1>
          <p className="page-subtitle">
            View registered users and manage platform admin access
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

      <div className="admin-console-toolbar" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="search"
          className="input-field admin-console-search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        <select
          className="input-field"
          style={{ maxWidth: "180px" }}
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value as "all" | "admin" | "user")}
        >
          <option value="all">All users</option>
          <option value="admin">Platform admins</option>
          <option value="user">Regular users</option>
        </select>
      </div>

      {loading ? (
        <p className="admin-console-muted">Loading…</p>
      ) : (
        <>
          <div className="card admin-console-card admin-console-table-wrap">
            <table className="invoice-table admin-console-table admin-console-table--stacked">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Title</th>
                  <th>Signup type</th>
                  <th>Admin</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Name">
                        <div className="admin-console-cell-title">
                          {p.full_name || "—"}
                        </div>
                      </td>
                      <td data-label="Email">{p.email ?? "—"}</td>
                      <td data-label="Title">{p.professional_title ?? "—"}</td>
                      <td data-label="Signup type">
                        <span className="badge badge-gray">
                          {p.auth_signup_account_type ?? "—"}
                        </span>
                      </td>
                      <td data-label="Admin">
                        {p.is_platform_admin ? (
                          <span className="badge badge-purple">Admin</span>
                        ) : (
                          <span className="admin-console-muted">—</span>
                        )}
                      </td>
                      <td data-label="Joined">{formatDate(p.created_at)}</td>
                      <td data-label="Actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm admin-console-row-action"
                          onClick={() => void openDetail(p.id)}
                          disabled={detailLoading}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ lineHeight: "32px", fontSize: "13px", color: "var(--text-m)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {detailUser && (
        <div className="billing-modal-overlay" role="dialog" aria-modal="true">
          <div className="billing-modal admin-console-modal" style={{ maxWidth: "520px" }}>
            <div className="billing-modal-header">
              <h3>User detail</h3>
              <button
                type="button"
                className="billing-modal-close"
                onClick={() => setDetailUser(null)}
              >
                Close
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ marginBottom: "12px" }}>
                <strong>{detailUser.full_name || "Unnamed"}</strong>
                <span className="admin-console-muted" style={{ marginLeft: "8px" }}>
                  {detailUser.email ?? ""}
                </span>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-m)" }}>Title: </span>
                {detailUser.professional_title ?? "—"}
              </div>

              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-m)" }}>Signup type: </span>
                <span className="badge badge-gray">
                  {detailUser.auth_signup_account_type ?? "—"}
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-m)" }}>Platform admin: </span>
                {detailUser.is_platform_admin ? (
                  <span className="badge badge-purple">Yes</span>
                ) : (
                  <span className="badge badge-gray">No</span>
                )}
              </div>

              <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                Workspace memberships ({detailUser.workspaces.length})
              </h4>
              {detailUser.workspaces.length === 0 ? (
                <p className="admin-console-muted">No workspace memberships.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {detailUser.workspaces.map((ws) => (
                    <li
                      key={ws.workspace_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "13px",
                      }}
                    >
                      <span>{ws.workspace_name}</span>
                      <span className="badge badge-gray">{ws.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="billing-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDetailUser(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`btn ${detailUser.is_platform_admin ? "btn-outline" : "btn-primary"}`}
                onClick={() => void handleToggleAdmin()}
                disabled={toggling}
              >
                {toggling
                  ? "Saving…"
                  : detailUser.is_platform_admin
                    ? "Revoke admin"
                    : "Grant admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
