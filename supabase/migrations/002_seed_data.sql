-- OpsPilot Seed Data
-- Idempotent seed for Supabase project

-- Create users if they don't exist
INSERT INTO users (name, email, role, avatar_color, created_at)
VALUES
    ('Maya Chen', 'maya.chen@acmecorp.example', 'operator', '#38bdf8', NOW()),
    ('Agent', 'agent@ops-pilot.internal', 'agent', '#bc8cff', NOW())
ON CONFLICT (email) DO NOTHING;

-- Get or create the user IDs
-- We'll use these in subsequent inserts
WITH owner_user AS (
    SELECT id FROM users WHERE email = 'maya.chen@acmecorp.example'
),
agent_user AS (
    SELECT id FROM users WHERE email = 'agent@ops-pilot.internal'
)
-- Insert Project Atlas (blocked)
INSERT INTO projects (name, slug, description, owner_id, status, progress, priority, created_at, updated_at)
SELECT 'Project Atlas', 'project-atlas', 'Cross-region customer onboarding platform with automated provisioning and compliance gating.', owner_user.id, 'blocked', 72, 'high', NOW(), NOW()
FROM owner_user
ON CONFLICT (slug) DO NOTHING;

-- Insert other projects (if not exist)
INSERT INTO projects (name, slug, description, owner_id, status, progress, priority, created_at, updated_at)
SELECT 'Platform Hardening', 'platform-hardening', 'Improve observability, reduce mean time to recovery, and formalize incident response playbooks across all production services.', owner_user.id, 'active', 41, 'medium', NOW(), NOW()
FROM owner_user
ON CONFLICT (slug) DO NOTHING;

INSERT INTO projects (name, slug, description, owner_id, status, progress, priority, created_at, updated_at)
SELECT 'Internal Tooling Refresh', 'internal-tooling-refresh', 'Replace legacy internal dashboards with a unified operations workspace. This project is on track.', owner_user.id, 'active', 68, 'low', NOW(), NOW()
FROM owner_user
ON CONFLICT (slug) DO NOTHING;

-- Get project ID for Atlas
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
),
incident_104 AS (
    INSERT INTO incidents (title, description, severity, status, project_id, created_at, updated_at)
    SELECT 'Deployment pipeline failure', 'The CI/CD pipeline rejected the latest production deployment artifact due to a misconfigured deployment manifest. The rollout for the EU region is currently paused while the configuration is restored.', 'high', 'investigating', project_atlas.id, NOW(), NOW()
    FROM project_atlas
    ON CONFLICT DO NOTHING
    RETURNING id
)
-- Insert Task #47 (blocked, unassigned)
INSERT INTO tasks (title, description, assignee_id, status, priority, due_date, project_id, created_at, updated_at)
SELECT 'Restore deployment configuration', 'Update the deployment manifest to reference the correct artifact registry endpoint and regenerate the signed deployment bundle. This task is currently unassigned and blocking the EU rollout.', NULL, 'blocked', 'high', '2026-09-03'::timestamptz, project_atlas.id, NOW(), NOW()
FROM project_atlas
ON CONFLICT DO NOTHING;

-- Link task to incident via dependency
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
),
task_47 AS (
    SELECT id FROM tasks WHERE title = 'Restore deployment configuration' AND project_id = (SELECT id FROM project_atlas)
),
incident_104 AS (
    SELECT id FROM incidents WHERE title = 'Deployment pipeline failure' AND project_id = (SELECT id FROM project_atlas)
)
INSERT INTO task_dependencies (task_id, depends_on_id, created_at)
SELECT task_47.id, incident_104.id, NOW()
FROM task_47, incident_104
ON CONFLICT DO NOTHING;

-- Insert baseline task (EU rollout)
INSERT INTO tasks (title, description, assignee_id, status, priority, due_date, project_id, created_at, updated_at)
SELECT 'Roll out EU region customers', 'Onboard the remaining EU-region customer cohort once the deployment configuration is restored and the pipeline revalidates successfully.', NULL, 'todo', 'high', '2026-09-10'::timestamptz, project_atlas.id, NOW(), NOW()
FROM project_atlas
ON CONFLICT DO NOTHING;

-- Link baseline task to task #47
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
),
baseline_task AS (
    SELECT id FROM tasks WHERE title = 'Roll out EU region customers' AND project_id = (SELECT id FROM project_atlas)
),
task_47 AS (
    SELECT id FROM tasks WHERE title = 'Restore deployment configuration' AND project_id = (SELECT id FROM project_atlas)
)
INSERT INTO task_dependencies (task_id, depends_on_id, created_at)
SELECT baseline_task.id, task_47.id, NOW()
FROM baseline_task, task_47
ON CONFLICT DO NOTHING;

-- Insert additional incidents
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
)
INSERT INTO incidents (title, description, severity, status, project_id, created_at, updated_at)
SELECT 'EU rollout KPI delay', 'Customer onboarding KPIs for the EU cohort have slipped because the deployment pipeline is blocked. The mitigation plan is to restore the deployment configuration and re-run the validation stage.', 'medium', 'open', project_atlas.id, NOW(), NOW()
FROM project_atlas
ON CONFLICT DO NOTHING;

WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
)
INSERT INTO incidents (title, description, severity, status, project_id, created_at, updated_at)
SELECT 'Expired certificate on staging endpoint', 'The staging endpoint certificate expired during the last deployment attempt. This is tracked separately and does not block production yet.', 'low', 'open', project_atlas.id, NOW(), NOW()
FROM project_atlas
ON CONFLICT DO NOTHING;

-- Insert pending approval for Task #47
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
),
task_47 AS (
    SELECT id FROM tasks WHERE title = 'Restore deployment configuration' AND project_id = (SELECT id FROM project_atlas)
)
INSERT INTO approvals (action_type, target_type, target_id, reason, expected_impact, risk, agent_recommendation, status, created_at, updated_at)
SELECT 'assign_task', 'task', task_47.id, 'The current owner is unavailable and the deployment configuration task is blocking the EU rollout. Reassign to an available qualified operator to unblock the project.', 'Task status moves to in_progress and the primary blocker for Project Atlas is cleared.', 'low', 'Reassign Task #47 to Sarah Okonkwo, who is available and has successfully restored deployment configurations before.', 'pending', NOW(), NOW()
FROM task_47
ON CONFLICT DO NOTHING;

-- Insert activity event
WITH project_atlas AS (
    SELECT id FROM projects WHERE slug = 'project-atlas'
),
task_47 AS (
    SELECT id FROM tasks WHERE title = 'Restore deployment configuration' AND project_id = (SELECT id FROM project_atlas)
),
incident_104 AS (
    SELECT id FROM incidents WHERE title = 'Deployment pipeline failure' AND project_id = (SELECT id FROM project_atlas)
),
owner_user AS (
    SELECT id FROM users WHERE email = 'maya.chen@acmecorp.example'
)
INSERT INTO activity_events (actor_type, actor_name, event_type, description, detail, created_at)
SELECT 'system', 'OpsPilot', 'workspace_ready', 'OpsPilot workspace is ready. Project Atlas scenario is seeded.', jsonb_build_object('projectId', project_atlas.id, 'incidentId', incident_104.id, 'taskId', task_47.id, 'ownerId', owner_user.id), NOW()
FROM project_atlas, task_47, incident_104, owner_user
ON CONFLICT DO NOTHING;

-- Report what was seeded
SELECT 'Seed complete' AS status;
