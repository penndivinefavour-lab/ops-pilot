'use client';

import StatusBadge from './StatusBadge';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: boolean;
}

function StatCard({ label, value, sub, trend, accent }: StatCardProps) {
  return (
    <div className="bg-ops-surface rounded-lg border border-ops-border p-4">
      <div className="text-ops-muted text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? 'text-ops-accent' : 'text-ops-foreground'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-ops-muted text-sm">{sub}</div>}
      {trend && (
        <div className={`mt-1 text-xs ${trend === 'up' ? 'text-ops-green' : trend === 'down' ? 'text-ops-red' : 'text-ops-muted'}`}>
          {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
        </div>
      )}
    </div>
  );
}

interface DashboardProps {
  snapshot: NonNullable<ReturnType<typeof import('./useOperationsSnapshot').useOperationsSnapshot>>;
}

export default function Dashboard({ snapshot }: DashboardProps) {
  const { overallStatus, projects, tasks, incidents, approvals, recentActivity } = snapshot;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Operations Overview</h1>
            <p className="text-ops-muted text-sm mt-0.5">Human-agent operations at a glance</p>
          </div>
          <StatusBadge status={overallStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projects" value={projects.total} sub={`${projects.byStatus['active'] || 0} active · ${projects.byStatus['blocked'] || 0} blocked`} accent />
        <StatCard label="Tasks" value={tasks.total} sub={`${tasks.open} open · ${tasks.blocked} blocked · ${tasks.overdue} overdue`} />
        <StatCard label="Incidents" value={incidents.total} sub={`${incidents.open} open · ${incidents.critical} critical`} trend={incidents.critical > 0 ? 'down' : 'neutral'} />
        <StatCard label="Pending Approvals" value={approvals.pending} sub="Awaiting human decision" accent />
      </div>

      <div>
        <h2 className="text-sm font-medium uppercase tracking-wide text-ops-muted mb-3">Recent Agent Activity</h2>
        <div className="bg-ops-surface rounded-lg border border-ops-border divide-y divide-ops-border">
          {recentActivity.length === 0 && (
            <div className="p-6 text-ops-muted text-sm text-center">No recent activity.</div>
          )}
          {recentActivity.map((event) => (
            <div key={event.id} className="px-4 py-3 flex items-start gap-3">
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${event.actorType === 'human' ? 'bg-ops-accent' : 'bg-ops-purple'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ops-foreground truncate">{event.description}</p>
                <p className="text-xs text-ops-muted mt-0.5">
                  {event.actorName} ·{' '}
                  {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-ops-muted mb-3">Projects by Status</h2>
          <div className="bg-ops-surface rounded-lg border border-ops-border divide-y divide-ops-border">
            {Object.entries(projects.byStatus).length === 0 && (
              <div className="p-6 text-ops-muted text-sm text-center">No projects yet.</div>
            )}
            {Object.entries(projects.byStatus).map(([status, count]) => (
              <div key={status} className="px-4 py-3 flex items-center justify-between">
                <span className="capitalize text-sm">{status}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-ops-muted mb-3">Operational Health</h2>
          <div className="bg-ops-surface rounded-lg border border-ops-border p-4">
            <p className="text-sm text-ops-muted mb-3">Current operational posture across projects, tasks, and incidents.</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ops-muted">Blocker count</span><span className="font-medium">{tasks.blocked}</span></div>
              <div className="flex justify-between"><span className="text-ops-muted">Open incidents</span><span className="font-medium">{incidents.open}</span></div>
              <div className="flex justify-between"><span className="text-ops-muted">Critical incidents</span><span className="font-medium text-ops-red">{incidents.critical}</span></div>
              <div className="flex justify-between"><span className="text-ops-muted">Pending approvals</span><span className="font-medium text-ops-amber">{approvals.pending}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
