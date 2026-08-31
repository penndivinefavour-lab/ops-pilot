import { NextRequest, NextResponse } from 'next/server';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  requiresApproval: boolean;
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'get_operations_snapshot',
    description: 'Return the overall operational health snapshot including projects, tasks, incidents, approvals, and recent activity.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'search_tasks',
    description: 'Search and filter tasks by query, status, priority, assignee, or project.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'completed'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        assigneeId: { type: ['number', 'null'] },
        projectId: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      additionalProperties: false,
    },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'get_task',
    description: 'Retrieve a single task by id with its assignee and project context.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, additionalProperties: false, required: ['id'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'create_task',
    description: 'Create a new task under a project.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        assigneeId: { type: ['number', 'null'] },
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'completed'], default: 'todo' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
        dueDate: { type: ['string', 'null'] },
        projectId: { type: 'number' },
      },
      required: ['title', 'projectId'],
      additionalProperties: false,
    },
    readOnly: false,
    requiresApproval: false,
  },
  {
    name: 'update_task',
    description: 'Update task fields such as title, description, assignee, status, priority, and due date.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        assigneeId: { type: ['number', 'null'] },
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'completed'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        dueDate: { type: ['string', 'null'] },
      },
      required: ['id'],
      additionalProperties: false,
    },
    readOnly: false,
    requiresApproval: false,
  },
  {
    name: 'assign_task',
    description: 'Assign a task to a user. If the task was previously unassigned, the status moves to in_progress.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' }, assigneeId: { type: ['number', 'null'] } }, required: ['id', 'assigneeId'], additionalProperties: false },
    readOnly: false,
    requiresApproval: true,
  },
  {
    name: 'search_incidents',
    description: 'Search and filter incidents by query, status, severity, or project.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        status: { type: 'string', enum: ['open', 'investigating', 'mitigated', 'resolved'] },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        projectId: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      additionalProperties: false,
    },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'get_incident',
    description: 'Retrieve a single incident by id with its owner and project context.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, additionalProperties: false, required: ['id'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'investigate_incident',
    description: 'Analyze an incident and return the incident, related tasks, and an analysis summary.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, additionalProperties: false, required: ['id'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'resolve_incident',
    description: 'Mark an incident as mitigated or resolved with an optional resolution note.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        resolution: { type: 'string' },
        status: { type: 'string', enum: ['mitigated', 'resolved'], default: 'resolved' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    readOnly: false,
    requiresApproval: true,
  },
  {
    name: 'get_project',
    description: 'Retrieve a single project with its tasks and incidents.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, additionalProperties: false, required: ['id'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'analyze_project',
    description: 'Analyze project health, detect blockers, and return a summary.',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, additionalProperties: false, required: ['id'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'find_blockers',
    description: 'Find the blockers for a project by id, including blocked tasks and open incidents, with a recommendation.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'number' } }, additionalProperties: false, required: ['projectId'] },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'propose_action_plan',
    description: 'Based on a project id, identify the primary blocker and propose an action type, target type, and target id.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'number' } }, additionalProperties: false, required: ['projectId'] },
    readOnly: false,
    requiresApproval: false,
  },
  {
    name: 'get_pending_approvals',
    description: 'List pending approvals with their target context.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    requiresApproval: false,
  },
  {
    name: 'request_approval',
    description: 'Create a pending approval request for an agent action that requires human authorization.',
    inputSchema: {
      type: 'object',
      properties: {
        actionType: { type: 'string' },
        targetType: { type: 'string', enum: ['task', 'incident'] },
        targetId: { type: 'number' },
        reason: { type: 'string' },
        expectedImpact: { type: 'string' },
        risk: { type: 'string', enum: ['low', 'medium', 'high'] },
        agentRecommendation: { type: 'string' },
      },
      required: ['actionType', 'targetType', 'targetId', 'reason', 'expectedImpact', 'risk', 'agentRecommendation'],
      additionalProperties: false,
    },
    readOnly: false,
    requiresApproval: false,
  },
  {
    name: 'execute_approved_action',
    description: 'Execute an approved action through the appropriate operational tool. Only works for approvals that are in approved status.',
    inputSchema: {
      type: 'object',
      properties: {
        approvalId: { type: 'number' },
        toolName: { type: 'string' },
        input: { type: 'object' },
      },
      required: ['approvalId', 'toolName'],
      additionalProperties: false,
    },
    readOnly: false,
    requiresApproval: true,
  },
  {
    name: 'verify_action',
    description: 'Verify the outcome of an agent action by id.',
    inputSchema: { type: 'object', properties: { actionId: { type: 'number' } }, additionalProperties: false, required: ['actionId'] },
    readOnly: true,
    requiresApproval: false,
  },
];

function parseBody(request: NextRequest): Record<string, unknown> | null {
  try {
    const body = request.body?.toString();
    if (!body) return {};
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function errorsResponse(message: string, details?: string, statusCode = 400): NextResponse {
  return NextResponse.json({ error: message, detail: details ?? undefined }, { status: statusCode });
}

function toolResponse(result: unknown, statusCode = 200): NextResponse {
  return NextResponse.json({ result }, { status: statusCode });
}

export async function handleWebMCPList(_request: NextRequest): Promise<NextResponse> {
  const tools = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    readOnly: t.readOnly,
    requiresApproval: t.requiresApproval,
  }));
  return NextResponse.json({ tools });
}

export async function handleWebMCPCall(request: NextRequest): Promise<NextResponse> {
  const toolName = request.nextUrl.searchParams.get('tool');
  if (!toolName) {
    return errorsResponse('Missing tool parameter', 'Provide ?tool=<toolName>', 400);
  }

  const definition = TOOLS.find((t) => t.name === toolName);
  if (!definition) {
    return errorsResponse(`Unknown tool "${toolName}"`, `Available tools: ${TOOLS.map((t) => t.name).join(', ')}`, 404);
  }

  const input = parseBody(request);
  if (input === null) {
    return errorsResponse('Invalid request body', 'Body must be valid JSON', 400);
  }

  try {
    const result = await executeTool(definition, input);
    return toolResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('Unauthorized') || message.startsWith('Approval')) {
      return errorsResponse(message, 'This action requires human approval or is not authorized', 403);
    }
    if (message.startsWith('Not found') || message.startsWith('does not exist')) {
      return errorsResponse(message, 'The requested resource was not found', 404);
    }
    return errorsResponse('Tool execution failed', message, 500);
  }
}

async function executeTool(definition: ToolDefinition, input: Record<string, unknown>): Promise<unknown> {
  const { name } = definition;

  switch (name) {
    case 'get_operations_snapshot': {
      const { getOperationsSnapshot } = await import('../lib/operations');
      return getOperationsSnapshot();
    }
    case 'search_tasks': {
      const { searchTasks } = await import('../lib/operations');
      return searchTasks(input as any);
    }
    case 'get_task': {
      const { getTask } = await import('../lib/operations');
      const id = input.id as number;
      const task = getTask(id);
      if (!task) throw new Error(`Task with id ${id} does not exist`);
      return task;
    }
    case 'create_task': {
      const { createTask } = await import('../lib/operations');
      const created = createTask(input as any);
      return { created };
    }
    case 'update_task': {
      const { updateTask } = await import('../lib/operations');
      const id = input.id as number;
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      const updated = updateTask(id, updates as any);
      return { updated };
    }
    case 'assign_task': {
      const { assignTask } = await import('../lib/operations');
      const id = input.id as number;
      const assigneeId = input.assigneeId as number;
      if (assigneeId == null) throw new Error('assigneeId is required');
      const assigned = assignTask(id, assigneeId);
      return { assigned };
    }
    case 'search_incidents': {
      const { searchIncidents } = await import('../lib/operations');
      return searchIncidents(input as any);
    }
    case 'get_incident': {
      const { getIncident } = await import('../lib/operations');
      const id = input.id as number;
      const incident = getIncident(id);
      if (!incident) throw new Error(`Incident with id ${id} does not exist`);
      return incident;
    }
    case 'investigate_incident': {
      const { investigateIncident } = await import('../lib/operations');
      const id = input.id as number;
      return investigateIncident(id);
    }
    case 'resolve_incident': {
      const { resolveIncident } = await import('../lib/operations');
      const id = input.id as number;
      const input2: Record<string, unknown> = { resolution: input.resolution as string | undefined, status: input.status as 'mitigated' | 'resolved' | undefined };
      const resolved = resolveIncident(id, input2 as any);
      return { resolved };
    }
    case 'get_project': {
      const { getProject } = await import('../lib/operations');
      const id = input.id as number;
      return getProject(id);
    }
    case 'analyze_project': {
      const { analyzeProject } = await import('../lib/operations');
      return analyzeProject(input.id as number);
    }
    case 'find_blockers': {
      const { findBlockers } = await import('../lib/operations');
      return findBlockers(input.projectId as number);
    }
    case 'propose_action_plan': {
      const { proposeActionPlan } = await import('../lib/operations');
      return proposeActionPlan(input.projectId as number);
    }
    case 'get_pending_approvals': {
      const { getPendingApprovals } = await import('../lib/operations');
      return getPendingApprovals();
    }
    case 'request_approval': {
      const { createApproval } = await import('../lib/operations');
      const approval = createApproval(input as any);
      return { approval };
    }
    case 'execute_approved_action': {
      const { executeApprovedAction } = await import('../lib/operations');
      const approvalId = input.approvalId as number;
      const toolName = input.toolName as string;
      const inputSnapshot = (input.input as Record<string, unknown>) ?? {};
      const result = executeApprovedAction(approvalId, toolName, inputSnapshot);
      return { executed: result };
    }
    case 'verify_action': {
      const { verifyAction } = await import('../lib/operations');
      const actionId = input.actionId as number;
      return verifyAction(actionId);
    }
    default: {
      throw new Error(`No handler for tool "${name}"`);
    }
  }
}

export { TOOLS };
