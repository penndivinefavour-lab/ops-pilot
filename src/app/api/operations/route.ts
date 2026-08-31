import { NextRequest, NextResponse } from 'next/server';
import { getOperationsSnapshot } from '../../../lib/operations';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const snapshot = await getOperationsSnapshot();
  return NextResponse.json({ snapshot });
}
