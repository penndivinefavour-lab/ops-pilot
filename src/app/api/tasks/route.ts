import { NextRequest, NextResponse } from 'next/server';
import { searchTasks, getTask, createTask, updateTask, assignTask } from '../../../lib/operations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (id) {
    const task = await getTask(Number(id));
    if (!task) return NextResponse.json({ task: null }, { status: 404 });
    return NextResponse.json({ task });
  }
  const params: Record<string, unknown> = {};
  if (searchParams.has('query')) params.query = searchParams.get('query');
  if (searchParams.has('status')) params.status = searchParams.get('status');
  if (searchParams.has('priority')) params.priority = searchParams.get('priority');
  if (searchParams.has('assigneeId')) {
    const v = searchParams.get('assigneeId');
    params.assigneeId = v === 'null' ? null : Number(v);
  }
  if (searchParams.has('projectId')) params.projectId = Number(searchParams.get('projectId'));
  if (searchParams.has('limit')) params.limit = Number(searchParams.get('limit'));
  if (searchParams.has('offset')) params.offset = Number(searchParams.get('offset'));
  const tasks = await searchTasks(params);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  if (body._method === 'assign') {
    const id = body.id as number;
    const assigneeId = body.assigneeId as number | null;
    const assigned = await assignTask(id, assigneeId);
    return NextResponse.json({ task: assigned });
  }
  if (body._method === 'create') {
    const created = await createTask(body as any);
    return NextResponse.json({ task: created }, { status: 201 });
  }
  if (body._method === 'update') {
    const id = body.id as number;
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    const updated = await updateTask(id, updates as any);
    return NextResponse.json({ task: updated });
  }
  return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
}
