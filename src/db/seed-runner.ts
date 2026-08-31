#!/usr/bin/env node
import { seedDemoData, ATLAS_PROJECT_NAME, ATLAS_INCIDENT_ID, ATLAS_TASK_ID } from './seed';
import { getServiceRoleClient } from './client';

async function run() {
  console.log('Seeding Supabase...');
  const result = await seedDemoData();
  console.log('[OpsPilot] Seeded demo data: projectId=', result.projectId, 'incidentId=', result.incidentId, 'taskId=', result.taskId);
  console.log('[OpsPilot] Demo: ' + ATLAS_PROJECT_NAME + ' blocked with Incident #' + ATLAS_INCIDENT_ID + ' and Task #' + ATLAS_TASK_ID);
}

run().catch(e => { console.error('[OpsPilot] Seed failed:', e); process.exit(1); });
