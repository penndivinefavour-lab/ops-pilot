import { NextRequest, NextResponse } from 'next/server';
import { searchIncidents, getIncident, resolveIncident } from '../../../lib/operations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (id) {
    const incident = await getIncident(Number(id));
    if (!incident) return NextResponse.json({ incident: null }, { status: 404 });
    return NextResponse.json({ incident });
  }
  const params: Record<string, unknown> = {};
  if (searchParams.has('query')) params.query = searchParams.get('query');
  if (searchParams.has('status')) params.status = searchParams.get('status');
  if (searchParams.has('severity')) params.severity = searchParams.get('severity');
  if (searchParams.has('projectId')) params.projectId = Number(searchParams.get('projectId'));
  if (searchParams.has('limit')) params.limit = Number(searchParams.get('limit'));
  if (searchParams.has('offset')) params.offset = Number(searchParams.get('offset'));
  const incidents = await searchIncidents(params);
  return NextResponse.json({ incidents });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as Record<string, unknown>;
  if (body._method === 'resolve') {
    const id = body.id as number;
    const resolution = body.resolution as string | undefined;
    const status = body.status as 'mitigated' | 'resolved' | undefined;
    const resolved = await resolveIncident(id, { resolution, status });
    return NextResponse.json({ incident: resolved });
  }
  return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
}
