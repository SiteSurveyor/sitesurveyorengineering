import React from 'react';
import type { ProjectActivity } from '../../../lib/repositories/projects.ts';

interface ProjectDashboardProps {
  kpiData: Array<{ label: string; value: string; sub: string }>;
  activities: ProjectActivity[];
  timelineSummary: { notes: number; actions: number; system: number };
  recentActivities: ProjectActivity[];
  recentActivitySections: ProjectActivity[][];
  overviewActivitySectionIndex: number;
  setOverviewActivitySectionIndex: React.Dispatch<React.SetStateAction<number>>;
  newActivityText: string;
  setNewActivityText: React.Dispatch<React.SetStateAction<string>>;
  submittingActivity: boolean;
  deletingActivityId: string | null;
  handleAddActivity: (e: React.FormEvent) => Promise<void>;
  handleQuickAction: (action: string) => Promise<void>;
  handleDeleteActivity: (id: string) => Promise<void>;
}

export function ProjectDashboard({
  kpiData,
  activities,
  timelineSummary,
  recentActivities,
  recentActivitySections,
  overviewActivitySectionIndex,
  setOverviewActivitySectionIndex,
  newActivityText,
  setNewActivityText,
  submittingActivity,
  deletingActivityId,
  handleAddActivity,
  handleQuickAction,
  handleDeleteActivity,
}: ProjectDashboardProps) {
  return (
    <div className="pd-unified-col">
      <div className="project-dashboard-kpi-grid">
        {kpiData.map(kpi => (
          <article key={kpi.label} className="project-dashboard-kpi-card">
            <span className="project-dashboard-kpi-label">{kpi.label}</span>
            <strong className="project-dashboard-kpi-value">{kpi.value}</strong>
            <span className="project-dashboard-kpi-sub">{kpi.sub}</span>
          </article>
        ))}
      </div>

      <section className="project-dashboard-card" style={{ marginTop: '16px' }}>
        <h3 className="project-dashboard-card-title">Quick Actions</h3>
        <div className="project-dashboard-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('New Field Session')}>
            <span>New Field Session</span>
            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
              {activities.find(a => a.content.includes('Field Session')) ? 'Running' : 'Start'}
            </span>
          </button>
          <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Run Transformation')}>
            <span>Run Transformation</span>
            <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
              {activities.filter(a => a.content.includes('Transformation')).length} runs
            </span>
          </button>
          <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Validate QA')}>
            <span>Validate QA</span>
            <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>
              {Math.max(0, 12 - activities.filter(a => a.content.includes('Validate')).length)} left
            </span>
          </button>
          <button className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => handleQuickAction('Prepare Deliverable')}>
            <span>Prepare Deliverable</span>
            <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
              v1.{activities.filter(a => a.content.includes('Deliverable')).length}
            </span>
          </button>
        </div>
      </section>

      <section className="project-dashboard-card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <h3 className="project-dashboard-card-title" style={{ margin: 0 }}>Activity Feed</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">Notes {timelineSummary.notes}</span>
            <span className="badge badge-green">Actions {timelineSummary.actions}</span>
            <span className="badge badge-gray">System {timelineSummary.system}</span>
          </div>
        </div>
        <div className="project-dashboard-timeline">
          <form onSubmit={handleAddActivity} style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
            <input className="input-field" placeholder="Add a short update..." style={{ height: '36px', fontSize: '13px' }} value={newActivityText} onChange={e => setNewActivityText(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingActivity || !newActivityText.trim()}>Add</button>
          </form>
          {recentActivities.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {recentActivitySections[overviewActivitySectionIndex] && (
                <section style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-blue">Section {overviewActivitySectionIndex + 1}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {recentActivitySections[overviewActivitySectionIndex].length} items
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {overviewActivitySectionIndex + 1} / {recentActivitySections.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {recentActivitySections[overviewActivitySectionIndex].map(log => {
                      const typeBadgeClass =
                        log.activity_type === 'system'
                          ? 'badge-blue'
                          : log.activity_type === 'action'
                            ? 'badge-green'
                            : 'badge-gray'
                      return (
                        <article key={log.id} className="project-feed-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge ${typeBadgeClass}`}>{log.activity_type}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleDeleteActivity(log.id)}
                                disabled={deletingActivityId === log.id}
                                style={{ padding: '2px 8px', lineHeight: 1.2 }}
                              >
                                {deletingActivityId === log.id ? '...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                          <p style={{ margin: '8px 0 4px', fontSize: '13px', color: 'var(--text-h)', lineHeight: 1.45 }}>{log.content}</p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_name}</span>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setOverviewActivitySectionIndex(prev => Math.max(0, prev - 1))}
                  disabled={overviewActivitySectionIndex <= 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setOverviewActivitySectionIndex(prev => Math.min(recentActivitySections.length - 1, prev + 1))}
                  disabled={overviewActivitySectionIndex >= recentActivitySections.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>No activity yet. Add your first project update.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
