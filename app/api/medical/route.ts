import { NextResponse } from 'next/server';

const DEFAULT_URL = 'https://skin-production-78f6.up.railway.app/predict';

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const file = incoming.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required (multipart/form-data)' }, { status: 400 });
    }

    const outForm = new FormData();
    outForm.append('file', file, (file as File).name || 'image.jpg');

    const url = process.env.MEDICAL_INFERENCE_URL || DEFAULT_URL;
    const apiKey = process.env.MEDICAL_INFERENCE_API_KEY;

    const res = await fetch(url, {
      method: 'POST',
      body: outForm,
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      // Let node fetch set Content-Type boundary for FormData
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'upstream_error', status: res.status, body: text }, { status: 502 });
    }

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback: return text
    const text = await res.text();
    return NextResponse.json({ raw: text });
  } catch (err) {
    console.error('Medical proxy error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
