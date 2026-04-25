import { useState, useEffect, useCallback } from "react";
import {
  listInvoices,
  getInvoiceWithItems,
  createInvoice,
  updateInvoice,
} from "../../lib/repositories/invoices.ts";
import { listOrganizations } from "../../lib/repositories/organizations.ts";
import { listProjects } from "../../lib/repositories/projects.ts";
import {
  mapInvoiceRowToUi,
  type UiInvoice,
} from "../../lib/mappers.ts";
import type { OrganizationRow } from "../../lib/repositories/organizations.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import "../../styles/pages.css";

interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface InvoiceDraft {
  invoice_number: string;
  organization_id: string;
  project_id: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent";
  items: InvoiceLineItem[];
}

interface InvoicesPageProps {
  workspaceId: string;
}

export default function InvoicesPage({ workspaceId }: InvoicesPageProps) {
  const [invoices, setInvoices] = useState<UiInvoice[]>([]);
  const [filter, setFilter] = useState<"all" | "Draft" | "Sent" | "Paid" | "Overdue">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"issued-desc" | "due-asc" | "amount-desc">("issued-desc");
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ id: string; name: string }[]>([]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const plus14Iso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [draftInvoice, setDraftInvoice] = useState<InvoiceDraft>({
    invoice_number: "",
    organization_id: "",
    project_id: "",
    issue_date: todayIso,
    due_date: plus14Iso,
    status: "draft",
    items: [{ id: "new-1", description: "", qty: 1, unit: "Lump Sum", rate: 0 }],
  });

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      const rows = await listInvoices(workspaceId);
      const mapped: UiInvoice[] = [];
      for (const row of rows) {
        const detail = await getInvoiceWithItems(row.id);
        mapped.push(mapInvoiceRowToUi(row as any, detail?.items ?? []));
      }
      setInvoices(mapped);
      if (mapped.length > 0 && !activeInvoiceId) {
        setActiveInvoiceId(mapped[0].dbId);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    Promise.all([
      listOrganizations(workspaceId),
      listProjects(workspaceId),
    ]).then(([orgs, projs]) => {
      setOrganizations(orgs);
      setProjectOptions(projs.map((p: any) => ({ id: p.id, name: p.name })));
    });
  }, [workspaceId]);

  const calcTotal = (items: InvoiceLineItem[]) =>
    items.reduce((s, item) => s + Number(item.qty) * Number(item.rate), 0);

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const filteredByStatus =
    filter === "all" ? invoices : invoices.filter((i) => i.status === filter);
  const searchQuery = search.trim().toLowerCase();
  const filtered = filteredByStatus.filter(
    (inv) =>
      !searchQuery ||
      inv.id.toLowerCase().includes(searchQuery) ||
      inv.client.toLowerCase().includes(searchQuery) ||
      inv.project.toLowerCase().includes(searchQuery),
  );

  const sortedInvoices = [...filtered].sort((a, b) => {
    if (sortBy === "due-asc")
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (sortBy === "amount-desc")
      return calcTotal(b.items) - calcTotal(a.items);
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const activeInvoice =
    sortedInvoices.find((inv) => inv.dbId === activeInvoiceId) ??
    sortedInvoices[0] ??
    null;

  const totals = {
    outstanding: invoices
      .filter((i) => i.status === "Sent" || i.status === "Overdue")
      .reduce((s, i) => s + calcTotal(i.items), 0),
    overdue: invoices
      .filter((i) => i.status === "Overdue")
      .reduce((s, i) => s + calcTotal(i.items), 0),
    collected: invoices
      .filter((i) => i.status === "Paid")
      .reduce((s, i) => s + calcTotal(i.items), 0),
  };

  const markInvoicePaid = async () => {
    if (!activeInvoice) return;
    try {
      await updateInvoice(activeInvoice.dbId, {
        status: "paid",
        paid_at: new Date().toISOString(),
      });
      await fetchInvoices();
    } catch (err: any) {
      setError(err.message ?? "Failed to mark as paid");
    }
  };

  const openCreateForm = () => {
    setCreateError(null);
    setDraftInvoice({
      invoice_number: "",
      organization_id: "",
      project_id: "",
      issue_date: todayIso,
      due_date: plus14Iso,
      status: "draft",
      items: [{ id: `new-${Date.now()}`, description: "", qty: 1, unit: "Lump Sum", rate: 0 }],
    });
    setIsCreateOpen(true);
  };

  const updateDraftItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string | number,
  ) => {
    setDraftInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addDraftItem = () => {
    setDraftInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `new-${Date.now()}`, description: "", qty: 1, unit: "Hours", rate: 0 },
      ],
    }));
  };

  const removeDraftItem = (id: string) => {
    setDraftInvoice((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((item) => item.id !== id),
    }));
  };

  const submitCreateInvoice = async () => {
    if (!draftInvoice.invoice_number.trim()) {
      setCreateError("Invoice number is required.");
      return;
    }

    const cleanedItems = draftInvoice.items
      .map((item) => ({ ...item, description: item.description.trim() }))
      .filter((item) => item.description.length > 0);

    if (cleanedItems.length === 0) {
      setCreateError("Add at least one line item description.");
      return;
    }

    try {
      await createInvoice(
        workspaceId,
        {
          invoice_number: draftInvoice.invoice_number.trim(),
          organization_id: draftInvoice.organization_id || null,
          project_id: draftInvoice.project_id || null,
          issue_date: draftInvoice.issue_date,
          due_date: draftInvoice.due_date || null,
          status: draftInvoice.status,
        },
        cleanedItems.map((item) => ({
          description: item.description,
          qty: Number(item.qty) || 0,
          rate: Number(item.rate) || 0,
          unit: item.unit || null,
        })),
      );
      setIsCreateOpen(false);
      setActiveInvoiceId(null);
      await fetchInvoices();
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create invoice");
    }
  };

  if (loading) {
    return (
      <div className="hub-body invoices-page">
        <p style={{ padding: "2rem" }}>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="hub-body invoices-page">
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

      <header className="page-header invoices-page-header">
        <div>
          <h1>Invoices</h1>
          <p className="page-subtitle">
            Track payments, issue bills, and manage revenue
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary invoices-create-btn"
            onClick={openCreateForm}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Invoice
          </button>
        </div>
      </header>

      <div className="invoice-summary-row">
        <div className="invoice-summary-card">
          <span className="invoice-summary-label">Outstanding</span>
          <span className="invoice-summary-value">
            {formatCurrency(totals.outstanding)}
          </span>
        </div>
        <div className="invoice-summary-card overdue">
          <span className="invoice-summary-label">Overdue</span>
          <span className="invoice-summary-value">
            {formatCurrency(totals.overdue)}
          </span>
        </div>
        <div className="invoice-summary-card paid">
          <span className="invoice-summary-label">Collected</span>
          <span className="invoice-summary-value">
            {formatCurrency(totals.collected)}
          </span>
        </div>
      </div>

      <div className="invoice-filters invoices-filter-row">
        {(["all", "Draft", "Sent", "Paid", "Overdue"] as const).map((f) => (
          <button
            key={f}
            className={`invoice-filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All Invoices" : f}
          </button>
        ))}
        <div className="invoices-controls">
          <input
            className="input-field invoices-search-input"
            placeholder="Search invoice, client, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SelectDropdown
            className="input-field invoices-sort-select"
            value={sortBy}
            onChange={(val) => setSortBy(val as typeof sortBy)}
            options={[
              { value: "issued-desc", label: "Newest issued" },
              { value: "due-asc", label: "Due soonest" },
              { value: "amount-desc", label: "Highest amount" }
            ]}
          />
        </div>
      </div>

      <div className="split-view invoices-split-view">
        <div className="split-list invoices-split-list">
          {sortedInvoices.map((inv) => {
            const sum = calcTotal(inv.items);
            return (
              <button
                key={inv.dbId}
                className={`split-list-item invoices-list-item ${activeInvoice?.dbId === inv.dbId ? "active" : ""}`}
                onClick={() => setActiveInvoiceId(inv.dbId)}
              >
                <div className="quote-item-header">
                  <span className="quote-item-id">{inv.id}</span>
                  <span
                    className={`status-badge status-${inv.status.toLowerCase()}`}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="quote-item-client">{inv.client}</div>
                <div className="quote-item-project">{inv.project}</div>
                <div className="quote-item-footer">
                  <span className="quote-item-date">
                    {formatDate(inv.date)}
                  </span>
                  <span
                    className={`quote-item-total invoices-total-${inv.status.toLowerCase()}`}
                  >
                    {formatCurrency(sum)}
                  </span>
                </div>
              </button>
            );
          })}
          {sortedInvoices.length === 0 && (
            <div className="invoices-empty-list">No invoices found.</div>
          )}
        </div>

        <div className="split-detail card invoices-detail-panel">
          {activeInvoice ? (
            <div className="quote-editor invoices-editor-shell">
              <div className="invoices-doc-toolbar">
                <div>
                  <h2 className="invoices-doc-id">{activeInvoice.id}</h2>
                  <div className="invoices-doc-meta">
                    <span
                      className={`status-badge status-${activeInvoice.status.toLowerCase()}`}
                    >
                      {activeInvoice.status}
                    </span>
                    <span>
                      Issued: {formatDate(activeInvoice.date)}
                      {activeInvoice.dueDate &&
                        ` \u2022 Due: ${formatDate(activeInvoice.dueDate)}`}
                    </span>
                  </div>
                </div>
                <div className="invoices-doc-actions">
                  <button className="btn btn-outline invoices-doc-btn">
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
                    PDF
                  </button>
                  {activeInvoice.status !== "Paid" && (
                    <button
                      className="btn btn-primary invoices-doc-btn invoices-mark-paid-btn"
                      onClick={markInvoicePaid}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12l3 3 5-5" />
                      </svg>
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>

              <div className="invoices-meta-grid">
                <div className="invoices-meta-card">
                  <span className="invoices-meta-label">Bill To</span>
                  <strong className="invoices-meta-name">
                    {activeInvoice.client}
                  </strong>
                  <span className="invoices-meta-copy">
                    Project: {activeInvoice.project}
                  </span>
                </div>
                <div className="invoices-meta-card invoices-meta-right">
                  <span className="invoices-meta-label">From</span>
                  <strong className="invoices-meta-name">
                    SiteSurveyor User
                  </strong>
                  <span className="invoices-meta-copy">Harare, Zimbabwe</span>
                </div>
              </div>

              <div className="quote-lines-container">
                <table className="quote-table invoices-lines-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="invoices-col-qty">Qty</th>
                      <th className="invoices-col-unit">Unit</th>
                      <th className="invoices-col-rate">Rate ($)</th>
                      <th className="invoices-col-total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="invoices-cell-desc">
                          {item.description}
                        </td>
                        <td className="invoices-col-qty">{item.qty}</td>
                        <td className="invoices-col-unit">{item.unit}</td>
                        <td className="invoices-col-rate">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="invoices-col-total invoices-cell-total">
                          {formatCurrency(item.qty * item.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="quote-summary invoices-summary">
                <div className="quote-summary-row invoices-summary-row">
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(calcTotal(activeInvoice.items))}
                  </span>
                </div>
                <div className="quote-summary-row invoices-summary-row">
                  <span>VAT (15%)</span>
                  <span>
                    {formatCurrency(calcTotal(activeInvoice.items) * 0.15)}
                  </span>
                </div>
                <div className="quote-summary-row quote-summary-total invoices-summary-total">
                  <span>Amount Due</span>
                  <span>
                    {formatCurrency(calcTotal(activeInvoice.items) * 1.15)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--border-heavy)"
                strokeWidth="1"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>No Invoice Selected</h3>
              <p>Select an invoice from the left to view details.</p>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="invoices-create-overlay" role="dialog" aria-modal="true">
          <div className="invoices-create-modal">
            <div className="invoices-create-header">
              <h3>Create Invoice</h3>
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
                placeholder="Invoice number (e.g. INV-2026-020)"
                value={draftInvoice.invoice_number}
                onChange={(e) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    invoice_number: e.target.value,
                  })
                }
              />
              <SelectDropdown
                className="input-field"
                value={draftInvoice.organization_id}
                onChange={(val) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    organization_id: val,
                  })
                }
                options={[
                  { value: "", label: "Select Client (Organization)" },
                  ...organizations.map(org => ({ value: org.id, label: org.name }))
                ]}
              />
              <SelectDropdown
                className="input-field"
                value={draftInvoice.project_id}
                onChange={(val) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    project_id: val,
                  })
                }
                options={[
                  { value: "", label: "Select Project (optional)" },
                  ...projectOptions.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <input
                type="date"
                className="input-field"
                value={draftInvoice.issue_date}
                onChange={(e) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    issue_date: e.target.value,
                  })
                }
              />
              <input
                type="date"
                className="input-field"
                value={draftInvoice.due_date}
                onChange={(e) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    due_date: e.target.value,
                  })
                }
              />
              <SelectDropdown
                className="input-field invoices-sort-select"
                value={draftInvoice.status}
                onChange={(val) =>
                  setDraftInvoice({
                    ...draftInvoice,
                    status: val as "draft" | "sent",
                  })
                }
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent" }
                ]}
              />
            </div>

            <div className="invoices-create-lines">
              {draftInvoice.items.map((item) => (
                <div key={item.id} className="invoices-create-line-row">
                  <input
                    className="input-field"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateDraftItem(item.id, "description", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) =>
                      updateDraftItem(item.id, "qty", Number(e.target.value))
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) =>
                      updateDraftItem(item.id, "unit", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) =>
                      updateDraftItem(item.id, "rate", Number(e.target.value))
                    }
                  />
                  <button
                    className="invoices-line-remove-btn"
                    onClick={() => removeDraftItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="btn btn-outline invoices-add-line-btn"
                onClick={addDraftItem}
              >
                Add Line Item
              </button>
            </div>

            <div className="invoices-create-footer">
              <div className="invoices-create-total">
                Total:{" "}
                {formatCurrency(calcTotal(draftInvoice.items) * 1.15)}
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
                  onClick={submitCreateInvoice}
                >
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
