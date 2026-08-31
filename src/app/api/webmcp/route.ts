import { NextRequest, NextResponse } from 'next/server';
import { handleWebMCPList, handleWebMCPCall } from '../../../lib/webmcp';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.searchParams.get('tool')) {
    return handleWebMCPCall(request);
  }
  return handleWebMCPList(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleWebMCPCall(request);
}
