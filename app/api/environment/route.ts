import { NextResponse } from 'next/server';
import type { WeatherState } from '@/lib/types';

const UV_HIGH_THRESHOLD = 8;
const HUMIDITY_HIGH_THRESHOLD = 70;
const HUMIDITY_LOW_THRESHOLD = 30;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const units = searchParams.get('units') || 'metric';

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'missing_params', message: 'lat and lon are required' },
        { status: 400 }
      );
    }

    // Use Open-Meteo API (free, no API key required)
    // Docs: https://open-meteo.com/en/docs
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', 'uv_index,relative_humidity_2m,temperature_2m');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'upstream_error', status: res.status, body: text?.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const uvIndex = Number(data?.current?.uv_index ?? 0);
    const humidity = Number(data?.current?.relative_humidity_2m ?? 0);
    const temperature = Number(data?.current?.temperature_2m ?? 0);

    const weather: WeatherState = {
      uvIndex,
      humidity,
      temperature,
      isHighUV: uvIndex >= UV_HIGH_THRESHOLD,
      isHighHumidity: humidity >= HUMIDITY_HIGH_THRESHOLD,
      isDryWeather: humidity <= HUMIDITY_LOW_THRESHOLD,
    };

    return NextResponse.json(weather);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}


