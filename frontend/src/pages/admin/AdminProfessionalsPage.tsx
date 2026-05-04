import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  listAllProfessionals,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  type Professional,
} from "../../lib/repositories/adminPlatform.ts";

interface AdminProfessionalsPageProps {
  isPlatformAdmin: boolean;
}

export default function AdminProfessionalsPage({
  isPlatformAdmin,
}: AdminProfessionalsPageProps) {
  const [rows, setRows] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isGlobal, setIsGlobal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAllProfessionals();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load professionals.");
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
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openForm = (row?: Professional) => {
    setEditing(row ?? null);
    setName(row?.name ?? "");
    setTitle(row?.title ?? "");
    setBio(row?.bio ?? "");
    setEmail(row?.email ?? "");
    setPhone(row?.phone ?? "");
    setIsGlobal(row?.is_global ?? true);
    setFormOpen(true);
    setNotice(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setTitle("");
    setBio("");
    setEmail("");
    setPhone("");
    setIsGlobal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateProfessional(editing.id, {
          name: name.trim(),
          title: title.trim() || null,
          bio: bio.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          is_global: isGlobal,
        });
        setNotice("Professional updated.");
      } else {
        await createProfessional({
          name: name.trim(),
          title: title.trim() || null,
          bio: bio.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          is_global: isGlobal,
          workspace_id: "00000000-0000-0000-0000-000000000000",
        });
        setNotice("Professional created.");
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
    if (!window.confirm("Delete this professional?")) return;
    try {
      await deleteProfessional(id);
      setNotice("Professional deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  return (
    <div className="admin-console-page">
      <div className="page-header">
        <h1>Professionals Directory</h1>
        <div className="header-actions">
          <input
            className="input-field"
            placeholder="Search professionals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn--primary" onClick={() => openForm()}>
            + Add Professional
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
          {query ? "No matching professionals." : "No professionals in directory."}
        </p>
      ) : (
        <table className="admin-console-table admin-console-table--stacked">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Contact</th>
              <th>Global</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td data-label="Name">
                  <div style={{ fontWeight: 600 }}>{row.name}</div>
                  {row.bio && (
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {row.bio}
                    </div>
                  )}
                </td>
                <td data-label="Title">{row.title ?? <span className="text-muted">—</span>}</td>
                <td data-label="Contact">
                  {row.email && <div>{row.email}</div>}
                  {row.phone && <div className="text-muted">{row.phone}</div>}
                  {!row.email && !row.phone && (
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
              <h3>{editing ? "Edit Professional" : "New Professional"}</h3>
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
                  Name *
                  <input
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Title
                  <input
                    className="input-field"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Email
                  <input
                    className="input-field"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  Phone
                  <input
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>
              <label className="form-label">
                Bio
                <textarea
                  className="input-field"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
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
