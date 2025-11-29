import type { WeatherState } from '@/lib/types';

function resolveBaseUrl(): string {
  // Prefer explicit base URL if provided
  const explicit = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // Vercel env
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    const withProtocol = vercel.startsWith('http') ? vercel : `https://${vercel}`;
    return withProtocol.replace(/\/$/, '');
  }

  // Fallback to localhost (useful in dev)
  return 'http://localhost:3000';
}

export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherState> {
  const base = resolveBaseUrl();
  const url = `${base}/api/environment?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Environment API error ${res.status}: ${text?.slice(0, 300)}`);
  }
  const data = (await res.json()) as WeatherState;
  return data;
}


