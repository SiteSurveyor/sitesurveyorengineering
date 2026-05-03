import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listProfilesSummary,
  listWorkspacesWithLicenses,
  pickWorkspaceLicense,
  type WorkspaceRowWithLicense,
} from "../../lib/repositories/adminPlatform.ts";
import {
  updateWorkspaceLicense,
  type LicenseStatus,
  type LicenseTier,
  type WorkspaceLicense,
} from "../../lib/repositories/workspaceLicenses.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";

interface AdminLicensesPageProps {
  isPlatformAdmin: boolean;
}

function tierBadgeClass(tier: LicenseTier): string {
  if (tier === "enterprise") return "badge-purple";
  if (tier === "pro") return "badge-blue";
  return "badge-gray";
}

function statusBadgeClass(status: LicenseStatus): string {
  if (status === "active" || status === "trialing") return "badge-green";
  if (status === "past_due") return "badge-yellow";
  return "badge-gray";
}

export default function AdminLicensesPage({
  isPlatformAdmin,
}: AdminLicensesPageProps) {
  const [rows, setRows] = useState<WorkspaceRowWithLicense[]>([]);
  const [ownerLabels, setOwnerLabels] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalWorkspaceId, setModalWorkspaceId] = useState<string | null>(null);
  const [licenseDraft, setLicenseDraft] = useState<WorkspaceLicense | null>(null);
  const [tierDraft, setTierDraft] = useState<LicenseTier>("free");
  const [statusDraft, setStatusDraft] = useState<LicenseStatus>("active");
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkspacesWithLicenses();
      setRows(data);
      const owners = await listProfilesSummary(data.map((r) => r.owner_user_id));
      setOwnerLabels(owners);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const lic = pickWorkspaceLicense(r);
      const owner = ownerLabels.get(r.owner_user_id) ?? "";
      return (
        r.name.toLowerCase().includes(q) ||
        (r.slug ?? "").toLowerCase().includes(q) ||
        (lic?.tier ?? "").includes(q) ||
        (lic?.status ?? "").includes(q) ||
        owner.toLowerCase().includes(q)
      );
    });
  }, [rows, query, ownerLabels]);

  const openModal = (row: WorkspaceRowWithLicense) => {
    const lic = pickWorkspaceLicense(row);
    if (!lic) {
      setError("This workspace has no license row yet.");
      return;
    }
    setModalWorkspaceId(row.id);
    setLicenseDraft(lic);
    setTierDraft(lic.tier);
    setStatusDraft(lic.status);
    setNotesDraft(lic.notes ?? "");
  };

  const closeModal = () => {
    setModalWorkspaceId(null);
    setLicenseDraft(null);
  };

  const saveLicense = async () => {
    if (!modalWorkspaceId || !licenseDraft) return;
    setSaving(true);
    setError(null);
    try {
      await updateWorkspaceLicense(modalWorkspaceId, {
        tier: tierDraft,
        status: statusDraft,
        notes: notesDraft.trim() || null,
      });
      await load();
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update license.");
    } finally {
      setSaving(false);
    }
  };

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <div className="hub-body admin-console-page">
      <header className="page-header">
        <div>
          <h1>Workspace licenses</h1>
          <p className="page-subtitle">Search tenants and adjust plan or status</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert-bar alert-warning">{error}</div>}

      <div className="admin-console-toolbar">
        <input
          type="search"
          className="input-field admin-console-search"
          placeholder="Filter by workspace, owner, tier, or status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter workspaces"
        />
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const lic = pickWorkspaceLicense(row);
                const tier = lic?.tier ?? "free";
                const status = lic?.status ?? "active";
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
                    <td data-label="Tier">
                      <span className={`badge ${tierBadgeClass(tier)}`}>
                        {tier.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${statusBadgeClass(status)}`}>
                        {status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm admin-console-row-action"
                        disabled={!lic}
                        onClick={() => openModal(row)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalWorkspaceId && licenseDraft && (
        <div className="billing-modal-overlay" role="dialog" aria-modal="true">
          <div className="billing-modal admin-console-modal">
            <div className="billing-modal-header">
              <h3>Update workspace license</h3>
              <button
                type="button"
                className="billing-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-grid">
              <SelectDropdown
                className="input-field billing-history-select"
                value={tierDraft}
                onChange={(val) => setTierDraft(val as LicenseTier)}
                options={[
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "enterprise", label: "Enterprise" },
                ]}
              />
              <SelectDropdown
                className="input-field billing-history-select"
                value={statusDraft}
                onChange={(val) => setStatusDraft(val as LicenseStatus)}
                options={[
                  { value: "trialing", label: "Trialing" },
                  { value: "active", label: "Active" },
                  { value: "past_due", label: "Past Due" },
                  { value: "suspended", label: "Suspended" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
              <input
                className="input-field"
                placeholder="Notes (optional)"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
            </div>
            <div className="billing-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void saveLicense()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save license"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
