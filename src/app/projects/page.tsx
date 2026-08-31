'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  ownerId: number;
  owner?: { id: number; name: string; avatarColor: string } | null;
  status: string;
  progress: number;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskItem {
  id: number;
  title: string;
  description: string;
  assigneeId: number | null;
  assignee?: { id: number; name: string; avatarColor: string } | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: number;
  project?: { id: number; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const all = data.projects ?? [];
        setProjects(all);
        if (all.length) setSelected(all[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/projects?id=${selected.id}&analysis=true`)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
        setIncidents(data.incidents ?? []);
      })
      .catch(() => {});
  }, [selected]);

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

  if (!selected) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 px-6 py-6 flex items-center justify-center">
            <div className="text-ops-muted text-sm">Select a project to view details</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Projects</h1>
            <p className="text-ops-muted text-sm mt-0.5">Operational initiatives and their status</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-3">
              {projects.length === 0 && <div className="text-ops-muted text-sm text-center py-8">No projects yet.</div>}
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected?.id === p.id
                      ? 'border-ops-accent bg-ops-accentDim/30'
                      : 'border-ops-border bg-ops-surface hover:bg-ops-surfaceRaised'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-ops-muted mt-0.5 line-clamp-2">{p.description}</p>
                    </div>
                    <StatusChip status={p.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-ops-muted">
                      <span>{p.priority}</span>
                      <span>·</span>
                      <span>{p.progress}%</span>
                    </div>
                    {p.owner && <span className="text-xs text-ops-muted">{p.owner.name}</span>}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-ops-muted text-sm mt-0.5">{selected.description}</p>
                </div>
                <StatusChip status={selected.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Stat label="Status" value={selected.status} />
                <Stat label="Progress" value={`${selected.progress}%`} />
                <Stat label="Priority" value={selected.priority} />
                <Stat label="Owner" value={selected.owner?.name ?? '—'} />
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-ops-muted">Tasks</h3>
                  <span className="text-xs text-ops-muted">{tasks.length} total</span>
                </div>
                {tasks.length === 0 ? (
                  <div className="text-ops-muted text-sm text-center py-4 border border-ops-border rounded-lg bg-ops-surface">No tasks in this project.</div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-ops-border bg-ops-surface">
                        <TaskStatusIcon status={t.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-ops-muted mt-0.5">
                            {t.status} · {t.priority}
                            {t.dueDate ? ` · due ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {t.assignee ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.assignee.avatarColor }} />
                                {t.assignee.name}
                              </span>
                            ) : (
                              <span className="text-xs text-ops-muted italic">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-ops-muted">Incidents</h3>
                  <span className="text-xs text-ops-muted">{incidents.length} total</span>
                </div>
                {incidents.length === 0 ? (
                  <div className="text-ops-muted text-sm text-center py-4 border border-ops-border rounded-lg bg-ops-surface">No incidents in this project.</div>
                ) : (
                  <div className="space-y-2">
                    {incidents.map((inc) => (
                      <div key={inc.id} className="flex items-start gap-3 p-3 rounded-lg border border-ops-border bg-ops-surface">
                        <IncidentSeverityIcon severity={inc.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{inc.title}</p>
                          <p className="text-xs text-ops-muted mt-0.5">
                            {inc.severity} · {inc.status}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {inc.owner ? (
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: inc.owner.avatarColor }} />
                                {inc.owner.name}
                              </span>
                            ) : (
                              <span className="text-xs text-ops-muted">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    planning: 'bg-ops-muted',
    active: 'bg-ops-green',
    'at risk': 'bg-ops-amber',
    blocked: 'bg-ops-red',
    completed: 'bg-ops-purple',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-ops-muted'} text-white`}>
      {status}
    </span>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  const icons: Record<string, string> = {
    todo: '○',
    'in_progress': '◉',
    blocked: '⚠',
    completed: '✓',
  };
  return (
    <span className={`text-base ${status === 'blocked' ? 'text-ops-red' : status === 'completed' ? 'text-ops-green' : status === 'in_progress' ? 'text-ops-accent' : 'text-ops-muted'}`}>
      {icons[status] ?? '○'}
    </span>
  );
}

function IncidentSeverityIcon({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'text-ops-muted',
    medium: 'text-ops-amber',
    high: 'text-ops-orange',
    critical: 'text-ops-red',
  };
  return (
    <span className={`text-base ${colors[severity] ?? 'text-ops-muted'}`}>
      {severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢'}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-ops-surface rounded-lg border border-ops-border p-3">
      <div className="text-xs text-ops-muted uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-sm font-medium capitalize">{value}</div>
    </div>
  );
}
