import { createClient, SupabaseClient } from '@supabase/supabase-js';

function createSupabaseClient(url: string, key: string, options?: Record<string, unknown>): SupabaseClient {
  return createClient(url, key, options ?? {});
}

export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'ops-pilot-service/1.0.0' } },
  });
}

export function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'ops-pilot-anon/1.0.0' } },
  });
}

// ─── Data types ────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: string;
  avatar_color: string;
  created_at: string;
}

export interface Project {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description: string;
  owner_id: number;
  status: string;
  progress: number;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  uuid: string;
  title: string;
  description: string;
  assignee_id: number | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: number;
  uuid: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  project_id: number | null;
  owner_id: number | null;
  resolution: string;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: number;
  uuid: string;
  action_type: string;
  target_type: string;
  target_id: number;
  reason: string;
  expected_impact: string;
  risk: string;
  agent_recommendation: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: number;
  uuid: string;
  approval_id: number;
  tool_name: string;
  input_snapshot: string;
  result_snapshot: string;
  status: string;
  error_text: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ActivityEvent {
  id: number;
  uuid: string;
  actor_type: string;
  actor_name: string;
  event_type: string;
  description: string;
  detail: string;
  created_at: string;
}

// ─── Row mappers ───────────────────────────────────────────────────────────────

export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    name: (row.name as string) ?? '',
    email: (row.email as string) ?? '',
    role: (row.role as string) ?? 'operator',
    avatar_color: (row.avatar_color as string) ?? '#38bdf8',
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    name: (row.name as string) ?? '',
    slug: (row.slug as string) ?? '',
    description: (row.description as string) ?? '',
    owner_id: row.owner_id as number,
    status: (row.status as string) ?? 'planning',
    progress: (row.progress as number) ?? 0,
    priority: (row.priority as string) ?? 'medium',
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? '',
    assignee_id: row.assignee_id as number | null,
    status: (row.status as string) ?? 'todo',
    priority: (row.priority as string) ?? 'medium',
    due_date: (row.due_date as string) ?? null,
    project_id: row.project_id as number,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? '',
    severity: (row.severity as string) ?? 'medium',
    status: (row.status as string) ?? 'open',
    project_id: row.project_id as number | null,
    owner_id: row.owner_id as number | null,
    resolution: (row.resolution as string) ?? '',
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function rowToApproval(row: Record<string, unknown>): Approval {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    action_type: (row.action_type as string) ?? '',
    target_type: (row.target_type as string) ?? '',
    target_id: row.target_id as number,
    reason: (row.reason as string) ?? '',
    expected_impact: (row.expected_impact as string) ?? '',
    risk: (row.risk as string) ?? 'low',
    agent_recommendation: (row.agent_recommendation as string) ?? '',
    status: (row.status as string) ?? 'pending',
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function rowToAgentAction(row: Record<string, unknown>): AgentAction {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    approval_id: row.approval_id as number,
    tool_name: (row.tool_name as string) ?? '',
    input_snapshot: (row.input_snapshot as string) ?? '{}',
    result_snapshot: (row.result_snapshot as string) ?? '{}',
    status: (row.status as string) ?? 'pending',
    error_text: (row.error_text as string) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    completed_at: (row.completed_at as string) ?? null,
  };
}

export function rowToActivityEvent(row: Record<string, unknown>): ActivityEvent {
  return {
    id: row.id as number,
    uuid: (row.uuid as string) ?? '',
    actor_type: (row.actor_type as string) ?? 'agent',
    actor_name: (row.actor_name as string) ?? 'Agent',
    event_type: (row.event_type as string) ?? '',
    description: (row.description as string) ?? '',
    detail: (row.detail as string) ?? '{}',
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}
