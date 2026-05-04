import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listAllMarketplaceListings,
  createMarketplaceListing,
  updateMarketplaceListing,
  deleteMarketplaceListing,
  type MarketplaceListing,
} from "../../lib/repositories/adminPlatform.ts";

interface AdminMarketplacePageProps {
  isPlatformAdmin: boolean;
}

export default function AdminMarketplacePage({
  isPlatformAdmin,
}: AdminMarketplacePageProps) {
  const [rows, setRows] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<MarketplaceListing | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [isGlobal, setIsGlobal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAllMarketplaceListings();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listings.");
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
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openForm = (row?: MarketplaceListing) => {
    setEditing(row ?? null);
    setName(row?.name ?? "");
    setDescription(row?.description ?? "");
    setPrice(row?.price?.toString() ?? "");
    setCurrency(row?.currency ?? "USD");
    setCategory(row?.category ?? "");
    setIsGlobal(row?.is_global ?? true);
    setFormOpen(true);
    setNotice(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
    setPrice("");
    setCurrency("USD");
    setCategory("");
    setIsGlobal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateMarketplaceListing(editing.id, {
          name: name.trim(),
          description: description.trim() || null,
          price: price.trim() ? parseFloat(price) : null,
          currency: currency.trim() || null,
          category: category.trim() || null,
          is_global: isGlobal,
        });
        setNotice("Listing updated.");
      } else {
        await createMarketplaceListing({
          name: name.trim(),
          description: description.trim() || null,
          price: price.trim() ? parseFloat(price) : null,
          currency: currency.trim() || null,
          category: category.trim() || null,
          is_global: isGlobal,
          workspace_id: "00000000-0000-0000-0000-000000000000",
        });
        setNotice("Listing created.");
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await deleteMarketplaceListing(id);
      setNotice("Listing deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  return (
    <div className="admin-console-page">
      <div className="page-header">
        <h1>Marketplace Catalog</h1>
        <div className="header-actions">
          <input
            className="input-field"
            placeholder="Search listings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn--primary" onClick={() => openForm()}>
            + Add Listing
          </button>
        </div>
      </div>

      {notice && (
        <div className="alert-bar alert-success" style={{ marginBottom: 12 }}>
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="alert-bar alert-warning" style={{ marginBottom: 12 }}>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">
          {query ? "No matching listings." : "No marketplace listings."}
        </p>
      ) : (
        <table className="admin-console-table admin-console-table--stacked">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Global</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td data-label="Name">
                  <div style={{ fontWeight: 600 }}>{row.name}</div>
                  {row.description && (
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {row.description}
                    </div>
                  )}
                </td>
                <td data-label="Category">
                  <span className="badge badge-gray">{row.category ?? "—"}</span>
                </td>
                <td data-label="Price">
                  {row.price != null ? (
                    <span>
                      {row.price.toLocaleString()} {row.currency ?? "USD"}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td data-label="Global">
                  {row.is_global ? (
                    <span className="badge badge-green">Global</span>
                  ) : (
                    <span className="badge badge-gray">Workspace</span>
                  )}
                </td>
                <td data-label="Actions">
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => openForm(row)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleDelete(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formOpen && (
        <div
          className="billing-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="billing-modal billing-modal--scrollable-form">
            <div className="billing-modal-header">
              <h3>{editing ? "Edit Listing" : "New Listing"}</h3>
              <button
                className="billing-modal-close"
                onClick={closeForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="billing-modal-body-scroll">
              <div className="billing-modal-grid">
                <label className="form-label">
                  Name
                  <input
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Category
                  <input
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Price
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Currency
                  <input
                    className="input-field"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </label>
              </div>
              <label className="form-label">
                Description
                <textarea
                  className="input-field"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="form-label" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                />
                Visible to all accounts (global)
              </label>
            </div>
            <div className="billing-modal-actions">
              <button
                className="btn btn--secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving || !name.trim()}
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
