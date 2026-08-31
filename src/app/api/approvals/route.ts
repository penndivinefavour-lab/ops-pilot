import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals, approveApproval, rejectApproval, createApproval, addActivityEvent } from '../../../lib/operations';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const approvals = await getPendingApprovals();
  return NextResponse.json({ approvals });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  if (body._method === 'approve') {
    const id = body.id as number;
    const actorName = (body.actorName as string) ?? 'Human';
    const result = await approveApproval(id, actorName);
    if (!result) return NextResponse.json({ error: 'Approval not found or not pending' }, { status: 404 });
    return NextResponse.json({ approval: result });
  }
  if (body._method === 'reject') {
    const id = body.id as number;
    const actorName = (body.actorName as string) ?? 'Human';
    const result = await rejectApproval(id, actorName);
    if (!result) return NextResponse.json({ error: 'Approval not found or not pending' }, { status: 404 });
    return NextResponse.json({ approval: result });
  }
  if (body._method === 'create') {
    const approval = await createApproval(body as any);
    return NextResponse.json({ approval }, { status: 201 });
  }
  return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
}
