import { NextResponse } from 'next/server';
import { runCosmeticAgent } from '@/lib/agents/cosmetic/graph';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, scan, location, userProfile, predictedAge, history, weather } = body || {};
    if (!userId || !scan) {
      return NextResponse.json({ error: 'bad_request', message: 'userId and scan are required' }, { status: 400 });
    }
    
    console.log('[Cosmetic Agent API] Received request:', {
      userId,
      conditions: scan.detected_conditions,
      historyLength: history?.length || 0,
    });
    
    const out = await runCosmeticAgent({
      userId,
      scan,
      location,
      userProfile,
      predictedAge,
      history: history || [],
      weather,
    });
    
    return NextResponse.json(out);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Cosmetic Agent API] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    // Log full error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('[Cosmetic Agent API] Full error:', err);
    }
    return NextResponse.json(
      { 
        error: 'internal_error', 
        message: error.message,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}


