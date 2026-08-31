# OpsPilot — The Human-Agent Operations Room

> **Human decides. Agent reasons. WebMCP executes. Human remains in control.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

OpsPilot is an agent-native operations workspace where humans investigate operational problems, make decisions, and supervise AI agents that execute real operational work through the WebMCP API.

## What it is

OpsPilot is an operations workspace built for two kinds of users: **humans** and **agents**. Both operate on the same operational state, with WebMCP providing a structured, secure interface that lets AI agents reason about and execute real operational work — while humans stay in control.

This is **not** a generic dashboard, a chatbot, or an AI wrapper. It is a purpose-built operations product where WebMCP is fundamental to the experience.

## Why WebMCP

Traditional applications expose only a UI. If an AI agent wants to operate on them, it must simulate human clicks through the UI — fragile, slow, and unstructured.

OpsPilot is different. It exposes **meaningful operational capabilities through WebMCP**:

- Agents can **investigate incidents**, **find blockers**, and **analyze projects** — not by scraping the UI, but by calling structured tools.
- Agents can **propose action plans** and **request human approval** before taking consequential actions.
- Humans **approve or reject** agent proposals through the UI.
- Approved actions are **executed through WebMCP** and **verified** by the agent.
- Every step is **recorded in the activity timeline**.

The key difference: **the agent didn't simulate a user clicking through the interface. It used structured tools to investigate, propose, execute approved work, and verify the result — while the human stayed in control.**

## The problem

Operations teams face a recurring pattern:

1. Something is wrong — an incident fires, a project gets blocked, a deployment fails.
2. Someone has to investigate what's happening.
3. Someone has to decide what to do.
4. Someone has to execute the fix.
5. Someone has to verify it worked.

OpsPilot makes this workflow **agent-assisted but human-controlled**. Agents investigate and propose. Humans decide. Agents execute approved actions and verify. Everyone sees the same state.

## Human + Agent workflow

```
Human observes
      ↓
Human asks agent to investigate
      ↓
Agent uses WebMCP tools
      ↓
Agent analyzes operational state
      ↓
Agent proposes actions
      ↓
Human reviews proposal
      ↓
Human approves/rejects
      ↓
Agent executes approved action through WebMCP
      ↓
Application state changes
      ↓
Agent verifies outcome
      ↓
Human sees result
```

## Demo

The application is seeded with a deterministic scenario called **Project Atlas**:

- **Status:** BLOCKED
- **Progress:** 72%
- **Owner:** Maya Chen

Project Atlas is blocked by a dependency chain:

```
Incident #104 (Deployment pipeline failure, High, Investigating)
      ↓
Task #47 (Restore deployment configuration, Blocked, Unassigned)
      ↓
Deployment
      ↓
Project Atlas
```

### Demo flow (under 3 minutes)

1. **0:00–0:20** — Show the dashboard. OpsPilot shows operational health, active tasks, open incidents, pending approvals, and recent agent activity.
2. **0:20–0:50** — Open Project Atlas. Show it's blocked at 72% progress.
3. **0:50–1:20** — Ask the agent: *"Investigate what's blocking Project Atlas."* Show WebMCP activity.
4. **1:20–1:45** — Agent identifies the blocker: Task #47 is blocking Project Atlas, linked to Incident #104. Show the agent action card.
5. **1:45–2:00** — Human approves the action.
6. **2:00–2:20** — Agent executes the approved action through WebMCP.
7. **2:20–2:40** — Agent verifies the result. Show the project state changing.
8. **2:40–3:00** — Conclude: The agent used WebMCP to investigate, propose, execute approved work, and verify — while the human stayed in control.

## Architecture

```
Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS
Backend: Next.js server-side API routes
Database: Supabase (PostgreSQL)
Validation: Zod
Testing: Vitest
Deployment: Vercel
```

### Data model

- **users** — operators and agents
- **projects** — operational projects with status, progress, priority, owner
- **tasks** — tasks with assignee, status, priority, due date, project
- **task_dependencies** — task dependency relationships
- **incidents** — operational incidents with severity, status, owner, project
- **approvals** — human approval requests for agent actions
- **agent_actions** — recorded agent action executions
- **activity_events** — immutable activity timeline

### Database

OpsPilot uses **Supabase (PostgreSQL)** for persistent application state.

#### Environment variables

| Variable | Purpose | Where used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | **Server only** — never exposed to browser |

#### Local setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local`
3. Fill in your Supabase credentials
4. Run the SQL migrations from `supabase/migrations/` in your Supabase SQL editor
5. Run the seed (optional — re-runnable):

```bash
npm run db:seed
```

The seed is **idempotent** — safe to run repeatedly.

#### Migrations

SQL migrations are in `supabase/migrations/`:

- `001_initial_schema.sql` — tables, constraints, indexes
- `002_seed_data.sql` — deterministic demo data (upsert-based, idempotent)

## WebMCP tools

OpsPilot exposes 18 WebMCP tools at `/api/webmcp`:

| Tool | Purpose | Read/Write | Approval |
|---|---|---|---|
| `get_operations_snapshot` | Overall operational health | Read | No |
| `search_tasks` | Search/filter tasks | Read | No |
| `get_task` | Get a single task | Read | No |
| `create_task` | Create a new task | Write | No |
| `update_task` | Update task fields | Write | No |
| `assign_task` | Assign a task to a user | Write | **Yes** |
| `search_incidents` | Search/filter incidents | Read | No |
| `get_incident` | Get a single incident | Read | No |
| `investigate_incident` | Analyze an incident | Read | No |
| `resolve_incident` | Mark incident resolved | Write | **Yes** |
| `get_project` | Get a project with tasks/incidents | Read | No |
| `analyze_project` | Analyze project health | Read | No |
| `find_blockers` | Find project blockers | Read | No |
| `propose_action_plan` | Propose action from blockers | Write | No |
| `get_pending_approvals` | List pending approvals | Read | No |
| `request_approval` | Create approval request | Write | No |
| `execute_approved_action` | Execute an approved action | Write | **Yes** |
| `verify_action` | Verify action outcome | Read | No |

## Running locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests cover:

- Project structure and package configuration
- Seed data module
- Operations layer (tasks, incidents, projects, approvals, approvals, execute/verify)

## WebMCP testing

### Browser console test

Open the browser console on any OpsPilot page and run:

```javascript
// List available tools
fetch('/api/webmcp?tool=get_operations_snapshot')
  .then(r => r.json())
  .then(data => console.log('Operation Snapshot:', data));
```

### Tool call test

```javascript
// Search tasks
fetch('/api/webmcp?tool=search_tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'todo' })
})
.then(r => r.json())
.then(data => console.log('Tasks:', data));
```

### Full investigation test

```javascript
// Find blockers for Project Atlas (id=1)
fetch('/api/webmcp?tool=find_blockers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: 1 })
})
.then(r => r.json())
.then(data => console.log('Blockers:', data));
```

## Security model

- **Service role key** is never shipped to the browser. It is only available server-side.
- **Read operations** are generally allowed without approval.
- **Mutating operations** that are consequential require human approval.
- **Approval integrity** is enforced server-side — an agent cannot bypass the approval step.
- **Input validation** is performed server-side.
- **No arbitrary code execution** — agents can only use the tools exposed by WebMCP.

## Deployment

### Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### Database migrations

Run the SQL in `supabase/migrations/` in your Supabase SQL editor before first deploy. The seed can be run from the API:

```
GET /api/seed
```

## Limitations

- This is a demonstration/MVP built for the WebMCP Challenge 2026.
- Multi-tenancy, authentication, SSO, audit logging, and team management are not implemented.
- The agent does not include a full LLM runtime — it exposes WebMCP tools that an external agent (or the embedded WebMCP console) can call.
- Supabase project credentials are required for full functionality.

## Project structure

```
ops-pilot/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_seed_data.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── operations/
│   │   │   ├── tasks/
│   │   │   ├── incidents/
│   │   │   ├── projects/
│   │   │   ├── approvals/
│   │   │   ├── activity/
│   │   │   ├── agent/
│   │   │   ├── seed/
│   │   │   └── wemcp/
│   │   ├── activity/
│   │   ├── approvals/
│   │   ├── incidents/
│   │   ├── login/
│   │   ├── page.tsx
│   │   ├── projects/
│   │   ├── tasks/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── useOperationsSnapshot.ts
│   │   ├── theme.ts
│   │   └── theme-store.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   ├── seed.ts
│   │   └── seed-runner.ts
│   ├── lib/
│   │   ├── operations.ts
│   │   └── webcmp.ts
│   └── tests/
│       ├── project.test.ts
│       ├── seed.test.ts
│       └── operations.test.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.mjs
├── LICENSE
└── README.md
```

## License

[MIT License](LICENSE) — Copyright (c) 2026 Penn Divine Favour.
