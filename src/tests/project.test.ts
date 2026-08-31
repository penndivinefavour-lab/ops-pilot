import { describe, it, expect } from 'vitest';
import fs from 'fs';
import * as schema from '../db/schema';
import * as seed from '../db/seed';
import { TOOLS } from '../lib/webmcp';

describe('Project Structure', () => {
  it('should have the required files', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'tailwind.config.js',
      'postcss.config.js',
      'next.config.mjs',
      'LICENSE',
      'README.md',
      '.gitignore',
    ];
    for (const file of requiredFiles) {
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it('should have the src directory structure', () => {
    const requiredDirs = [
      'src/app',
      'src/components',
      'src/db',
      'src/lib',
      'src/tests',
    ];
    for (const dir of requiredDirs) {
      expect(fs.existsSync(dir)).toBe(true);
    }
  });

  it('should have the supabase migrations directory', () => {
    expect(fs.existsSync('supabase/migrations')).toBe(true);
    expect(fs.existsSync('supabase/migrations/001_initial_schema.sql')).toBe(true);
    expect(fs.existsSync('supabase/migrations/002_seed_data.sql')).toBe(true);
  });
});

describe('Package Configuration', () => {
  it('should have required production dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    expect(pkg.dependencies).toHaveProperty('next');
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('react-dom');
    expect(pkg.dependencies).toHaveProperty('@supabase/supabase-js');
    expect(pkg.dependencies).toHaveProperty('zod');
  });

  it('should have vitest and jsdom as devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    expect(pkg.devDependencies).toHaveProperty('vitest');
    expect(pkg.devDependencies).toHaveProperty('jsdom');
  });
});

describe('Supabase Integration', () => {
  it('should have database client', () => {
    const clientPath = 'src/db/client.ts';
    expect(fs.existsSync(clientPath)).toBe(true);
    const content = fs.readFileSync(clientPath, 'utf-8');
    expect(content).toContain('getServiceRoleClient');
    expect(content).toContain('getAnonClient');
    expect(content).toContain('getDb');
  });

  it('should not contain SQLite references', () => {
    const clientContent = fs.readFileSync('src/db/client.ts', 'utf-8');
    expect(clientContent).not.toContain('better-sqlite3');
    expect(clientContent).not.toContain('sql.js');
    expect(clientContent).not.toContain('sqlite');
  });
});

describe('Database Schema Types', () => {
  it('should export row mappers', () => {
    expect(typeof schema.rowToUser).toBe('function');
    expect(typeof schema.rowToProject).toBe('function');
    expect(typeof schema.rowToTask).toBe('function');
    expect(typeof schema.rowToIncident).toBe('function');
    expect(typeof schema.rowToApproval).toBe('function');
  });
});

describe('Seed Data Module', () => {
  it('should export seedDemoData as an async function', () => {
    expect(typeof seed.seedDemoData).toBe('function');
  });

  it('should define correct constants', () => {
    expect(seed.ATLAS_PROJECT_NAME).toBe('Project Atlas');
    expect(seed.ATLAS_OWNER_NAME).toBe('Maya Chen');
    expect(seed.ATLAS_INCIDENT_ID).toBe(104);
    expect(seed.ATLAS_TASK_ID).toBe(47);
  });
});

describe('WebMCP Tools', () => {
  it('should define at least 18 tools', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(18);
  });

  it('should have all standard tool names', () => {
    const names = TOOLS.map((t: any) => t.name);
    expect(names).toContain('get_operations_snapshot');
    expect(names).toContain('search_tasks');
    expect(names).toContain('investigate_incident');
    expect(names).toContain('find_blockers');
    expect(names).toContain('propose_action_plan');
    expect(names).toContain('request_approval');
    expect(names).toContain('execute_approved_action');
    expect(names).toContain('verify_action');
  });
});

describe('API Routes', () => {
  it('should have all required API routes', () => {
    const requiredRoutes = [
      'src/app/api/projects/route.ts',
      'src/app/api/tasks/route.ts',
      'src/app/api/incidents/route.ts',
      'src/app/api/approvals/route.ts',
      'src/app/api/activity/route.ts',
      'src/app/api/agent/route.ts',
      'src/app/api/webmcp/route.ts',
      'src/app/api/operations/route.ts',
    ];
    for (const route of requiredRoutes) {
      expect(fs.existsSync(route)).toBe(true);
    }
  });
});
