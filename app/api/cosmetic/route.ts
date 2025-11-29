import { NextResponse } from 'next/server';

const DEFAULT_URL = 'https://dark-circles-production.up.railway.app/predict/combined';

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const file = incoming.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required (multipart/form-data)' }, { status: 400 });
    }

    const outForm = new FormData();
    // Try 'image' field name first (common for image APIs), fallback to 'file'
    outForm.append('image', file, (file as File).name || 'image.jpg');

    const url = process.env.COSMETIC_INFERENCE_URL || DEFAULT_URL;
    const apiKey = process.env.COSMETIC_INFERENCE_API_KEY;

    const res = await fetch(url, {
      method: 'POST',
      body: outForm,
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text();
      console.error('Cosmetic API error:', res.status, text);
      return NextResponse.json({ 
        error: 'upstream_error', 
        status: res.status, 
        body: text,
        message: `Upstream API returned ${res.status}: ${text.substring(0, 200)}`
      }, { status: 502 });
    }

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: return text
    const text = await res.text();
    return NextResponse.json({ raw: text });
  } catch (err) {
    console.error('Cosmetic proxy error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'internal_error',
      message: errorMessage
    }, { status: 500 });
  }
}

