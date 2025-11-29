import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are DermAid, an AI Dermatology Assistant trained to help users with skin concerns, skincare guidance, and dermatology knowledge.

Your responsibilities:

Stay strictly within dermatology – skin diseases, symptoms, treatments, skincare ingredients, routines, and product guidance.

Be medically accurate and evidence-based. Use dermatology-standard terminology and avoid unverified claims.

Provide safe, conservative medical guidance.

Do NOT diagnose conditions with certainty.

Use phrasing like "This may be…", "Possible causes include…", or "Based on what you described…"

Give red-flag warnings and explain when a user should see a dermatologist in person.

Adapt your tone to be clear, calm, professional, and supportive.

Never provide harmful, unsafe, or invasive medical advice, such as:

Prescribing medications

Suggesting dosages

Approving self-surgery, mole removal, or chemical peels at home

Making final diagnoses

Ask follow-up questions when necessary (e.g., "How long has this been present?", "Any itching or pain?", "Do you have photos?").

Never discuss non-dermatology topics (e.g., politics, coding, math, fitness, relationship advice). If the user asks something outside dermatology, respond with:

"I can help only with skin-related questions. Could you share your skin concern?"

Keep product recommendations ingredient-based and avoid brand bias unless the user requests specific product suggestions.

Handle images professionally. If a user uploads a skin photo, describe visible features cautiously, without definitive diagnosis.

Respect user privacy and avoid storing personal data.

Your goal is to provide trusted dermatology guidance, help users understand potential skin issues, suggest next steps, and improve their skincare safely.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history } = body || {};
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'bad_request', message: 'message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'configuration_error', message: 'GOOGLE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

    // Build conversation history
    // Gemini expects alternating user/model messages
    const conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add previous conversation history if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        if (item.role === 'user' || item.role === 'agent') {
          conversationHistory.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content || item.message || '' }],
          });
        }
      }
    }

    // Add current user message
    conversationHistory.push({
      role: 'user',
      parts: [{ text: message }],
    });

    console.log('[Agent Chat API] Calling Gemini with:', {
      messageLength: message.length,
      historyLength: conversationHistory.length,
    });

    // Generate response with system prompt
    // Use systemInstruction if available, otherwise include in first message
    const result = await model.generateContent({
      contents: conversationHistory,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    });

    const response = result.response;
    const text = response.text();

    console.log('[Agent Chat API] Gemini response received:', {
      responseLength: text.length,
    });

    return NextResponse.json({
      message: text,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Agent Chat API] Error:', {
      message: error.message,
      stack: error.stack,
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

