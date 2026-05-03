import { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/pages.css";
import {
  createExpenseEntry,
  createTimeEntry,
  listExpenseEntries,
  listTimeEntries,
  type ExpenseEntryRow,
  type TimeEntryRow,
} from "../../lib/repositories/timeTracking.ts";
import { listProjects, type ProjectWithOrg } from "../../lib/repositories/projects.ts";

interface TimeTrackingPageProps {
  workspaceId: string;
}

const expenseCategories = [
  "Fuel",
  "Accommodation",
  "Permits/Fees",
  "Meals",
  "Materials",
  "Other",
] as const;
type ExpenseCategory = (typeof expenseCategories)[number];

export default function TimeTrackingPage({ workspaceId }: TimeTrackingPageProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntryRow[]>([]);
  const [projects, setProjects] = useState<ProjectWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"time" | "expenses">("time");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [timeForm, setTimeForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    project_id: "",
    task: "",
    hours: "1",
    billable: true,
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState<{
    entry_date: string;
    project_id: string;
    category: ExpenseCategory;
    amount: string;
    vendor: string;
    reimbursable: boolean;
    notes: string;
  }>({
    entry_date: new Date().toISOString().slice(0, 10),
    project_id: "",
    category: expenseCategories[0],
    amount: "0",
    vendor: "",
    reimbursable: false,
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [time, expenses, projectRows] = await Promise.all([
        listTimeEntries(workspaceId),
        listExpenseEntries(workspaceId),
        listProjects(workspaceId),
      ]);
      setTimeEntries(time);
      setExpenseEntries(expenses);
      setProjects(projectRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load time tracking data.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculated Stats
  const totalHours = useMemo(
    () => timeEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [timeEntries],
  );
  const billableHours = useMemo(
    () =>
      timeEntries
        .filter((entry) => entry.billable)
        .reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [timeEntries],
  );
  const totalExpenses = useMemo(
    () => expenseEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [expenseEntries],
  );
  const reimbursableExpenses = useMemo(
    () =>
      expenseEntries
        .filter((entry) => entry.reimbursable)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [expenseEntries],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (activeTab === "time") {
        await createTimeEntry(workspaceId, {
          entry_date: timeForm.entry_date,
          task: timeForm.task.trim(),
          hours: Number(timeForm.hours),
          billable: timeForm.billable,
          project_id: timeForm.project_id || null,
          notes: timeForm.notes.trim() || null,
        });
      } else {
        await createExpenseEntry(workspaceId, {
          entry_date: expenseForm.entry_date,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          vendor: expenseForm.vendor.trim() || null,
          reimbursable: expenseForm.reimbursable,
          project_id: expenseForm.project_id || null,
          notes: expenseForm.notes.trim() || null,
        });
      }
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="hub-body">
        <p style={{ padding: "2rem" }}>Loading time and expenses...</p>
      </div>
    );
  }

  return (
    <div className="hub-body">
      {error && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px" }}>
          {error}
        </div>
      )}
      <header className="page-header" style={{ padding: 0, marginBottom: '24px' }}>
        <div>
          <h1>Time & Expenses</h1>
          <p className="page-subtitle">Log your hours and site costs against real projects</p>
        </div>
      </header>

      {/* Unified Summary Cards */}
      <div className="invoice-summary-row" style={{ marginBottom: '24px' }}>
        <div className="invoice-summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="invoice-summary-label">Total Hours</span>
            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>{billableHours}h billable</span>
          </div>
          <span className="invoice-summary-value">{totalHours.toFixed(2)}h</span>
        </div>
        <div className="invoice-summary-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="invoice-summary-label">Total Expenses</span>
            <span style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: 600 }}>${reimbursableExpenses.toLocaleString()} reimbursable</span>
          </div>
          <span className="invoice-summary-value">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => setActiveTab('time')}
              style={{ 
                background: 'none', border: 'none', padding: '0 0 8px 0', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'time' ? 'var(--accent)' : 'var(--text)',
                borderBottom: activeTab === 'time' ? '2px solid var(--accent)' : '2px solid transparent'
              }}
            >
              Timesheet
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              style={{ 
                background: 'none', border: 'none', padding: '0 0 8px 0', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'expenses' ? 'var(--accent)' : 'var(--text)',
                borderBottom: activeTab === 'expenses' ? '2px solid var(--accent)' : '2px solid transparent'
              }}
            >
              Expenses
            </button>
          </div>
          
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowCreateModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {activeTab === 'time' ? 'Log Time' : 'Log Expense'}
          </button>
        </div>

        {activeTab === 'time' ? (
          <div style={{ overflowX: 'auto' }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th className="hide-on-mobile">Task</th>
                <th className="hide-on-mobile">Notes</th>
                <th style={{ textAlign: 'center' }}>Billable</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.entry_date}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{e.projects?.name ?? "Internal"}</td>
                  <td className="hide-on-mobile">{e.task}</td>
                  <td className="hide-on-mobile" style={{ color: 'var(--text)', fontSize: '13px' }}>{e.notes ?? "—"}</td>
                  <td style={{ textAlign: 'center' }}>
                    {e.billable ? <span style={{ color: '#22c55e' }}>✓</span> : <span style={{ color: 'var(--border-heavy)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(e.hours).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Category</th>
                <th className="hide-on-mobile">Vendor/Details</th>
                <th style={{ textAlign: 'center' }}>Reimbursable</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenseEntries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.entry_date}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{e.projects?.name ?? "Internal"}</td>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      {e.category}
                    </span>
                  </td>
                  <td className="hide-on-mobile">{e.vendor ?? "—"}</td>
                  <td style={{ textAlign: 'center' }}>
                    {e.reimbursable ? <span style={{ color: '#1d4ed8', fontWeight: 600, fontSize: '12px' }}>Yes</span> : <span style={{ color: 'var(--border-heavy)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-h)' }}>
                    ${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="hub-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="hub-modal" style={{ width: "560px", maxWidth: "94%" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="hub-modal-title">{activeTab === "time" ? "Log Time" : "Log Expense"}</h2>
            <form className="hub-modal-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={activeTab === "time" ? timeForm.entry_date : expenseForm.entry_date}
                  onChange={(e) =>
                    activeTab === "time"
                      ? setTimeForm((prev) => ({ ...prev, entry_date: e.target.value }))
                      : setExpenseForm((prev) => ({ ...prev, entry_date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select
                  className="input-field"
                  value={activeTab === "time" ? timeForm.project_id : expenseForm.project_id}
                  onChange={(e) =>
                    activeTab === "time"
                      ? setTimeForm((prev) => ({ ...prev, project_id: e.target.value }))
                      : setExpenseForm((prev) => ({ ...prev, project_id: e.target.value }))
                  }
                >
                  <option value="">Internal / Not linked</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === "time" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Task</label>
                    <input
                      className="input-field"
                      value={timeForm.task}
                      onChange={(e) => setTimeForm((prev) => ({ ...prev, task: e.target.value }))}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
                    <div className="form-group">
                      <label className="form-label">Hours</label>
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        className="input-field"
                        value={timeForm.hours}
                        onChange={(e) => setTimeForm((prev) => ({ ...prev, hours: e.target.value }))}
                        required
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", marginBottom: "10px" }}>
                      <input
                        type="checkbox"
                        checked={timeForm.billable}
                        onChange={(e) => setTimeForm((prev) => ({ ...prev, billable: e.target.checked }))}
                      />
                      Billable
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="input-field"
                      value={timeForm.notes}
                      onChange={(e) => setTimeForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="responsive-grid-2">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="input-field"
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm((prev) => ({
                            ...prev,
                            category: e.target.value as ExpenseCategory,
                          }))
                        }
                      >
                        {expenseCategories.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
                    <div className="form-group">
                      <label className="form-label">Vendor</label>
                      <input
                        className="input-field"
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))}
                      />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", marginBottom: "10px" }}>
                      <input
                        type="checkbox"
                        checked={expenseForm.reimbursable}
                        onChange={(e) => setExpenseForm((prev) => ({ ...prev, reimbursable: e.target.checked }))}
                      />
                      Reimbursable
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="input-field"
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
