import { useState, useEffect, useCallback } from "react";
import { listInvoices } from "../../lib/repositories/invoices.ts";
import type { InvoiceWithDetails } from "../../lib/repositories/invoices.ts";
import { createPayment, listPayments } from "../../lib/repositories/payments.ts";
import type { PaymentWithInvoice } from "../../lib/repositories/payments.ts";
import { hasMinimumRole } from "../../lib/permissions.ts";
import {
  getMyWorkspaceMembership,
  type WorkspaceMemberRow,
} from "../../lib/repositories/workspaces.ts";
import {
  getWorkspaceLicense,
  listLicenseEvents,
  updateWorkspaceLicense,
  type LicenseEvent,
  type LicenseStatus,
  type LicenseTier,
  type WorkspaceLicense,
} from "../../lib/repositories/workspaceLicenses.ts";
import SelectDropdown from "../../components/SelectDropdown.tsx";
import "../../styles/pages.css";

interface PaymentMethod {
  id: string;
  type: "Card" | "Mobile Money";
  label: string;
  detail: string;
  holder?: string;
  expiry?: string;
  isDefault: boolean;
}

interface BillingPageProps {
  workspaceId: string;
}

const METHODS_STORAGE_KEY = "sitesurveyorPaymentMethods";

export default function BillingPage({ workspaceId }: BillingPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    const raw = localStorage.getItem(METHODS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return [
      {
        id: "pm-1",
        type: "Card",
        label: "VISA",
        detail: "\u2022\u2022\u2022\u2022 4242",
        holder: "T. Machingura",
        expiry: "12/28",
        isDefault: true,
      },
      {
        id: "pm-2",
        type: "Mobile Money",
        label: "Mobile Money",
        detail: "+263 77 *** **89",
        isDefault: false,
      },
    ];
  });
  const [history, setHistory] = useState<PaymentWithInvoice[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [membership, setMembership] = useState<WorkspaceMemberRow | null>(null);
  const [license, setLicense] = useState<WorkspaceLicense | null>(null);
  const [licenseEvents, setLicenseEvents] = useState<LicenseEvent[]>([]);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseTierDraft, setLicenseTierDraft] = useState<LicenseTier>("free");
  const [licenseStatusDraft, setLicenseStatusDraft] =
    useState<LicenseStatus>("active");
  const [licenseNotesDraft, setLicenseNotesDraft] = useState("");
  const [savingLicense, setSavingLicense] = useState(false);
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [recordPaymentError, setRecordPaymentError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [newType, setNewType] = useState<"Card" | "Mobile Money">("Card");
  const [newLabel, setNewLabel] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newHolder, setNewHolder] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<
    "date-desc" | "date-asc" | "amount-desc"
  >("date-desc");

  useEffect(() => {
    localStorage.setItem(
      METHODS_STORAGE_KEY,
      JSON.stringify(paymentMethods),
    );
  }, [paymentMethods]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      const data = await listPayments(workspaceId);
      setHistory(data);
    } catch (err: any) {
      setHistoryError(err.message ?? "Failed to load billing history");
    } finally {
      setHistoryLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await listInvoices(workspaceId);
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const fetchLicense = useCallback(async () => {
    try {
      setLicenseError(null);
      const [membershipData, licenseData, eventsData] = await Promise.all([
        getMyWorkspaceMembership(workspaceId),
        getWorkspaceLicense(workspaceId),
        listLicenseEvents(workspaceId),
      ]);
      setMembership(membershipData);
      setLicense(licenseData);
      setLicenseEvents(eventsData);
      if (licenseData) {
        setLicenseTierDraft(licenseData.tier);
        setLicenseStatusDraft(licenseData.status);
        setLicenseNotesDraft(licenseData.notes ?? "");
      }
    } catch (err: any) {
      setLicenseError(err.message ?? "Failed to load license details.");
    } finally {
      setLicenseLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2300);
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const setDefaultMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((method) => ({ ...method, isDefault: method.id === id })),
    );
    showNotice("Default payment method updated.");
  };

  const removeMethod = (id: string) => {
    setPaymentMethods((prev) => {
      const next = prev.filter((method) => method.id !== id);
      if (next.length === 0) return prev;
      if (!next.some((method) => method.isDefault)) next[0].isDefault = true;
      return [...next];
    });
    showNotice("Payment method removed.");
  };

  const resetMethodForm = () => {
    setNewType("Card");
    setNewLabel("");
    setNewDetail("");
    setNewExpiry("");
    setNewHolder("");
  };

  const addMethod = () => {
    if (!newLabel.trim() || !newDetail.trim()) {
      showNotice("Enter both label and details for the new method.");
      return;
    }
    const method: PaymentMethod = {
      id: `pm-${Date.now()}`,
      type: newType,
      label: newLabel.trim(),
      detail: newDetail.trim(),
      holder: newHolder.trim() || undefined,
      expiry: newExpiry.trim() || undefined,
      isDefault: paymentMethods.length === 0,
    };
    setPaymentMethods((prev) => [...prev, method]);
    setIsAddMethodOpen(false);
    resetMethodForm();
    showNotice("Payment method added.");
  };

  const escapeCsv = (value: string | number | null | undefined) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
    return str;
  };

  const downloadStatementCsv = () => {
    const rows = query ? filteredHistory : history;
    if (rows.length === 0) {
      showNotice("No payment records available to export.");
      return;
    }
    const header = [
      "paid_on",
      "invoice_number",
      "payment_method",
      "reference",
      "amount",
      "notes",
    ];
    const csvRows = rows.map((entry) =>
      [
        entry.paid_on,
        entry.invoice_number,
        entry.payment_method,
        entry.reference,
        entry.amount.toFixed(2),
        entry.notes ?? "",
      ]
        .map(escapeCsv)
        .join(","),
    );
    const csv = [header.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `billing-statement-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice("Statement CSV downloaded.");
  };

  const resetRecordPaymentForm = () => {
    setPaymentInvoiceId("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentAmount("");
    setPaymentMethod("");
    setPaymentReference("");
    setPaymentNotes("");
    setRecordPaymentError(null);
  };

  const submitRecordPayment = async () => {
    if (!paymentInvoiceId) {
      setRecordPaymentError("Please select an invoice.");
      return;
    }
    const parsedAmount = Number(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setRecordPaymentError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!paymentDate) {
      setRecordPaymentError("Please select a payment date.");
      return;
    }

    try {
      setRecordingPayment(true);
      setRecordPaymentError(null);
      await createPayment(workspaceId, {
        invoice_id: paymentInvoiceId,
        paid_on: paymentDate,
        amount: parsedAmount,
        payment_method: paymentMethod.trim() || null,
        reference: paymentReference.trim() || null,
        notes: paymentNotes.trim() || null,
      });
      await fetchHistory();
      setIsRecordPaymentOpen(false);
      resetRecordPaymentForm();
      showNotice("Payment recorded.");
    } catch (err: any) {
      setRecordPaymentError(err.message ?? "Failed to record payment.");
    } finally {
      setRecordingPayment(false);
    }
  };

  const canManageLicense = hasMinimumRole(membership?.role, "admin");

  const licenseTierLabel = (license?.tier ?? "free").toUpperCase();
  const licenseStatusLabel = (license?.status ?? "active").replaceAll("_", " ");
  const statusBadgeClass =
    license?.status === "active" || license?.status === "trialing"
      ? "badge-green"
      : license?.status === "past_due"
        ? "badge-yellow"
        : "badge-gray";
  const tierBadgeClass =
    license?.tier === "enterprise"
      ? "badge-purple"
      : license?.tier === "pro"
        ? "badge-blue"
        : "badge-gray";

  const saveLicense = async () => {
    if (!license) return;
    try {
      setSavingLicense(true);
      await updateWorkspaceLicense(workspaceId, {
        tier: licenseTierDraft,
        status: licenseStatusDraft,
        notes: licenseNotesDraft.trim() || null,
      });
      await fetchLicense();
      setIsLicenseModalOpen(false);
      showNotice("Workspace license updated.");
    } catch (err: any) {
      setLicenseError(err.message ?? "Failed to update license.");
    } finally {
      setSavingLicense(false);
    }
  };

  const query = historySearch.trim().toLowerCase();
  const filteredHistory = history
    .filter(
      (entry) =>
        !query ||
        (entry.notes ?? "").toLowerCase().includes(query) ||
        (entry.invoice_number ?? "").toLowerCase().includes(query) ||
        (entry.payment_method ?? "").toLowerCase().includes(query),
    )
    .sort((a, b) => {
      if (historySort === "amount-desc") return b.amount - a.amount;
      if (historySort === "date-asc")
        return (
          new Date(a.paid_on).getTime() - new Date(b.paid_on).getTime()
        );
      return (
        new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()
      );
    });

  const totalCollected = history.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="hub-body billing-page">
      <header className="page-header billing-header">
        <div>
          <h1>Billing & Payments</h1>
          <p className="page-subtitle">
            Manage payment methods and view payment history
          </p>
        </div>
        <div className="header-actions">
          <div className="billing-license-widget" aria-label="Workspace license">
            <span className="billing-license-label">License Plan</span>
            <span className={`badge ${tierBadgeClass}`}>{licenseTierLabel}</span>
            <span className="billing-license-label">Status</span>
            <span className={`badge ${statusBadgeClass}`}>{licenseStatusLabel}</span>
            {canManageLicense && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setIsLicenseModalOpen(true)}
              >
                Manage License
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetRecordPaymentForm();
              setIsRecordPaymentOpen(true);
            }}
            disabled={invoicesLoading || invoices.length === 0}
          >
            Record Payment
          </button>
          <button
            className="btn btn-outline billing-statements-btn"
            onClick={downloadStatementCsv}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Statements
          </button>
        </div>
      </header>
      {notice && <div className="alert-bar alert-warning">{notice}</div>}

      <div className="invoice-summary-row billing-summary-row">
        <div className="invoice-summary-card billing-summary-card balance">
          <div className="billing-summary-head">
            <span className="invoice-summary-label">Payments Recorded</span>
          </div>
          <span className="invoice-summary-value">{history.length}</span>
          <p className="billing-summary-copy">Total payment records</p>
        </div>
        <div className="invoice-summary-card billing-summary-card plan">
          <div className="billing-summary-head">
            <span className="invoice-summary-label">Total Collected</span>
          </div>
          <span className="invoice-summary-value">
            {formatCurrency(totalCollected)}
          </span>
          <p className="billing-summary-copy">
            Across all recorded payments
          </p>
        </div>
      </div>
      {licenseError && <div className="alert-bar alert-warning">{licenseError}</div>}

      {licenseEvents.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header">
            <h3 className="billing-section-title">Recent License Events</h3>
          </div>
          <table className="invoice-table billing-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {licenseEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.created_at)}</td>
                  <td>{event.previous_tier ?? "—"} → {event.new_tier ?? "—"}</td>
                  <td>{event.previous_status ?? "—"} → {event.new_status ?? "—"}</td>
                  <td>{event.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card billing-card">
        <div className="card-header billing-tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`billing-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          >
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`billing-tab-btn ${activeTab === "history" ? "active" : ""}`}
          >
            Payment History
          </button>
        </div>

        {activeTab === "overview" ? (
          <div className="billing-methods-panel">
            <h3 className="billing-section-title">Saved Methods</h3>
            <div className="billing-method-grid">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`billing-method-card ${method.isDefault ? "is-default" : ""}`}
                >
                  {method.isDefault && (
                    <span className="billing-default-badge">Default</span>
                  )}
                  <div className="billing-method-top">
                    <div
                      className={`billing-method-icon ${method.type === "Card" ? "card" : "mobile"}`}
                    >
                      {method.type === "Card" ? method.label : "MM"}
                    </div>
                    <div>
                      <div className="billing-method-label">{method.label}</div>
                      <div className="billing-method-detail">
                        {method.detail}
                      </div>
                    </div>
                  </div>
                  {(method.expiry || method.holder) && (
                    <div className="billing-method-meta">
                      <span>
                        {method.expiry ? `Expires ${method.expiry}` : "\u2014"}
                      </span>
                      <span>{method.holder ?? "\u2014"}</span>
                    </div>
                  )}
                  <div className="billing-method-actions">
                    {!method.isDefault && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setDefaultMethod(method.id)}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => removeMethod(method.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="billing-add-method-btn"
                onClick={() => setIsAddMethodOpen(true)}
              >
                <div className="billing-add-icon">
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
                </div>
                <span>Add Payment Method</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="billing-history-panel">
            <div className="billing-history-controls">
              <input
                className="input-field billing-history-search"
                placeholder="Search by invoice, method, or notes..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <SelectDropdown
                className="input-field billing-history-select"
                value={historySort}
                onChange={(val) =>
                  setHistorySort(val as typeof historySort)
                }
                options={[
                  { value: "date-desc", label: "Newest first" },
                  { value: "date-asc", label: "Oldest first" },
                  { value: "amount-desc", label: "Highest amount" }
                ]}
              />
            </div>
            {historyError && (
              <div
                style={{
                  background: "var(--danger-bg, #fee)",
                  color: "var(--danger, #c00)",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  margin: "0.5rem 1rem",
                }}
              >
                {historyError}
              </div>
            )}
            {historyLoading ? (
              <p style={{ padding: "2rem", textAlign: "center" }}>
                Loading payment history...
              </p>
            ) : (
              <table className="invoice-table billing-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.paid_on)}</td>
                      <td className="billing-history-invoice">
                        {entry.invoice_number ?? "\u2014"}
                      </td>
                      <td>{entry.payment_method ?? "\u2014"}</td>
                      <td>{entry.reference ?? "\u2014"}</td>
                      <td>{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="billing-history-empty">
                        {history.length === 0
                          ? "No payments recorded yet."
                          : "No records match your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {isAddMethodOpen && (
        <div
          className="billing-modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="billing-modal">
            <div className="billing-modal-header">
              <h3>Add Payment Method</h3>
              <button
                className="billing-modal-close"
                onClick={() => setIsAddMethodOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-grid">
              <SelectDropdown
                className="input-field billing-history-select"
                value={newType}
                onChange={(val) =>
                  setNewType(val as typeof newType)
                }
                options={[
                  { value: "Card", label: "Card" },
                  { value: "Mobile Money", label: "Mobile Money" }
                ]}
              />
              <input
                className="input-field"
                placeholder={
                  newType === "Card"
                    ? "Card type (e.g. VISA)"
                    : "Method name"
                }
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <input
                className="input-field"
                placeholder={
                  newType === "Card"
                    ? "Masked number (e.g. \u2022\u2022\u2022\u2022 9876)"
                    : "Phone/account detail"
                }
                value={newDetail}
                onChange={(e) => setNewDetail(e.target.value)}
              />
              {newType === "Card" && (
                <>
                  <input
                    className="input-field"
                    placeholder="Card holder"
                    value={newHolder}
                    onChange={(e) => setNewHolder(e.target.value)}
                  />
                  <input
                    className="input-field"
                    placeholder="Expiry (MM/YY)"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                  />
                </>
              )}
            </div>
            <div className="billing-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setIsAddMethodOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addMethod}>
                Add Method
              </button>
            </div>
          </div>
        </div>
      )}
      {isRecordPaymentOpen && (
        <div className="billing-modal-overlay" role="dialog" aria-modal="true">
          <div className="billing-modal">
            <div className="billing-modal-header">
              <h3>Record Payment</h3>
              <button
                className="billing-modal-close"
                onClick={() => setIsRecordPaymentOpen(false)}
                disabled={recordingPayment}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-grid">
              <SelectDropdown
                className="input-field billing-history-select"
                value={paymentInvoiceId}
                onChange={(val) => setPaymentInvoiceId(val)}
                options={[
                  { value: "", label: "Select invoice" },
                  ...invoices.map((inv) => ({
                    value: inv.id,
                    label: `${inv.invoice_number} - ${formatCurrency(inv.total)}`,
                  })),
                ]}
              />
              <input
                type="date"
                className="input-field"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                placeholder="Amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Payment method (optional)"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Reference (optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Notes (optional)"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            {recordPaymentError && (
              <div className="mkt-post-error">{recordPaymentError}</div>
            )}
            <div className="billing-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setIsRecordPaymentOpen(false)}
                disabled={recordingPayment}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitRecordPayment}
                disabled={recordingPayment}
              >
                {recordingPayment ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isLicenseModalOpen && (
        <div className="billing-modal-overlay" role="dialog" aria-modal="true">
          <div className="billing-modal">
            <div className="billing-modal-header">
              <h3>Update Workspace License</h3>
              <button
                className="billing-modal-close"
                onClick={() => setIsLicenseModalOpen(false)}
                disabled={savingLicense}
              >
                Close
              </button>
            </div>
            <div className="billing-modal-grid">
              <SelectDropdown
                className="input-field billing-history-select"
                value={licenseTierDraft}
                onChange={(val) => setLicenseTierDraft(val as LicenseTier)}
                options={[
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "enterprise", label: "Enterprise" },
                ]}
              />
              <SelectDropdown
                className="input-field billing-history-select"
                value={licenseStatusDraft}
                onChange={(val) => setLicenseStatusDraft(val as LicenseStatus)}
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
                placeholder="Change notes (optional)"
                value={licenseNotesDraft}
                onChange={(e) => setLicenseNotesDraft(e.target.value)}
              />
            </div>
            <div className="billing-modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setIsLicenseModalOpen(false)}
                disabled={savingLicense}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveLicense}
                disabled={savingLicense}
              >
                {savingLicense ? "Saving..." : "Save License"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
