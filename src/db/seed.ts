import { getDb } from './client';
import { rowToProject, rowToTask, rowToIncident } from './schema';

const ATLAS_OWNER_EMAIL = 'maya.chen@acmecorp.example';
export const ATLAS_OWNER_NAME = 'Maya Chen';
export const ATLAS_OWNER_COLOR = '#38bdf8';
const AGENT_EMAIL = 'agent@ops-pilot.internal';
export const ATLAS_PROJECT_NAME = 'Project Atlas';
export const ATLAS_INCIDENT_ID = 104;
export const ATLAS_TASK_ID = 47;
const AGENT_NAME = 'Agent';
const AGENT_COLOR = '#bc8cff';

export async function seedDemoData(): Promise<{
  projectId: number;
  incidentId: number;
  taskId: number;
  ownerId: number;
  agentId: number;
}> {
  const db = getDb();

  // Upsert users (idempotent)
  const ownerUser = await db.upsertOne(
    'users',
    {
      email: ATLAS_OWNER_EMAIL,
      name: ATLAS_OWNER_NAME,
      role: 'operator',
      avatar_color: ATLAS_OWNER_COLOR,
    },
    'email',
  );

  const agentUser = await db.upsertOne(
    'users',
    {
      email: AGENT_EMAIL,
      name: AGENT_NAME,
      role: 'agent',
      avatar_color: AGENT_COLOR,
    },
    'email',
  );

  const ownerId = (ownerUser as Record<string, unknown>)?.id as number;
  const agentId = (agentUser as Record<string, unknown>)?.id as number;

  // Upsert Project Atlas (idempotent, deterministic slug)
  const project = await db.upsertOne(
    'projects',
    {
      name: 'Project Atlas',
      slug: 'project-atlas',
      description: 'Cross-region customer onboarding platform with automated provisioning and compliance gating.',
      owner_id: ownerId,
      status: 'blocked',
      progress: 72,
      priority: 'high',
    },
    'slug',
  );
  const projectId = (project as Record<string, unknown>).id as number;

  // Upsert Incident #104
  const incident = await db.upsertOne(
    'incidents',
    {
      title: 'Deployment pipeline failure',
      description: 'The CI/CD pipeline rejected the latest production deployment artifact due to a misconfigured deployment manifest. The rollout for the EU region is currently paused while the configuration is restored.',
      severity: 'high',
      status: 'investigating',
      project_id: projectId,
      owner_id: null,
      resolution: '',
    },
    'title',
  );
  const incidentId = (incident as Record<string, unknown>).id as number;

  // Upsert Task #47
  const task47 = await db.upsertOne(
    'tasks',
    {
      title: 'Restore deployment configuration',
      description: 'Update the deployment manifest to reference the correct artifact registry endpoint and regenerate the signed deployment bundle. This task is currently unassigned and blocking the EU rollout.',
      assignee_id: null,
      status: 'blocked',
      priority: 'high',
      due_date: '2026-09-03',
      project_id: projectId,
    },
    'title',
  );
  const taskId = (task47 as Record<string, unknown>).id as number;

  // Insert task dependency: task47 depends on incident
  await db.insert('task_dependencies', {
    task_id: taskId,
    depends_on_id: incidentId,
  }).catch(() => {
    // Ignore duplicate
  });

  // Upsert baseline task
  const baselineTask = await db.upsertOne(
    'tasks',
    {
      title: 'Roll out EU region customers',
      description: 'Onboard the remaining EU-region customer cohort once the deployment configuration is restored and the pipeline revalidates successfully.',
      assignee_id: null,
      status: 'todo',
      priority: 'high',
      due_date: '2026-09-10',
      project_id: projectId,
    },
    'title',
  );

  const baselineTaskId = (baselineTask as Record<string, unknown>).id as number;

  await db.insert('task_dependencies', {
    task_id: baselineTaskId,
    depends_on_id: taskId,
  }).catch(() => {});

  // Additional incidents
  await db.upsertOne(
    'incidents',
    {
      title: 'EU rollout KPI delay',
      description: 'Customer onboarding KPIs for the EU cohort have slipped because the deployment pipeline is blocked. The mitigation plan is to restore the deployment configuration and re-run the validation stage.',
      severity: 'medium',
      status: 'open',
      project_id: projectId,
      owner_id: null,
      resolution: '',
    },
    'title',
  );

  await db.upsertOne(
    'incidents',
    {
      title: 'Expired certificate on staging endpoint',
      description: 'The staging endpoint certificate expired during the last deployment attempt. This is tracked separately and does not block production yet.',
      severity: 'low',
      status: 'open',
      project_id: projectId,
      owner_id: null,
      resolution: '',
    },
    'title',
  );

  // Additional projects
  await db.upsertOne(
    'projects',
    {
      name: 'Platform Hardening',
      slug: 'platform-hardening',
      description: 'Improve observability, reduce mean time to recovery, and formalize incident response playbooks across all production services.',
      owner_id: ownerId,
      status: 'active',
      progress: 41,
      priority: 'medium',
    },
    'slug',
  );

  await db.upsertOne(
    'projects',
    {
      name: 'Internal Tooling Refresh',
      slug: 'internal-tooling-refresh',
      description: 'Replace legacy internal dashboards with a unified operations workspace. This project is on track.',
      owner_id: ownerId,
      status: 'active',
      progress: 68,
      priority: 'low',
    },
    'slug',
  );

  // Pending approval for Task #47
  await db.upsertOne(
    'approvals',
    {
      action_type: 'assign_task',
      target_type: 'task',
      target_id: taskId,
      reason: 'The current owner is unavailable and the deployment configuration task is blocking the EU rollout. Reassign to an available qualified operator to unblock the project.',
      expected_impact: 'Task status moves to in_progress and the primary blocker for Project Atlas is cleared.',
      risk: 'low',
      agent_recommendation: 'Reassign Task #47 to Sarah Okonkwo, who is available and has successfully restored deployment configurations before.',
      status: 'pending',
    },
    'target_id',
  ).catch(() => {});

  // Activity event
  await db.insert('activity_events', {
    actor_type: 'system',
    actor_name: 'OpsPilot',
    event_type: 'workspace_ready',
    description: 'OpsPilot workspace is ready. Project Atlas scenario is seeded.',
    detail: JSON.stringify({ projectId, incidentId, taskId, ownerId }),
  }).catch(() => {});

  console.log('[OpsPilot] Seeded demo data: projectId=', projectId, 'incidentId=', incidentId, 'taskId=', taskId);
  return { projectId, incidentId, taskId, ownerId, agentId };
}
