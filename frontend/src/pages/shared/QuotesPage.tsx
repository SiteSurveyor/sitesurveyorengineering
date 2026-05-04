import { useState, useEffect, useCallback } from "react";
import {
  listQuotes,
  getQuoteWithItems,
  createQuote,
  updateQuote,
  saveQuoteItems,
} from "../../lib/repositories/quotes.ts";
import { listOrganizations } from "../../lib/repositories/organizations.ts";
import { listProjects } from "../../lib/repositories/projects.ts";
import {
  mapQuoteRowToUi,
  type QuoteWithDetails,
  type UiQuote,
} from "../../lib/mappers.ts";
import type { OrganizationRow } from "../../lib/repositories/organizations.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import "../../styles/pages.css";

interface LineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface QuotesPageProps {
  workspaceId: string;
}

export default function QuotesPage({ workspaceId }: QuotesPageProps) {
  const [quotes, setQuotes] = useState<UiQuote[]>([]);
  const [activeQuote, setActiveQuote] = useState<UiQuote | null>(null);
  const [localItems, setLocalItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [projectOptions, setProjectOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    quote_number: "",
    organization_id: "",
    project_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    expires_on: "",
  });
  const [draftItems, setDraftItems] = useState<LineItem[]>([
    { id: "new-1", description: "", qty: 1, unit: "Hours", rate: 0 },
  ]);

  const fetchQuotes = useCallback(async () => {
    try {
      setError(null);
      const rows = await listQuotes(workspaceId);
      const mapped: UiQuote[] = [];
      for (const row of rows) {
        const detail = await getQuoteWithItems(row.id);
        mapped.push(mapQuoteRowToUi(row, detail?.items ?? []));
      }
      setQuotes(mapped);
      if (mapped.length > 0 && !activeQuote) {
        setActiveQuote(mapped[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, activeQuote]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    Promise.all([
      listOrganizations(workspaceId),
      listProjects(workspaceId),
    ]).then(([orgs, projs]) => {
      setOrganizations(orgs);
      setProjectOptions(
        projs.map((p) => ({ id: p.id, name: p.name })),
      );
    });
  }, [workspaceId]);

  useEffect(() => {
    if (activeQuote) {
      setLocalItems(JSON.parse(JSON.stringify(activeQuote.items)));
    } else {
      setLocalItems([]);
    }
  }, [activeQuote]);

  const calculateTotal = (items: LineItem[]) =>
    items.reduce(
      (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
      0,
    );

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleAddLineItem = () => {
    setLocalItems([
      ...localItems,
      { id: Date.now().toString(), description: "", qty: 1, unit: "Hours", rate: 0 },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveItems = async () => {
    if (!activeQuote) return;
    setSaving(true);
    try {
      const cleaned = localItems
        .filter((item) => item.description.trim().length > 0)
        .map((item) => ({
          description: item.description.trim(),
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          unit: item.unit || null,
        }));
      await saveQuoteItems(workspaceId, activeQuote.dbId, cleaned);
      await fetchQuotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save items");
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!activeQuote) return;
    try {
      await updateQuote(activeQuote.dbId, { status: "sent" });
      await fetchQuotes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const openCreateForm = () => {
    setCreateError(null);
    const today = new Date().toISOString().slice(0, 10);
    const plus30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setDraft({
      quote_number: "",
      organization_id: "",
      project_id: "",
      issue_date: today,
      expires_on: plus30,
    });
    setDraftItems([
      { id: `new-${Date.now()}`, description: "", qty: 1, unit: "Hours", rate: 0 },
    ]);
    setIsCreateOpen(true);
  };

  const submitCreateQuote = async () => {
    if (!draft.quote_number.trim()) {
      setCreateError("Quote number is required.");
      return;
    }
    const cleanedItems = draftItems
      .filter((item) => item.description.trim().length > 0)
      .map((item) => ({
        description: item.description.trim(),
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        unit: item.unit || null,
      }));
    if (cleanedItems.length === 0) {
      setCreateError("Add at least one line item.");
      return;
    }

    try {
      await createQuote(
        workspaceId,
        {
          quote_number: draft.quote_number.trim(),
          organization_id: draft.organization_id || null,
          project_id: draft.project_id || null,
          issue_date: draft.issue_date,
          expires_on: draft.expires_on || null,
          status: "draft",
        },
        cleanedItems,
      );
      setIsCreateOpen(false);
      setActiveQuote(null);
      await fetchQuotes();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create quote");
    }
  };

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="hub-body quotes-page">
        <p style={{ padding: "2rem" }}>Loading quotes...</p>
      </div>
    );
  }

  return (
    <div className="hub-body quotes-page">
      {error && (
        <div
          style={{
            background: "var(--danger-bg, #fee)",
            color: "var(--danger, #c00)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <header className="page-header quotes-page-header">
        <div>
          <h1>Quotes</h1>
          <p className="page-subtitle">
            Manage estimates, compute surveying fees, and issue proposals
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary quotes-create-btn"
            onClick={openCreateForm}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Quote
          </button>
        </div>
      </header>

      <div className="split-view quotes-split-view">
        <div className="split-list quotes-split-list">
          {quotes.map((quote) => {
            const total = calculateTotal(quote.items);
            return (
              <button
                key={quote.dbId}
                className={`split-list-item ${activeQuote?.dbId === quote.dbId ? "active" : ""}`}
                onClick={() => setActiveQuote(quote)}
              >
                <div className="quote-item-header">
                  <span className="quote-item-id">{quote.id}</span>
                  <span
                    className={`status-badge status-${quote.status.toLowerCase()}`}
                  >
                    {quote.status}
                  </span>
                </div>
                <div className="quote-item-client">{quote.client}</div>
                <div className="quote-item-project">{quote.project}</div>
                <div className="quote-item-footer">
                  <span className="quote-item-date">
                    {formatDate(quote.date)}
                  </span>
                  <span className="quote-item-total">
                    {formatCurrency(total)}
                  </span>
                </div>
              </button>
            );
          })}
          {quotes.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No quotes yet. Create your first quote.
            </div>
          )}
        </div>

        <div className="split-detail card quotes-detail-panel">
          {activeQuote ? (
            <div className="quote-editor quotes-editor-shell">
              <div className="quote-doc-toolbar">
                <h2 className="quote-doc-id">{activeQuote.id}</h2>
                <div className="quote-doc-actions">
                  <button
                    className="btn btn-outline quote-doc-btn"
                    onClick={handleSaveItems}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Items"}
                  </button>
                  <button className="btn btn-outline quote-doc-btn">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export PDF
                  </button>
                  {activeQuote.status === "Draft" && (
                    <button
                      className="btn btn-primary quote-doc-btn"
                      onClick={handleSendToClient}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send to Client
                    </button>
                  )}
                </div>
              </div>

              <div className="quote-meta-grid">
                <div className="form-group">
                  <label className="quote-meta-label">Bill To</label>
                  <input
                    className="input-field quote-meta-input"
                    defaultValue={activeQuote.client}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="quote-meta-label">Project</label>
                  <input
                    className="input-field quote-meta-input"
                    defaultValue={activeQuote.project}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="quote-meta-label">Date Issued</label>
                  <input
                    type="date"
                    className="input-field quote-meta-input"
                    defaultValue={activeQuote.date}
                    readOnly
                  />
                </div>
              </div>

              <div className="quote-lines-container">
                <table className="quote-table quote-lines-table">
                  <thead>
                    <tr>
                      <th className="quote-col-desc">Description</th>
                      <th className="quote-col-qty">Qty</th>
                      <th className="quote-col-unit">Unit</th>
                      <th className="quote-col-rate">Rate ($)</th>
                      <th className="quote-col-total">Total</th>
                      <th className="quote-col-remove"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            className="input-field input-table quote-line-input"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input-field input-table quote-line-input"
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(item.id, "qty", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input-field input-table quote-line-input"
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(item.id, "unit", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input-field input-table quote-line-input"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(item.id, "rate", e.target.value)
                            }
                          />
                        </td>
                        <td className="quote-line-total-cell">
                          {formatCurrency(
                            (Number(item.qty) || 0) * (Number(item.rate) || 0),
                          )}
                        </td>
                        <td className="quote-line-remove-cell">
                          <button
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="quote-line-remove-btn"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={handleAddLineItem}
                  className="btn btn-outline quote-add-line-btn"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Line Item
                </button>
              </div>

              <div className="quote-summary quote-summary-wrap">
                <div className="quote-totals-card">
                  <div className="quote-summary-row">
                    <span>Subtotal</span>
                    <strong>
                      {formatCurrency(calculateTotal(localItems))}
                    </strong>
                  </div>
                  <div className="quote-summary-row">
                    <span>VAT (15%)</span>
                    <strong>
                      {formatCurrency(calculateTotal(localItems) * 0.15)}
                    </strong>
                  </div>
                  <div className="quote-summary-row quote-summary-total">
                    <span>Total Amount</span>
                    <strong>
                      {formatCurrency(calculateTotal(localItems) * 1.15)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state quote-empty-state">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--border-heavy)"
                strokeWidth="1"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h3 className="quote-empty-title">No Quote Selected</h3>
              <p className="quote-empty-copy">
                Select an estimate from the left to view or edit.
              </p>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="invoices-create-overlay" role="dialog" aria-modal="true">
          <div className="invoices-create-modal">
            <div className="invoices-create-header">
              <h3>Create Quote</h3>
              <button
                className="invoices-create-close"
                onClick={() => setIsCreateOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="invoices-create-grid">
              <input
                className="input-field"
                placeholder="Quote number (e.g. EST-2026-053)"
                value={draft.quote_number}
                onChange={(e) =>
                  setDraft({ ...draft, quote_number: e.target.value })
                }
              />
              <SelectDropdown
                className="input-field"
                value={draft.organization_id}
                onChange={(val) =>
                  setDraft({ ...draft, organization_id: val })
                }
                options={[
                  { value: "", label: "Select Client (Organization)" },
                  ...organizations.map(org => ({ value: org.id, label: org.name }))
                ]}
              />
              <SelectDropdown
                className="input-field"
                value={draft.project_id}
                onChange={(val) =>
                  setDraft({ ...draft, project_id: val })
                }
                options={[
                  { value: "", label: "Select Project (optional)" },
                  ...projectOptions.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <input
                type="date"
                className="input-field"
                value={draft.issue_date}
                onChange={(e) =>
                  setDraft({ ...draft, issue_date: e.target.value })
                }
              />
              <input
                type="date"
                className="input-field"
                placeholder="Expires on"
                value={draft.expires_on}
                onChange={(e) =>
                  setDraft({ ...draft, expires_on: e.target.value })
                }
              />
            </div>

            <div className="invoices-create-lines">
              {draftItems.map((item) => (
                <div key={item.id} className="invoices-create-line-row">
                  <input
                    className="input-field"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, description: e.target.value }
                            : i,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, qty: Number(e.target.value) }
                            : i,
                        ),
                      )
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, unit: e.target.value }
                            : i,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) =>
                      setDraftItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, rate: Number(e.target.value) }
                            : i,
                        ),
                      )
                    }
                  />
                  <button
                    className="invoices-line-remove-btn"
                    onClick={() =>
                      setDraftItems((prev) =>
                        prev.length === 1
                          ? prev
                          : prev.filter((i) => i.id !== item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="btn btn-outline invoices-add-line-btn"
                onClick={() =>
                  setDraftItems((prev) => [
                    ...prev,
                    {
                      id: `new-${Date.now()}`,
                      description: "",
                      qty: 1,
                      unit: "Hours",
                      rate: 0,
                    },
                  ])
                }
              >
                Add Line Item
              </button>
            </div>

            <div className="invoices-create-footer">
              <div className="invoices-create-total">
                Total: {formatCurrency(calculateTotal(draftItems) * 1.15)}
              </div>
              {createError && (
                <span className="invoices-create-error">{createError}</span>
              )}
              <div className="invoices-create-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitCreateQuote}
                >
                  Create Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
