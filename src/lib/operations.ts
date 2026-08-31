import { getDb } from '../db/client';
import {
  rowToUser,
  rowToProject,
  rowToTask,
  rowToIncident,
  rowToApproval,
  rowToAgentAction,
  rowToActivityEvent,
} from '../db/schema';

// ─── Types (exported for external use) ─────────────────────────────────────────

export interface OperationsSnapshot {
  overallStatus: 'healthy' | 'attention' | 'critical';
  projects: { total: number; byStatus: Record<string, number> };
  tasks: { total: number; open: number; overdue: number; blocked: number };
  incidents: { total: number; open: number; critical: number };
  approvals: { pending: number };
  recentActivity: Array<{
    id: number;
    actorType: string;
    actorName: string;
    eventType: string;
    description: string;
    createdAt: string;
  }>;
}

export interface SearchTasksParams {
  query?: string;
  status?: string;
  priority?: string;
  assigneeId?: number | null;
  projectId?: number;
  limit?: number;
  offset?: number;
}

export interface TaskWithProject {
  id: number;
  title: string;
  description: string;
  assigneeId: number | null;
  assignee?: { id: number; name: string; avatar_color: string } | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: number;
  project?: { id: number; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: number | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  projectId: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: number | null;
  status?: string;
  priority?: string;
  dueDate?: string | null;
}

export interface SearchIncidentsParams {
  query?: string;
  status?: string;
  severity?: string;
  projectId?: number;
  limit?: number;
  offset?: number;
}

export interface IncidentWithProject {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  projectId: number | null;
  project?: { id: number; name: string; slug: string } | null;
  ownerId: number | null;
  owner?: { id: number; name: string; avatar_color: string } | null;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveIncidentInput {
  resolution?: string;
  status?: 'mitigated' | 'resolved';
}

export interface InvestigateIncidentResult {
  incident: IncidentWithProject;
  relatedTasks: Array<TaskWithProject>;
  relatedProject?: { id: number; name: string; slug: string; status: string; progress: number } | null;
  analysis: string;
}

export interface GetProjectResult {
  project: {
    id: number;
    name: string;
    slug: string;
    description: string;
    ownerId: number;
    owner?: { id: number; name: string; avatar_color: string } | null;
    status: string;
    progress: number;
    priority: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: Array<TaskWithProject>;
  incidents: Array<Record<string, unknown> & { owner?: { id: number; name: string; avatar_color: string } | null }>;
  analysis?: string;
}

export interface AnalyzeProjectResult {
  project: GetProjectResult['project'];
  health: 'healthy' | 'attention' | 'critical';
  blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }>;
  summary: string;
}

export interface FindBlockersResult {
  projectId?: number;
  projectName?: string;
  primaryBlocker?: { type: string; id: number; title: string; status: string; detail: string };
  blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }>;
  recommendation?: string;
}

export interface ApprovalRecord {
  id: number;
  actionType: string;
  targetType: string;
  targetId: number;
  reason: string;
  expectedImpact: string;
  risk: string;
  agentRecommendation: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  target?: { id: number; title: string; status: string; type: string } | null;
}

export interface CreateApprovalInput {
  actionType: string;
  targetType: 'task' | 'incident';
  targetId: number;
  reason: string;
  expectedImpact: string;
  risk: string;
  agentRecommendation: string;
}

export interface ExecuteApprovedActionResult {
  actionId: number;
  approvalId: number;
  toolName: string;
  status: string;
  result: string;
}

export interface ActivityEventRecord {
  id: number;
  actorType: string;
  actorName: string;
  eventType: string;
  description: string;
  detail: string;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Operations ────────────────────────────────────────────────────────────────

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const db = getDb();

  const projectsRows = await db.select<{ id: number; status: string; progress: number }>('projects');
  const projectsByStatus: Record<string, number> = {};
  for (const r of projectsRows) {
    const s = (r as any).status;
    projectsByStatus[s] = (projectsByStatus[s] ?? 0) + 1;
  }
  const projectsTotal = projectsRows.length;

  const tasksRows = await db.select<{ id: number; status: string; due_date: string | null }>('tasks');
  const now = new Date();
  const tasksTotal = tasksRows.length;
  const tasksOpen = tasksRows.filter((r) => (r as any).status === 'todo' || (r as any).status === 'in_progress').length;
  const tasksBlocked = tasksRows.filter((r) => (r as any).status === 'blocked').length;
  const tasksOverdue = tasksRows.filter((r) => {
    const s = (r as any).status;
    const due = (r as any).due_date;
    if (s !== 'todo' && s !== 'in_progress') return false;
    if (!due) return false;
    return new Date(due) < now;
  }).length;

  const incidentsRows = await db.select<{ id: number; severity: string; status: string }>('incidents');
  const incidentsTotal = incidentsRows.length;
  const incidentsOpen = incidentsRows.filter((r) => {
    const s = (r as any).status;
    return s === 'open' || s === 'investigating' || s === 'mitigated';
  }).length;
  const incidentsCritical = incidentsRows.filter((r) => {
    const sev = (r as any).severity;
    const st = (r as any).status;
    return sev === 'critical' && (st === 'open' || st === 'investigating');
  }).length;

  const approvalsRows = await db.select<{ id: number; status: string }>('approvals');
  const approvalsPending = approvalsRows.filter((r) => (r as any).status === 'pending').length;

  const activityRows = await db.select<Record<string, unknown>>('activity_events', { limit: 12 });

  const hasCritical = incidentsCritical > 0;
  const hasAttention = tasksBlocked > 0 || incidentsOpen > 0 || approvalsPending > 0
    || (projectsByStatus['blocked'] && projectsByStatus['blocked'] > 0)
    || (projectsByStatus['at_risk'] && projectsByStatus['at_risk'] > 0);

  let overallStatus: 'healthy' | 'attention' | 'critical' = 'healthy';
  if (hasCritical) overallStatus = 'critical';
  else if (hasAttention) overallStatus = 'attention';

  return {
    overallStatus,
    projects: { total: projectsTotal, byStatus: projectsByStatus },
    tasks: { total: tasksTotal, open: tasksOpen, overdue: tasksOverdue, blocked: tasksBlocked },
    incidents: { total: incidentsTotal, open: incidentsOpen, critical: incidentsCritical },
    approvals: { pending: approvalsPending },
    recentActivity: activityRows.map((r) => ({
      id: r.id as number,
      actorType: r.actor_type as string,
      actorName: r.actor_name as string,
      eventType: r.event_type as string,
      description: r.description as string,
      createdAt: r.created_at as string,
    })),
  };
}

export async function searchTasks(params: SearchTasksParams = {}): Promise<Array<Record<string, unknown> & { assignee?: { id: number; name: string; avatar_color: string } | null }>> {
  const db = getDb();
  const { query, status, priority, assigneeId, projectId, limit = 50, offset = 0 } = params;

  const filters: Record<string, unknown> = {};

  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (assigneeId !== undefined && assigneeId !== null) filters.assignee_id = assigneeId;
  if (projectId !== undefined && projectId !== null) filters.project_id = projectId;

  // Fetch tasks and filter client-side for queries
  const rows = await db.select('tasks', { limit, offset });

  if (query) {
    const q = query.toLowerCase();
    return rows.filter((r: any) => {
      const title = (r.title ?? '').toLowerCase();
      const desc = (r.description ?? '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    }).map((r) => buildTaskRow(r));
  }

  return rows.map((r) => buildTaskRow(r));
}

function buildTaskRow(row: Record<string, unknown>): Record<string, unknown> & { assignee?: { id: number; name: string; avatar_color: string } | null } {
  const item = { ...row };
  if (item.assignee_id == null || item.assignee_name == null) {
    item.assignee = null;
  } else {
    item.assignee = {
      id: item.assignee_id as number,
      name: item.assignee_name as string,
      avatar_color: (item.assignee_avatar_color as string) ?? '#38bdf8',
    };
  }
  delete item.assignee_id;
  delete item.assignee_name;
  delete item.assignee_avatar_color;
  return item;
}

export async function getTask(id: number): Promise<TaskWithProject | null> {
  const db = getDb();
  const row = (await db.selectOne<{ id: number; title: string; description: string; assignee_id: number | null; status: string; priority: string; due_date: string | null; project_id: number; created_at: string; updated_at: string; assignee_name: string | null; assignee_avatar_color: string | null; project_name: string | null; project_slug: string | null }>(
    'tasks',
    undefined,
    { id },
  )) ?? null;
  if (!row) return null;

  const item: TaskWithProject = {
    id: row.id as number,
    title: row.title as string,
    description: row.description as string,
    assigneeId: row.assignee_id as number | null,
    status: row.status as string,
    priority: row.priority as string,
    dueDate: (row.due_date as string) ?? null,
    projectId: row.project_id as number,
    createdAt: (row.created_at as string) ?? nowISO(),
    updatedAt: (row.updated_at as string) ?? nowISO(),
  };

  if (row.assignee_id != null && row.assignee_name != null) {
    item.assignee = {
      id: row.assignee_id as number,
      name: row.assignee_name as string,
      avatar_color: (row.assignee_avatar_color as string) ?? '#38bdf8',
    };
  } else {
    item.assignee = null;
  }

  if (row.project_id != null) {
    item.project = {
      id: row.project_id as number,
      name: row.project_name as string,
      slug: row.project_slug as string,
    };
  }

  return item;
}

export async function createTask(input: CreateTaskInput): Promise<TaskWithProject> {
  const db = getDb();
  const { title, description = '', assigneeId = null, status = 'todo', priority = 'medium', dueDate = null, projectId } = input;

  // Verify project exists
  const proj = await db.selectOne<{ id: number }>('projects', 'id', { id: projectId });
  if (!proj) throw new Error(`Project with id ${projectId} does not exist`);

  const now = nowISO();
  const task = await db.insert<{ id: number; title: string; description: string; assignee_id: number | null; status: string; priority: string; due_date: string | null; project_id: number; created_at: string; updated_at: string }>(
    'tasks',
    {
      title,
      description,
      assignee_id: assigneeId,
      status,
      priority,
      due_date: dueDate,
      project_id: projectId,
      created_at: now,
      updated_at: now,
    },
  );

  const taskResult = await getTask(task.id as number);
  if (!taskResult) throw new Error('Task not found after insert');
  return taskResult;
}

export async function updateTask(id: number, input: UpdateTaskInput): Promise<TaskWithProject> {
  const db = getDb();
  const task = await getTask(id);
  if (!task) throw new Error(`Task with id ${id} does not exist`);

  const fields: string[] = [];
  const values: Record<string, unknown> = {};

  if (input.title !== undefined) { fields.push('title'); values.title = input.title; }
  if (input.description !== undefined) { fields.push('description'); values.description = input.description; }
  if (input.assigneeId !== undefined) { fields.push('assignee_id'); values.assignee_id = input.assigneeId; }
  if (input.status !== undefined) { fields.push('status'); values.status = input.status; }
  if (input.priority !== undefined) { fields.push('priority'); values.priority = input.priority; }
  if (input.dueDate !== undefined) { fields.push('due_date'); values.due_date = input.dueDate; }

  if (fields.length === 0) return task;

  values.updated_at = nowISO();
  const result = await db.updateOne(
    'tasks',
    values,
    { id },
  );

  // Re-fetch to get fresh data
  const updatedTask = await getTask(id);
  if (!updatedTask) throw new Error('Task not found after update');
  return updatedTask;
}

export async function assignTask(id: number, assigneeId: number | null): Promise<TaskWithProject> {
  const db = getDb();
  const task = await getTask(id);
  if (!task) throw new Error(`Task with id ${id} does not exist`);

  if (assigneeId !== null) {
    const user = await db.selectOne<{ id: number }>('users', 'id', { id: assigneeId });
    if (!user) throw new Error(`User with id ${assigneeId} does not exist`);
  }

  // Update assignee; if previously unassigned, move to in_progress
  const newStatus = (task.assigneeId == null && assigneeId !== null) ? 'in_progress' : task.status;
  await db.updateOne(
    'tasks',
    {
      assignee_id: assigneeId,
      status: newStatus,
      updated_at: nowISO(),
    },
    { id },
  );

  const taskResult = await getTask(id);
  if (!taskResult) throw new Error('Task not found after assignment');
  return taskResult;
}

export async function searchIncidents(params: SearchIncidentsParams = {}): Promise<Array<Record<string, unknown> & { owner?: { id: number; name: string; avatar_color: string } | null }>> {
  const db = getDb();
  const { query, status, severity, projectId, limit = 50, offset = 0 } = params;

  const filters: Record<string, unknown> = {};

  if (status) filters.status = status;
  if (severity) filters.severity = severity;
  if (projectId !== undefined && projectId !== null) filters.project_id = projectId;

  const rows = await db.select('incidents', { limit, offset });

  if (query) {
    const q = query.toLowerCase();
    return rows.filter((r: any) => {
      const title = (r.title ?? '').toLowerCase();
      const desc = (r.description ?? '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    }).map((r) => buildIncidentRow(r));
  }

  return rows.map((r) => buildIncidentRow(r));
}

function buildIncidentRow(row: Record<string, unknown>): Record<string, unknown> & { owner?: { id: number; name: string; avatar_color: string } | null } {
  const item = { ...row };
  if (item.owner_id == null || item.owner_name == null) {
    item.owner = null;
  } else {
    item.owner = {
      id: item.owner_id as number,
      name: item.owner_name as string,
      avatar_color: (item.owner_avatar_color as string) ?? '#38bdf8',
    };
  }
  delete item.owner_id;
  delete item.owner_name;
  delete item.owner_avatar_color;
  return item;
}

export async function getIncident(id: number): Promise<IncidentWithProject | null> {
  const db = getDb();
  const row = await db.selectOne(
    'incidents',
    'incidents.*,users.id as owner_id,users.name as owner_name,users.avatar_color as owner_avatar_color,projects.id as project_id,projects.name as project_name,projects.slug as project_slug',
    { id },
  );
  if (!row) return null;

  const item: IncidentWithProject = {
    id: row.id as number,
    title: row.title as string,
    description: row.description as string,
    severity: row.severity as string,
    status: row.status as string,
    projectId: row.project_id as number | null,
    ownerId: row.owner_id as number | null,
    resolution: row.resolution as string ?? '',
    createdAt: (row.created_at as string) ?? nowISO(),
    updatedAt: (row.updated_at as string) ?? nowISO(),
  };

  if (row.owner_id != null && row.owner_name != null) {
    item.owner = {
      id: row.owner_id as number,
      name: row.owner_name as string,
      avatar_color: (row.owner_avatar_color as string) ?? '#38bdf8',
    };
  } else {
    item.owner = null;
  }

  if (row.project_id != null) {
    item.project = {
      id: row.project_id as number,
      name: row.project_name as string,
      slug: row.project_slug as string,
    };
  }

  return item;
}

export async function resolveIncident(id: number, input: ResolveIncidentInput = {}): Promise<IncidentWithProject> {
  const db = getDb();
  const incident = await getIncident(id);
  if (!incident) throw new Error(`Incident with id ${id} does not exist`);
  if (incident.status === 'resolved') throw new Error(`Incident #${id} is already resolved`);

  const { resolution = incident.resolution, status = 'resolved' } = input;
  await db.updateOne(
    'incidents',
    {
      status,
      resolution,
      updated_at: nowISO(),
    },
    { id },
  );

  const incidentResult = await getIncident(id);
  if (!incidentResult) throw new Error('Incident not found after resolution');
  return incidentResult;
}

export async function investigateIncident(id: number): Promise<InvestigateIncidentResult> {
  const db = getDb();
  const incident = await getIncident(id);
  if (!incident) throw new Error(`Incident #${id} does not exist`);

  const tasks = await db.select<Record<string, unknown>>(
    'tasks.*,users.id as assignee_id,users.name as assignee_name,users.avatar_color as assignee_avatar_color,projects.id as project_id,projects.name as project_name,projects.slug as project_slug',
    'tasks,users,projects',
    { limit: 100 },
  );

  const projectTasks = tasks.filter((t) => (t as any).project_id === incident.projectId);
  const relatedTasks: TaskWithProject[] = projectTasks.map((r) => {
    const item: TaskWithProject = {
      id: r.id as number,
      title: r.title as string,
      description: r.description as string,
      assigneeId: r.assignee_id as number | null,
      status: r.status as string,
      priority: r.priority as string,
      dueDate: (r.due_date as string) ?? null,
      projectId: (r as any).project_id as number,
      createdAt: (r.created_at as string) ?? nowISO(),
      updatedAt: (r.updated_at as string) ?? nowISO(),
    };
    if (r.assignee_id != null && r.assignee_name != null) {
      item.assignee = {
        id: r.assignee_id as number,
        name: r.assignee_name as string,
        avatar_color: (r.assignee_avatar_color as string) ?? '#38bdf8',
      };
    }
    if (r.project_id != null) {
      item.project = {
        id: (r as any).project_id as number,
        name: (r as any).project_name as string,
        slug: (r as any).project_slug as string,
      };
    }
    return item;
  });

  const blockedTasks = relatedTasks.filter((t) => t.status === 'blocked');
  const unassignedTasks = relatedTasks.filter((t) => t.assigneeId == null && t.status !== 'completed');

  let analysis = `Incident #${id} is ${incident.status} with ${incident.severity} severity.`;
  if (incident.projectId) {
    analysis += ` It is linked to project #${incident.projectId}.`;
  }
  if (blockedTasks.length) {
    analysis += ` There are ${blockedTasks.length} blocked task(s) in the same project, which are likely contributing to the incident.`;
  }
  if (unassignedTasks.length) {
    analysis += ` ${unassignedTasks.length} task(s) in the project are currently unassigned.`;
  }

  return {
    incident,
    relatedTasks,
    relatedProject: null,
    analysis,
  };
}

export async function getProject(id: number): Promise<GetProjectResult> {
  const db = getDb();
  const row = await db.selectOne(
    'projects',
    'projects.*,users.id as owner_id,users.name as owner_name,users.avatar_color as owner_avatar_color',
    { id },
  );
  if (!row) throw new Error(`Project with id ${id} does not exist`);

  const project = {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string,
    ownerId: row.owner_id as number,
    owner: row.owner_id != null && row.owner_name != null ? {
      id: row.owner_id as number,
      name: row.owner_name as string,
      avatar_color: (row.owner_avatar_color as string) ?? '#38bdf8',
    } : null,
    status: row.status as string,
    progress: (row.progress as number) ?? 0,
    priority: row.priority as string,
    createdAt: (row.created_at as string) ?? nowISO(),
    updatedAt: (row.updated_at as string) ?? nowISO(),
  };

  const tasks = await searchTasks({ projectId: id, limit: 100 });
  const tasksWithProject = tasks.map((t) => {
    (t as any).project = { id, name: project.name, slug: project.slug };
    return t as unknown as TaskWithProject;
  });

  const incidents = await searchIncidents({ projectId: id, limit: 100 });

  return { project, tasks: tasksWithProject, incidents };
}

export async function analyzeProject(id: number): Promise<AnalyzeProjectResult> {
  const db = getDb();
  const { project, tasks, incidents } = await getProject(id);

  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const openIncidents = incidents.filter((i) => {
    const s = (i as any).status;
    return s === 'open' || s === 'investigating';
  });
  const criticalIncidents = incidents.filter((i) => {
    const sev = (i as any).severity;
    const st = (i as any).status;
    return sev === 'critical' && (st === 'open' || st === 'investigating');
  });

  const blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }> = [];

  for (const t of blockedTasks) {
    blockers.push({
      type: 'blocked_task',
      id: t.id,
      title: t.title,
      status: t.status,
      detail: t.description || 'This task is blocking project progress.',
    });
  }

  for (const inc of openIncidents) {
    blockers.push({
      type: 'open_incident',
      id: (inc as any).id as number,
      title: (inc as any).title as string,
      status: (inc as any).status as string,
      detail: (inc as any).description as string || 'This incident is open and may be affecting the project.',
    });
  }

  let health: 'healthy' | 'attention' | 'critical' = 'healthy';
  if (criticalIncidents.length) health = 'critical';
  else if (blockedTasks.length || openIncidents.length) health = 'attention';

  const summary = `Project "${project.name}" is ${project.status} at ${project.progress}% progress. ` +
    (blockers.length ? `${blockers.length} blocker(s) identified.` : 'No active blockers detected.') +
    (criticalIncidents.length ? ` ${criticalIncidents.length} critical incident(s) open.` : '');

  return { project, health, blockers, summary };
}

export async function findBlockers(projectId?: number): Promise<FindBlockersResult> {
  if (!projectId) return { blockers: [] };

  const { project, tasks, incidents } = await getProject(projectId);
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const openIncidents = incidents.filter((i) => {
    const s = (i as any).status;
    return s === 'open' || s === 'investigating';
  });

  const blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }> = [];

  for (const t of blockedTasks) {
    blockers.push({
      type: 'blocked_task',
      id: t.id,
      title: t.title,
      status: t.status,
      detail: t.description || 'This task is blocking project progress.',
    });
  }

  for (const inc of openIncidents) {
    blockers.push({
      type: 'open_incident',
      id: (inc as any).id as number,
      title: (inc as any).title as string,
      status: (inc as any).status as string,
      detail: (inc as any).description as string || 'This incident is open and may be affecting the project.',
    });
  }

  const primaryBlocker = blockers[0] ?? undefined;
  let recommendation: string | undefined;
  if (primaryBlocker?.type === 'blocked_task') {
    recommendation = `The primary blocker is a blocked task. Reassigning or unblocking this task is likely to move the project forward.`;
  } else if (primaryBlocker?.type === 'open_incident') {
    recommendation = `The primary blocker is an open incident. Investigating or mitigating this incident should reduce project risk.`;
  }

  return {
    projectId,
    projectName: project.name,
    primaryBlocker,
    blockers,
    recommendation,
  };
}

export async function getPendingApprovals(): Promise<Array<ApprovalRecord>> {
  const db = getDb();
  const rows = await db.select<Record<string, unknown>>(
    'approvals.*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status',
    'approvals,tasks,incidents',
    { limit: 100 },
  );

  const pending = rows.filter((r) => (r as any).status === 'pending');

  return pending.map((r) => {
    const rec: ApprovalRecord = {
      id: (r as any).id as number,
      actionType: (r as any).action_type as string,
      targetType: (r as any).target_type as string,
      targetId: (r as any).target_id as number,
      reason: (r as any).reason as string,
      expectedImpact: (r as any).expected_impact as string,
      risk: (r as any).risk as string,
      agentRecommendation: (r as any).agent_recommendation as string,
      status: (r as any).status as string,
      createdAt: (r as any).created_at as string,
      updatedAt: (r as any).updated_at as string,
      target: null,
    };

    if ((r as any).target_type === 'task' && (r as any).task_title) {
      rec.target = {
        id: (r as any).target_id as number,
        title: (r as any).task_title as string,
        status: (r as any).task_status as string,
        type: 'task' as const,
      };
    } else if ((r as any).target_type === 'incident' && (r as any).incident_title) {
      rec.target = {
        id: (r as any).target_id as number,
        title: (r as any).incident_title as string,
        status: (r as any).incident_status as string,
        type: 'incident' as const,
      };
    }

    return rec;
  });
}

export async function createApproval(input: CreateApprovalInput): Promise<ApprovalRecord> {
  const db = getDb();
  const { actionType, targetType, targetId, reason, expectedImpact, risk, agentRecommendation } = input;
  const now = nowISO();

  const approval = await db.insert<Record<string, unknown>>(
    'approvals',
    {
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      reason,
      expected_impact: expectedImpact,
      risk,
      agent_recommendation: agentRecommendation,
      status: 'pending',
      created_at: now,
      updated_at: now,
    },
  );

  const pending = await getPendingApprovals();
  return pending.find((a) => a.id === (approval.id as number)) ?? approval as unknown as ApprovalRecord;
}

export async function approveApproval(approvalId: number, actorName = 'Human'): Promise<ApprovalRecord | null> {
  const db = getDb();
  const approval = await db.selectOne<Record<string, unknown>>('approvals', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: approvalId });
  if (!approval) return null;
  if ((approval as any).status !== 'pending') return null;

  await db.updateOne(
    'approvals',
    { status: 'approved', updated_at: nowISO() },
    { id: approvalId },
  );

  await addActivityEvent('human', actorName, 'approval_given', `Approved approval #${approvalId} (${(approval as any).action_type})`, { approvalId, actionType: (approval as any).action_type });

  const updated = await db.selectOne('approvals', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: approvalId });
  if (!updated) return null;

  const rec: ApprovalRecord = {
    id: (updated as any).id as number,
    actionType: (updated as any).action_type as string,
    targetType: (updated as any).target_type as string,
    targetId: (updated as any).target_id as number,
    reason: (updated as any).reason as string,
    expectedImpact: (updated as any).expected_impact as string,
    risk: (updated as any).risk as string,
    agentRecommendation: (updated as any).agent_recommendation as string,
    status: (updated as any).status as string,
    createdAt: (updated as any).created_at as string,
    updatedAt: (updated as any).updated_at as string,
    target: null,
  };

  if ((updated as any).target_type === 'task' && (updated as any).task_title) {
    rec.target = {
      id: (updated as any).target_id as number,
      title: (updated as any).task_title as string,
      status: (updated as any).task_status as string,
      type: 'task' as const,
    };
  } else if ((updated as any).target_type === 'incident' && (updated as any).incident_title) {
    rec.target = {
      id: (updated as any).target_id as number,
      title: (updated as any).incident_title as string,
      status: (updated as any).incident_status as string,
      type: 'incident' as const,
    };
  }

  return rec;
}

export async function rejectApproval(approvalId: number, actorName = 'Human'): Promise<ApprovalRecord | null> {
  const db = getDb();
  const approval = await db.selectOne('approvals', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: approvalId });
  if (!approval) return null;
  if ((approval as any).status !== 'pending') return null;

  await db.updateOne(
    'approvals',
    { status: 'rejected', updated_at: nowISO() },
    { id: approvalId },
  );

  await addActivityEvent('human', actorName, 'approval_rejected', `Rejected approval #${approvalId} (${(approval as any).action_type})`, { approvalId, actionType: (approval as any).action_type });

  const updated = await db.selectOne('approvals', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: approvalId });
  if (!updated) return null;

  const rec: ApprovalRecord = {
    id: (updated as any).id as number,
    actionType: (updated as any).action_type as string,
    targetType: (updated as any).target_type as string,
    targetId: (updated as any).target_id as number,
    reason: (updated as any).reason as string,
    expectedImpact: (updated as any).expected_impact as string,
    risk: (updated as any).risk as string,
    agentRecommendation: (updated as any).agent_recommendation as string,
    status: (updated as any).status as string,
    createdAt: (updated as any).created_at as string,
    updatedAt: (updated as any).updated_at as string,
    target: null,
  };

  if ((updated as any).target_type === 'task' && (updated as any).task_title) {
    rec.target = {
      id: (updated as any).target_id as number,
      title: (updated as any).task_title as string,
      status: (updated as any).task_status as string,
      type: 'task' as const,
    };
  } else if ((updated as any).target_type === 'incident' && (updated as any).incident_title) {
    rec.target = {
      id: (updated as any).target_id as number,
      title: (updated as any).incident_title as string,
      status: (updated as any).incident_status as string,
      type: 'incident' as const,
    };
  }

  return rec;
}

export async function executeApprovedAction(approvalId: number, toolName: string, inputSnapshot: Record<string, unknown> = {}): Promise<ExecuteApprovedActionResult> {
  const db = getDb();

  const approval = await db.selectOne('approvals', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: approvalId });
  if (!approval) throw new Error(`Approval #${approvalId} does not exist`);
  if ((approval as any).status !== 'approved') throw new Error(`Approval #${approvalId} is not approved`);

  const targetType = (approval as any).target_type as string;
  const targetId = (approval as any).target_id as number;
  const actionType = (approval as any).action_type as string;

  const existingAction = await db.selectOne('agent_actions', 'id', { approval_id: approvalId });
  if (existingAction) throw new Error(`Approval #${approvalId} has already been executed`);

  let resultSnapshot = '{}';
  let errorText: string | null = null;
  let status = 'completed';

  try {
    if (actionType === 'assign_task' && targetType === 'task') {
      const assigneeId = (inputSnapshot.assigneeId as number) ?? null;
      if (assigneeId == null) throw new Error('assigneeId is required for assign_task');
      const task = await assignTask(targetId, assigneeId);
      resultSnapshot = JSON.stringify({ before: { assigneeId: task.assigneeId, status: task.status }, after: { assigneeId: task.assigneeId, status: task.status } });
    } else if (actionType === 'resolve_incident' && targetType === 'incident') {
      const resolution = inputSnapshot.resolution as string | undefined;
      const incident = await resolveIncident(targetId, { resolution });
      resultSnapshot = JSON.stringify({ before: { status: incident.status }, after: { status: incident.status, resolution: incident.resolution } });
    } else if (actionType === 'update_task' && targetType === 'task') {
      const updates: Record<string, unknown> = {};
      if (inputSnapshot.title !== undefined) updates.title = inputSnapshot.title;
      if (inputSnapshot.description !== undefined) updates.description = inputSnapshot.description;
      if (inputSnapshot.assigneeId !== undefined) updates.assigneeId = inputSnapshot.assigneeId;
      if (inputSnapshot.status !== undefined) updates.status = inputSnapshot.status;
      if (inputSnapshot.priority !== undefined) updates.priority = inputSnapshot.priority;
      if (inputSnapshot.dueDate !== undefined) updates.dueDate = inputSnapshot.dueDate;
      const task = await updateTask(targetId, updates as any);
      resultSnapshot = JSON.stringify({ before: null, after: { id: task.id, title: task.title, status: task.status } });
    } else {
      throw new Error(`Unknown action type ${actionType} for target type ${targetType}`);
    }
  } catch (err) {
    status = 'failed';
    errorText = err instanceof Error ? err.message : String(err);
    resultSnapshot = JSON.stringify({ error: errorText });
  }

  const action = await db.insert<Record<string, unknown>>(
    'agent_actions',
    {
      approval_id: approvalId,
      tool_name: toolName,
      input_snapshot: JSON.stringify(inputSnapshot),
      result_snapshot: resultSnapshot,
      status,
      error_text: errorText,
      created_at: nowISO(),
      completed_at: nowISO(),
    },
  );

  const actionId = (action.id as number);

  await addActivityEvent('agent', 'Agent', 'action_executed', `Executed ${actionType} via ${toolName}`, { approvalId, actionId, toolName, status });

  if (status === 'completed') {
    await db.updateOne(
      'approvals',
      { status: 'executed', updated_at: nowISO() },
      { id: approvalId },
    );
  }

  return {
    actionId,
    approvalId,
    toolName,
    status,
    result: resultSnapshot,
  };
}

export async function verifyAction(actionId: number): Promise<{ verified: boolean; result: string }> {
  const db = getDb();
  const action = await db.selectOne<Record<string, unknown>>('agent_actions', '*,tasks.title as task_title,tasks.status as task_status,incidents.title as incident_title,incidents.status as incident_status', { id: actionId });
  if (!action) throw new Error(`Action #${actionId} does not exist`);

  const status = (action as any).status as string;
  if (status === 'pending') return { verified: false, result: 'Action is still pending.' };
  if (status === 'failed') return { verified: false, result: `Action failed: ${(action as any).error_text}` };

  await addActivityEvent('agent', 'Agent', 'action_verified', `Verified action #${actionId}`, { actionId, status });

  return { verified: true, result: `Action #${actionId} completed successfully via ${(action as any).tool_name}.` };
}

export async function getActivityEvents(limit = 50, offset = 0): Promise<Array<ActivityEventRecord>> {
  const db = getDb();
  const rows = await db.select<Record<string, unknown>>(
    'activity_events',
    'id,actor_type,actor_name,event_type,description,detail,created_at',
    { limit, offset },
  );

  return rows.map((r) => ({
    id: (r as any).id as number,
    actorType: (r as any).actor_type as string,
    actorName: (r as any).actor_name as string,
    eventType: (r as any).event_type as string,
    description: (r as any).description as string,
    detail: (r as any).detail as string,
    createdAt: (r as any).created_at as string,
  }));
}

export async function addActivityEvent(actorType: string, actorName: string, eventType: string, description: string, detail: Record<string, unknown> = {}): Promise<number> {
  const db = getDb();
  const row = await db.insert<Record<string, unknown>>(
    'activity_events',
    {
      actor_type: actorType,
      actor_name: actorName,
      event_type: eventType,
      description,
      detail: JSON.stringify(detail),
      created_at: nowISO(),
    },
  );
  return row.id as number;
}

export async function proposeActionPlan(projectId: number): Promise<{
  blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }>;
  recommendation: string;
  actionType: string;
  targetType: string;
  targetId: number | null;
}> {
  const blockersResult = await findBlockers(projectId);
  if (!blockersResult.primaryBlocker) {
    return {
      blockers: [],
      recommendation: 'No blocker identified for this project.',
      actionType: 'none',
      targetType: 'none',
      targetId: null,
    };
  }

  const primary = blockersResult.primaryBlocker;
  let actionType: string;
  let targetType: string;
  let targetId: number | null;

  if (primary.type === 'blocked_task') {
    actionType = 'assign_task';
    targetType = 'task';
    targetId = primary.id;
  } else if (primary.type === 'open_incident') {
    actionType = 'resolve_incident';
    targetType = 'incident';
    targetId = primary.id;
  } else {
    actionType = 'update_task';
    targetType = 'task';
    targetId = primary.id;
  }

  return {
    blockers: blockersResult.blockers,
    recommendation: blockersResult.recommendation || `Address the primary blocker: ${primary.title}.`,
    actionType,
    targetType,
    targetId,
  };
}

export async function requestApproval(params: CreateApprovalInput): Promise<ApprovalRecord> {
  return createApproval(params);
}
