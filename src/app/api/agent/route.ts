import { NextRequest, NextResponse } from 'next/server';
import {
  proposeActionPlan,
  createApproval,
  executeApprovedAction,
  verifyAction,
  getPendingApprovals,
} from '../../../lib/operations';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action;

  if (action === 'propose') {
    const proposal = await proposeActionPlan(body.projectId as number);
    return NextResponse.json({ proposal });
  }

  if (action === 'request_approval') {
    const approval = await createApproval({
      actionType: body.actionType as string,
      targetType: body.targetType as 'task' | 'incident',
      targetId: body.targetId as number,
      reason: body.reason as string,
      expectedImpact: body.expectedImpact as string,
      risk: body.risk as string,
      agentRecommendation: body.agentRecommendation as string,
    });
    return NextResponse.json({ approval }, { status: 201 });
  }

  if (action === 'execute') {
    const result = await executeApprovedAction(
      body.approvalId as number,
      body.toolName as string,
      body.input as Record<string, unknown>,
    );
    return NextResponse.json({ result });
  }

  if (action === 'verify') {
    const verification = await verifyAction(body.actionId as number);
    return NextResponse.json({ verification });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
