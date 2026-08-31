'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';

interface IncidentItem {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  projectId: number | null;
  project?: { id: number; name: string; slug: string } | null;
  ownerId: number | null;
  owner?: { id: number; name: string; avatarColor: string } | null;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; severity?: string; query?: string }>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/incidents').then((r) => r.json()),
    ]).then(([data]) => {
      setIncidents(data.incidents ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter.status) params.status = filter.status;
    if (filter.severity) params.severity = filter.severity;
    if (search) params.query = search;
    if (Object.keys(params).length) {
      fetch(`/api/incidents?${new URLSearchParams(params)}`)
        .then((r) => r.json())
        .then((data) => setIncidents(data.incidents ?? []))
        .catch(() => {});
    } else {
      setIncidents([]);
    }
  }, [filter, search]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 px-6 py-6 flex items-center justify-center">
            <div className="text-ops-muted text-sm">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  const filtered = incidents.filter((i) => {
    if (filter.status && i.status !== filter.status) return false;
    if (filter.severity && i.severity !== filter.severity) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
    return (order[a.severity as string] ?? 5) - (order[b.severity as string] ?? 5);
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Incidents</h1>
            <p className="text-ops-muted text-sm mt-0.5">Operational issues and response status</p>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="search"
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground placeholder:text-ops-muted focus:outline-none focus:border-ops-accent"
            />
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value || undefined }))}
              className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground"
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="mitigated">Mitigated</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filter.severity || ''}
              onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value || undefined }))}
              className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground"
            >
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {sorted.length === 0 && !loading && (
            <div className="text-ops-muted text-sm text-center py-12 border border-ops-border rounded-lg bg-ops-surface">No incidents match the current filters.</div>
          )}

          <div className="space-y-2">
            {sorted.map((inc) => (
              <div key={inc.id} className="flex items-start gap-3 p-4 rounded-lg border border-ops-border bg-ops-surface hover:bg-ops-surfaceRaised transition-colors">
                <SeverityBadge severity={inc.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate pr-2">{inc.title}</p>
                    <span className="text-xs text-ops-muted whitespace-nowrap">#{inc.id}</span>
                  </div>
                  <p className="text-xs text-ops-muted mt-0.5 line-clamp-2">{inc.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-ops-muted">
                    {inc.project && <span className="bg-ops-surfaceRaised px-2 py-0.5 rounded">{inc.project.name}</span>}
                    <StatusBadge status={inc.status} />
                    {inc.owner ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: inc.owner.avatarColor }} />
                        {inc.owner.name}
                      </span>
                    ) : (
                      <span className="italic">Unassigned</span>
                    )}
                    {inc.resolution && <span className="text-ops-green">Resolved: {inc.resolution}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-ops-red',
    high: 'bg-ops-amber',
    medium: 'bg-ops-accent',
    low: 'bg-ops-muted',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[severity] ?? 'bg-ops-muted'} text-white uppercase`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-ops-red',
    investigating: 'bg-ops-amber',
    mitigated: 'bg-ops-accent',
    resolved: 'bg-ops-green',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-ops-muted'} text-white capitalize`}>
      {status}
    </span>
  );
}
