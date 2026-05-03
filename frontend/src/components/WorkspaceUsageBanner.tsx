import { useEffect, useState } from "react";
import {
  formatWorkspaceBytes,
  getWorkspaceUsage,
  type WorkspaceUsageSnapshot,
} from "../lib/repositories/workspaceUsage.ts";

function UsageLine({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number | null;
}) {
  if (cap == null) return null;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const warn = pct >= 90;
  return (
    <div className="workspace-usage-line">
      <div className="workspace-usage-line-head">
        <span>{label}</span>
        <span className={warn ? "workspace-usage-line-warn" : ""}>
          {used} / {cap}
        </span>
      </div>
      <div className="workspace-usage-bar">
        <div
          className={`workspace-usage-bar-fill${warn ? " workspace-usage-bar-fill-warn" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StorageLine({
  used,
  capBytes,
}: {
  used: number;
  capBytes: number | null;
}) {
  if (capBytes == null) return null;
  const pct =
    capBytes > 0 ? Math.min(100, Math.round((used / capBytes) * 100)) : 0;
  const warn = pct >= 90;
  return (
    <div className="workspace-usage-line">
      <div className="workspace-usage-line-head">
        <span>Storage</span>
        <span className={warn ? "workspace-usage-line-warn" : ""}>
          {formatWorkspaceBytes(used)} / {formatWorkspaceBytes(capBytes)}
        </span>
      </div>
      <div className="workspace-usage-bar">
        <div
          className={`workspace-usage-bar-fill${warn ? " workspace-usage-bar-fill-warn" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface WorkspaceUsageBannerProps {
  workspaceId: string;
  /** Increment after license or entitlements change to refetch usage. */
  reloadKey?: number;
}

export default function WorkspaceUsageBanner({
  workspaceId,
  reloadKey = 0,
}: WorkspaceUsageBannerProps) {
  const [snap, setSnap] = useState<WorkspaceUsageSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getWorkspaceUsage(workspaceId);
        if (!cancelled) setSnap(u);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Could not load usage.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, reloadKey]);

  if (err || !snap) return null;

  const hasCap =
    snap.seat_limit != null ||
    snap.project_cap != null ||
    snap.asset_cap != null ||
    snap.storage_cap_bytes != null;

  if (!hasCap) return null;

  const seatWarn =
    snap.seat_limit != null && snap.seats_used >= snap.seat_limit * 0.9;

  return (
    <div className="workspace-usage-banner" role="region" aria-label="Workspace usage">
      <div className="workspace-usage-banner-title">
        Plan usage ({snap.tier})
        {seatWarn ? (
          <span className="workspace-usage-banner-note">
            Approaching limits — contact your admin to upgrade.
          </span>
        ) : null}
      </div>
      <UsageLine label="Seats" used={snap.seats_used} cap={snap.seat_limit} />
      <UsageLine
        label="Projects"
        used={snap.projects_used}
        cap={snap.project_cap}
      />
      <UsageLine
        label="Instruments"
        used={snap.assets_used}
        cap={snap.asset_cap}
      />
      <StorageLine used={snap.storage_used_bytes} capBytes={snap.storage_cap_bytes} />
    </div>
  );
}
