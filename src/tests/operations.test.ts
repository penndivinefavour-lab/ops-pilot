import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getFakeDb, resetTables } from './fake-db';

// Mock the DB module so operations use fake DB
vi.mock('../db/client', () => {
  let fakeDbInstance: any = null;
  return {
    getDb: () => {
      if (!fakeDbInstance) fakeDbInstance = getFakeDb();
      return fakeDbInstance;
    },
    resetDbCache: () => { fakeDbInstance = null; resetTables(); },
    getServiceRoleClient: () => ({} as any),
    getAnonClient: () => ({} as any),
  };
});

import {
  getOperationsSnapshot,
  searchTasks,
  getTask,
  createTask,
  updateTask,
  assignTask,
  searchIncidents,
  getIncident,
  resolveIncident,
  getProject,
  analyzeProject,
  findBlockers,
  getPendingApprovals,
  createApproval,
  approveApproval,
  rejectApproval,
  executeApprovedAction,
  verifyAction,
  addActivityEvent,
  proposeActionPlan,
} from '../lib/operations';
import { resetTables as resetFakeTables } from './fake-db';

describe('Operations Layer', () => {
  beforeEach(() => {
    resetFakeTables();
    // Seed a default project for tests
    const db = getFakeDb();
    db.insert('projects', {
      id: 1,
      name: 'Test Project',
      slug: 'test-project',
      description: 'For testing',
      owner_id: 1,
      status: 'active',
      progress: 50,
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    db.insert('users', {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'operator',
      avatar_color: '#38bdf8',
      created_at: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should get operations snapshot with empty data', async () => {
    const snapshot = await getOperationsSnapshot();
    expect(snapshot.overallStatus).toBe('healthy');
    expect(snapshot.projects.total).toBeGreaterThanOrEqual(1);
    expect(snapshot.tasks.total).toBe(0);
    expect(snapshot.incidents.total).toBe(0);
    expect(snapshot.approvals.pending).toBe(0);
  });

  it('should search tasks with filters', async () => {
    await createTask({ title: 'Test Task', projectId: 1, priority: 'high' });
    const results = await searchTasks({ priority: 'high' });
    expect(results.length).toBe(1);
    expect((results[0] as any).title).toBe('Test Task');
  });

  it('should get a task', async () => {
    const created = await createTask({ title: 'Get Test', projectId: 1 });
    const found = await getTask(created.id);
    expect(found).toBeTruthy();
    expect((found as any).title).toBe('Get Test');
    expect((found as any).projectId).toBe(1);
  });

  it('should create a task', async () => {
    const task = await createTask({
      title: 'New Task',
      description: 'Description',
      priority: 'critical',
      projectId: 1,
    });
    expect((task as any).title).toBe('New Task');
    expect((task as any).priority).toBe('critical');
    expect((task as any).status).toBe('todo');
  });

  it('should update a task', async () => {
    const created = await createTask({ title: 'Original', projectId: 1 });
    const updated = await updateTask(created.id, { title: 'Updated', status: 'in_progress' });
    expect((updated as any).title).toBe('Updated');
    expect((updated as any).status).toBe('in_progress');
  });

  it('should assign a task', async () => {
    const task = await createTask({ title: 'Assign Test', projectId: 1 });
    const assigned = await assignTask(task.id, 1);
    expect((assigned as any).assigneeId).toBe(1);
  });

  it('should search incidents with filters', async () => {
    const db = getFakeDb();
    await db.insert('incidents', {
      id: 1,
      title: 'Test Incident',
      description: 'Description',
      severity: 'high',
      status: 'open',
      project_id: 1,
      owner_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const results = await searchIncidents({ severity: 'high' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should get an incident', async () => {
    const db = getFakeDb();
    const inc = await db.insert('incidents', {
      id: 1,
      title: 'Get Incident',
      description: 'Desc',
      severity: 'critical',
      status: 'open',
      project_id: 1,
      owner_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const found = await getIncident(inc.id);
    expect(found).toBeTruthy();
    expect((found as any).title).toBe('Get Incident');
  });

  it('should resolve an incident', async () => {
    const db = getFakeDb();
    const inc = await db.insert('incidents', {
      id: 1,
      title: 'Resolve Test',
      description: 'Desc',
      severity: 'medium',
      status: 'open',
      project_id: 1,
      owner_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const resolved = await resolveIncident(inc.id);
    expect((resolved as any).status).toBe('resolved');
  });

  it('should get project details', async () => {
    const project = await getProject(1);
    expect(project.project).toBeTruthy();
    expect(project.project.name).toBe('Test Project');
  });

  it('should analyze a project', async () => {
    const result = await analyzeProject(1);
    expect(result.project).toBeTruthy();
    expect(result.health).toBeDefined();
  });

  it('should find blockers', async () => {
    const result = await findBlockers(1);
    expect(result.projectName).toBe('Test Project');
  });

  it('should create and approve an approval', async () => {
    const approval = await createApproval({
      actionType: 'test_action',
      targetType: 'task',
      targetId: 1,
      reason: 'Test reason',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Recommendation',
    });
    expect(approval).toBeTruthy();
    expect((approval as any).status).toBe('pending');

    const approved = await approveApproval((approval as any).id);
    expect((approved as any).status).toBe('approved');
  });

  it('should reject an approval', async () => {
    const approval = await createApproval({
      actionType: 'test_action',
      targetType: 'task',
      targetId: 1,
      reason: 'Test reason',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Recommendation',
    });
    const rejected = await rejectApproval((approval as any).id);
    expect((rejected as any).status).toBe('rejected');
  });

  it('should get pending approvals', async () => {
    await createApproval({
      actionType: 'test_action',
      targetType: 'task',
      targetId: 1,
      reason: 'Test',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Rec',
    });
    const pending = await getPendingApprovals();
    expect(Array.isArray(pending)).toBe(true);
  });

  it('should add activity events', async () => {
    await addActivityEvent('system', 'System', 'info', 'Test event');
    const events = await getOperationsSnapshot();
    expect(events.recentActivity.length).toBeGreaterThanOrEqual(1);
  });

  it('should propose an action plan', async () => {
    const plan = await proposeActionPlan(1);
    expect(plan).toBeTruthy();
    expect(plan.actionType).toBeDefined();
  });

  it('should execute an approved action', async () => {
    const db = getFakeDb();
    await db.insert('tasks', {
      id: 1,
      title: 'Execute Test',
      description: '',
      status: 'todo',
      priority: 'medium',
      project_id: 1,
      assignee_id: null,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const approval = await createApproval({
      actionType: 'assign_task',
      targetType: 'task',
      targetId: 1,
      reason: 'Assign test',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Recommend',
    });
    await approveApproval((approval as any).id);

    const result = await executeApprovedAction((approval as any).id, 'assign_task', { assigneeId: 1 });
    expect((result as any).status).toBe('completed');
  });

  it('should fail to execute non-approved action', async () => {
    const db = getFakeDb();
    await db.insert('tasks', {
      id: 1,
      title: 'Reject Test',
      description: '',
      status: 'todo',
      priority: 'medium',
      project_id: 1,
      assignee_id: null,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const approval = await createApproval({
      actionType: 'assign_task',
      targetType: 'task',
      targetId: 1,
      reason: 'Not approved',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Recommendation',
    });

    await expect(executeApprovedAction((approval as any).id, 'assign_task', { assigneeId: 1 }))
      .rejects.toThrow('not approved');
  });

  it('should verify a completed action', async () => {
    const db = getFakeDb();
    await db.insert('tasks', {
      id: 1,
      title: 'Verify Test',
      description: '',
      status: 'todo',
      priority: 'medium',
      project_id: 1,
      assignee_id: null,
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const approval = await createApproval({
      actionType: 'assign_task',
      targetType: 'task',
      targetId: 1,
      reason: 'Verify test',
      expectedImpact: 'Impact',
      risk: 'low',
      agentRecommendation: 'Recommendation',
    });
    await approveApproval((approval as any).id);
    const execResult = await executeApprovedAction((approval as any).id, 'assign_task', { assigneeId: 1 });

    const verification = await verifyAction((execResult as any).actionId);
    expect((verification as any).verified).toBe(true);
  });
});
