'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';

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

interface Project {
  id: number;
  name: string;
  slug: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; priority?: string; query?: string; projectId?: number }>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([tData, pData]) => {
      setTasks(tData.tasks ?? []);
      setProjects(pData.projects ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter.status) params.status = filter.status;
    if (filter.priority) params.priority = filter.priority;
    if (filter.projectId) params.projectId = String(filter.projectId);
    if (search) params.query = search;
    if (Object.keys(params).length) {
      fetch(`/api/tasks?${new URLSearchParams(params)}`)
        .then((r) => r.json())
        .then((data) => setTasks(data.tasks ?? []))
        .catch(() => {});
    } else {
      setTasks([]);
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

  const filteredTasks = tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.projectId && t.projectId !== filter.projectId) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Tasks</h1>
            <p className="text-ops-muted text-sm mt-0.5">Operational work items across all projects</p>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="search"
              placeholder="Search tasks..."
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
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filter.priority || ''}
              onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value || undefined }))}
              className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filter.projectId ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, projectId: e.target.value ? Number(e.target.value) : undefined }))}
              className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {filteredTasks.length === 0 && !loading && (
            <div className="text-ops-muted text-sm text-center py-12 border border-ops-border rounded-lg bg-ops-surface">No tasks match the current filters.</div>
          )}

          <div className="space-y-2">
            {filteredTasks.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-4 rounded-lg border border-ops-border bg-ops-surface hover:bg-ops-surfaceRaised transition-colors">
                <TaskBadge status={t.status} priority={t.priority} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate pr-2">{t.title}</p>
                    <span className="text-xs text-ops-muted whitespace-nowrap">#{t.id}</span>
                  </div>
                  <p className="text-xs text-ops-muted mt-0.5 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-ops-muted">
                    {t.project && <span className="bg-ops-surfaceRaised px-2 py-0.5 rounded">{t.project.name}</span>}
                    <span>{t.status}</span>
                    <span>{t.priority}</span>
                    {t.dueDate && <span>due {new Date(t.dueDate).toLocaleDateString()}</span>}
                    {t.assignee ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.assignee.avatarColor }} />
                        {t.assignee.name}
                      </span>
                    ) : (
                      <span className="italic">Unassigned</span>
                    )}
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

function TaskBadge({ status, priority }: { status: string; priority: string }) {
  const statusColors: Record<string, string> = {
    todo: 'bg-ops-muted',
    in_progress: 'bg-ops-accent',
    blocked: 'bg-ops-red',
    completed: 'bg-ops-green',
  };
  const priorityColors: Record<string, string> = {
    critical: 'text-ops-red',
    high: 'text-ops-amber',
    medium: 'text-ops-muted',
    low: 'text-ops-muted',
  };
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[status] ?? 'bg-ops-muted'} text-white`}>
        {status}
      </span>
      <span className={`text-xs font-medium ${priorityColors[priority] ?? 'text-ops-muted'}`}>{priority}</span>
    </div>
  );
}
