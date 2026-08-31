import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { getFakeDb, resetTables } from './fake-db';

// Mock the DB module so seed uses fake DB
vi.mock('../db/client', () => {
  const fake = getFakeDb();
  return {
    getDb: () => fake,
    resetDbCache: () => {},
    getServiceRoleClient: () => ({} as any),
    getAnonClient: () => ({} as any),
  };
});

describe('Seed Data Module', () => {
  beforeAll(() => {
    resetTables();
  });

  beforeEach(() => {
    resetTables();
  });

  it('should export seedDemoData as an async function', async () => {
    const seed = await import('../db/seed');
    expect(typeof seed.seedDemoData).toBe('function');
    const result = seed.seedDemoData();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should seed Project Atlas as blocked', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();
    expect(result).toHaveProperty('projectId');
    expect(typeof result.projectId).toBe('number');

    const db = getFakeDb();
    const projects = await db.select('projects');
    const atlas = projects.find((p: any) => (p as any).slug === 'project-atlas');
    expect(atlas).toBeDefined();
    expect((atlas as any).status).toBe('blocked');
    expect((atlas as any).progress).toBe(72);
  });

  it('should seed Incident #104 as high severity investigating', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();

    const db = getFakeDb();
    const incidents = await db.select('incidents');
    const incident = incidents.find((i: any) => (i as any).id === result.incidentId);
    expect(incident).toBeDefined();
    expect((incident as any).severity).toBe('high');
    expect((incident as any).status).toBe('investigating');
  });

  it('should seed Task #47 as blocked and unassigned', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();

    const db = getFakeDb();
    const tasks = await db.select('tasks');
    const task = tasks.find((t: any) => (t as any).id === result.taskId);
    expect(task).toBeDefined();
    expect((task as any).status).toBe('blocked');
    expect((task as any).assignee_id).toBeNull();
    expect((task as any).title).toBe('Restore deployment configuration');
  });

  it('should create task dependencies linking task to incident', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();

    const db = getFakeDb();
    const deps = await db.select('task_dependencies');
    const depsForTask = deps.filter((d: any) => (d as any).task_id === result.taskId);
    expect(depsForTask.length).toBeGreaterThanOrEqual(1);
  });

  it('should seed other projects', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();

    const db = getFakeDb();
    const projects = await db.select('projects');
    const otherProjects = projects.filter((p: any) => (p as any).slug !== 'project-atlas');
    expect(otherProjects.length).toBeGreaterThanOrEqual(2);
  });

  it('should seed a pending approval', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();

    const db = getFakeDb();
    const approvals = await db.select('approvals');
    const pending = approvals.find((a: any) => (a as any).status === 'pending');
    expect(pending).toBeDefined();
    expect((pending as any).action_type).toBe('assign_task');
  });

  it('should seed activity event for workspace ready', async () => {
    const seed = await import('../db/seed');
    await seed.seedDemoData();

    const db = getFakeDb();
    const events = await db.select('activity_events');
    const workspaceEvent = events.find((e: any) => (e as any).event_type === 'workspace_ready');
    expect(workspaceEvent).toBeDefined();
  });

  it('seedDemoData should return projectId, incidentId, taskId, ownerId, agentId', async () => {
    const seed = await import('../db/seed');
    const result = await seed.seedDemoData();
    expect(result).toHaveProperty('projectId');
    expect(result).toHaveProperty('incidentId');
    expect(result).toHaveProperty('taskId');
    expect(result).toHaveProperty('ownerId');
    expect(result).toHaveProperty('agentId');
    expect(typeof result.projectId).toBe('number');
    expect(typeof result.incidentId).toBe('number');
    expect(typeof result.taskId).toBe('number');
    expect(typeof result.ownerId).toBe('number');
    expect(typeof result.agentId).toBe('number');
  });
});
