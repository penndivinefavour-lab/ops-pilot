import { NextRequest, NextResponse } from 'next/server';
import { getActivityEvents } from '../../../lib/operations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.has('limit') ? Number(searchParams.get('limit')) : 50;
  const offset = searchParams.has('offset') ? Number(searchParams.get('offset')) : 0;
  const events = await getActivityEvents(limit, offset);
  return NextResponse.json({ events });
}
