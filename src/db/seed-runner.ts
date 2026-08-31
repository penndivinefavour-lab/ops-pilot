import { seedDemoData } from '../db/seed';

async function main() {
  console.log('[OpsPilot] Seeding demo data...');
  try {
    const result = await seedDemoData();
    console.log('[OpsPilot] Seed complete:');
    console.log(`  Project ID:  ${result.projectId}`);
    console.log(`  Incident ID: ${result.incidentId}`);
    console.log(`  Task ID:     ${result.taskId}`);
    console.log(`  Owner ID:    ${result.ownerId}`);
    console.log(`  Agent ID:    ${result.agentId}`);
    process.exit(0);
  } catch (err) {
    console.error('[OpsPilot] Seed failed:', err);
    process.exit(1);
  }
}

main();
