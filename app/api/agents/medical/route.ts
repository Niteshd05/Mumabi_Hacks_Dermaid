import { NextResponse } from 'next/server';
import { runMedicalAgent } from '@/lib/agents/medical/graph';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, scan, userProfile, weather, history } = body || {};
    
    if (!userId || !scan) {
      return NextResponse.json(
        { error: 'bad_request', message: 'userId and scan are required' },
        { status: 400 }
      );
    }

    console.log('[Medical Agent API] Received request:', {
      userId,
      scanCondition: scan.condition_match,
      historyLength: history?.length || 0,
      history: JSON.stringify(history || [])
    });

    const out = await runMedicalAgent({
      userId,
      scan,
      userProfile,
      weather,
      history: history || [], // CRITICAL: Pass history to agent!
    });

    return NextResponse.json(out);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Medical Agent API] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: 'internal_error',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}

