import { NextRequest, NextResponse } from 'next/server';
import { getProject, analyzeProject } from '../../../lib/operations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const projectId = Number(id);
  const includeAnalysis = searchParams.get('analysis') === 'true';
  const result = await getProject(projectId);
  if (includeAnalysis) {
    const analysis = await analyzeProject(projectId);
    result.analysis = analysis.summary;
  }
  return NextResponse.json(result);
}
