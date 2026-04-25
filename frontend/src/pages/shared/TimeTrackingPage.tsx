import { useState } from 'react'
import '../../styles/pages.css'

interface TimeEntry {
  id: string
  date: string
  project: string
  task: string
  hours: number
  billable: boolean
  notes: string
}

interface ExpenseEntry {
  id: string
  date: string
  category: 'Fuel' | 'Accomodation' | 'Permits/Fees' | 'Meals' | 'Materials' | 'Other'
  project: string
  amount: number
  vendor: string
  reimbursable: boolean
}

const DUMMY_TIME: TimeEntry[] = [
  { id: '1', date: '2026-04-20', project: 'Stand 432 Boundary Verification', task: 'Field Survey', hours: 4.5, billable: true, notes: 'Found 3 of 4 original pegs' },
  { id: '2', date: '2026-04-20', project: 'Stand 432 Boundary Verification', task: 'Data Processing', hours: 2.0, billable: true, notes: 'Drafted General Plan overlay' },
  { id: '3', date: '2026-04-21', project: 'Internal', task: 'Equipment Calibration', hours: 1.5, billable: false, notes: 'Calibrated total station and level' },
  { id: '4', date: '2026-04-22', project: 'Farm 14 Topo', task: 'Field Survey', hours: 8.0, billable: true, notes: 'Completed western boundary and contours' },
]

const DUMMY_EXPENSES: ExpenseEntry[] = [
  { id: '1', date: '2026-04-20', category: 'Fuel', project: 'Stand 432 Boundary Verification', amount: 45.00, vendor: 'Puma Borrowdale', reimbursable: false },
  { id: '2', date: '2026-04-22', category: 'Accomodation', project: 'Farm 14 Topo', amount: 120.00, vendor: 'Chinhoyi Guest House', reimbursable: true },
  { id: '3', date: '2026-04-22', category: 'Permits/Fees', project: 'Farm 14 Topo', amount: 25.00, vendor: 'Rural District Council', reimbursable: true },
]

export default function TimeTrackingPage() {
  const [timeEntries] = useState<TimeEntry[]>(DUMMY_TIME)
  const [expenseEntries] = useState<ExpenseEntry[]>(DUMMY_EXPENSES)
  const [currentWeek] = useState('Apr 20 - Apr 26, 2026')
  const [activeTab, setActiveTab] = useState<'time' | 'expenses'>('time')

  // Calculated Stats
  const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0)
  const billableHours = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
  
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0)
  const reimbursableExpenses = expenseEntries.filter(e => e.reimbursable).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="hub-body">
      <header className="page-header" style={{ padding: 0, marginBottom: '24px' }}>
        <div>
          <h1>Time & Expenses</h1>
          <p className="page-subtitle">Log your daily hours and site costs</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Prev
          </button>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>{currentWeek}</span>
          <button className="btn btn-outline">
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </header>

      {/* Unified Summary Cards */}
      <div className="invoice-summary-row" style={{ marginBottom: '24px' }}>
        <div className="invoice-summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="invoice-summary-label">Total Hours</span>
            <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>{billableHours}h billable</span>
          </div>
          <span className="invoice-summary-value">{totalHours}h</span>
        </div>
        <div className="invoice-summary-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="invoice-summary-label">Total Expenses</span>
            <span style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: 600 }}>${reimbursableExpenses.toLocaleString()} reimbursable</span>
          </div>
          <span className="invoice-summary-value">${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
          
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {activeTab === 'time' ? 'Log Time' : 'Log Expense'}
          </button>
        </div>

        {activeTab === 'time' ? (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Task</th>
                <th>Notes</th>
                <th style={{ textAlign: 'center' }}>Billable</th>
                <th style={{ textAlign: 'right' }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map(e => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{e.project}</td>
                  <td>{e.task}</td>
                  <td style={{ color: 'var(--text)', fontSize: '13px' }}>{e.notes}</td>
                  <td style={{ textAlign: 'center' }}>
                    {e.billable ? <span style={{ color: '#22c55e' }}>✓</span> : <span style={{ color: 'var(--border-heavy)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{e.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Category</th>
                <th>Vendor/Details</th>
                <th style={{ textAlign: 'center' }}>Reimbursable (Bill Client)</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenseEntries.map(e => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{e.project}</td>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      {e.category}
                    </span>
                  </td>
                  <td>{e.vendor}</td>
                  <td style={{ textAlign: 'center' }}>
                    {e.reimbursable ? <span style={{ color: '#1d4ed8', fontWeight: 600, fontSize: '12px' }}>Yes</span> : <span style={{ color: 'var(--border-heavy)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-h)' }}>
                    ${e.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
