import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  countProfiles,
  listWorkspacesWithLicenses,
  pickWorkspaceLicense,
  type WorkspaceRowWithLicense,
} from "../../lib/repositories/adminPlatform.ts";
import type { LicenseStatus, LicenseTier } from "../../lib/repositories/workspaceLicenses.ts";

interface AdminOverviewPageProps {
  isPlatformAdmin: boolean;
}

function formatStat(n: number): string {
  return n.toLocaleString();
}

export default function AdminOverviewPage({
  isPlatformAdmin,
}: AdminOverviewPageProps) {
  const [rows, setRows] = useState<WorkspaceRowWithLicense[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [ws, profiles] = await Promise.all([
        listWorkspacesWithLicenses(),
        countProfiles(),
      ]);
      setRows(ws);
      setUserCount(profiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load platform data.");
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const activeWs = rows.filter((r) => !r.archived_at);
    const personal = activeWs.filter((r) => r.type === "personal").length;
    const business = activeWs.filter((r) => r.type === "business").length;
    const tierCounts: Record<LicenseTier, number> = {
      free: 0,
      pro: 0,
      enterprise: 0,
    };
    const statusCounts: Record<LicenseStatus, number> = {
      trialing: 0,
      active: 0,
      past_due: 0,
      suspended: 0,
      cancelled: 0,
    };
    for (const r of activeWs) {
      const lic = pickWorkspaceLicense(r);
      const tier = lic?.tier ?? "free";
      const status = lic?.status ?? "active";
      if (tier in tierCounts) tierCounts[tier as LicenseTier] += 1;
      if (status in statusCounts) statusCounts[status as LicenseStatus] += 1;
    }
    return {
      workspaces: activeWs.length,
      archived: rows.length - activeWs.length,
      personal,
      business,
      tierCounts,
      statusCounts,
    };
  }, [rows]);

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>Platform overview</h1>
          <p className="page-subtitle">
            Cross-tenant metrics for licensing and workspaces
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert-bar alert-warning">{error}</div>}

      {loading ? (
        <p className="admin-console-muted">Loading…</p>
      ) : (
        <>
          <div className="admin-console-kpi-row">
            <div className="admin-console-kpi-card">
              <span className="admin-console-kpi-label">Workspaces</span>
              <span className="admin-console-kpi-value">{formatStat(stats.workspaces)}</span>
              <span className="admin-console-kpi-hint">
                {stats.archived > 0
                  ? `${formatStat(stats.archived)} archived`
                  : "No archived workspaces"}
              </span>
            </div>
            <div className="admin-console-kpi-card">
              <span className="admin-console-kpi-label">User profiles</span>
              <span className="admin-console-kpi-value">
                {userCount === null ? "—" : formatStat(userCount)}
              </span>
              <span className="admin-console-kpi-hint">Registered accounts</span>
            </div>
            <div className="admin-console-kpi-card">
              <span className="admin-console-kpi-label">Personal workspaces</span>
              <span className="admin-console-kpi-value">{formatStat(stats.personal)}</span>
            </div>
            <div className="admin-console-kpi-card">
              <span className="admin-console-kpi-label">Business workspaces</span>
              <span className="admin-console-kpi-value">{formatStat(stats.business)}</span>
            </div>
          </div>

          <div className="admin-console-two-col">
            <div className="card admin-console-card">
              <div className="card-header">
                <h2 className="admin-console-card-title">Licenses by tier</h2>
              </div>
              <ul className="admin-console-stat-list">
                {(
                  Object.entries(stats.tierCounts) as [LicenseTier, number][]
                ).map(([tier, n]) => (
                  <li key={tier}>
                    <span className="admin-console-stat-key">{tier}</span>
                    <span className="admin-console-stat-val">{formatStat(n)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card admin-console-card">
              <div className="card-header">
                <h2 className="admin-console-card-title">Licenses by status</h2>
              </div>
              <ul className="admin-console-stat-list">
                {(
                  Object.entries(stats.statusCounts) as [LicenseStatus, number][]
                ).map(([status, n]) => (
                  <li key={status}>
                    <span className="admin-console-stat-key">
                      {status.replaceAll("_", " ")}
                    </span>
                    <span className="admin-console-stat-val">{formatStat(n)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
