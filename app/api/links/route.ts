import { NextResponse } from 'next/server';

const SEARCH_API_URL = 'https://www.searchapi.io/api/v1/search';

type Market = 'in' | 'us' | 'uk' | 'ca' | 'de';

interface LinkRequest {
  queries: string[];
  market?: Market;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LinkRequest;
    if (!body || !Array.isArray(body.queries) || body.queries.length === 0) {
      return NextResponse.json({ error: 'bad_request', message: 'queries[] required' }, { status: 400 });
    }
    const apiKey = process.env.SEARCHAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'config_error', message: 'SEARCHAPI_KEY not set' }, { status: 500 });
    }

    const market = body.market || 'in';
    const amazonDomain =
      market === 'in' ? 'amazon.in'
      : market === 'us' ? 'amazon.com'
      : market === 'uk' ? 'amazon.co.uk'
      : market === 'ca' ? 'amazon.ca'
      : market === 'de' ? 'amazon.de'
      : 'amazon.in';

    // Fetch results in parallel (cap to 5 at a time)
    const chunks: string[][] = [];
    const q = [...body.queries];
    while (q.length) chunks.push(q.splice(0, 5));

    const results: Record<string, { title: string; price?: string; link?: string; rating?: number; reviews?: number; image?: string }> = {};

    for (const batch of chunks) {
      const promises = batch.map(async (query) => {
        const params = new URLSearchParams({
          engine: 'amazon_search',
          q: query,
          api_key: apiKey,
          amazon_domain: amazonDomain,
          gl: market === 'in' ? 'in' : market,
          hl: 'en',
        });
        const url = `${SEARCH_API_URL}?${params.toString()}`;
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`SearchAPI ${res.status}: ${text?.slice(0, 200)}`);
        }
        const data = await res.json();
        const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];
        // Prefer highest rating * reviews as quality heuristic among the first 10
        const top = organic.slice(0, 10).map((item: any) => {
          const rating = Number(item?.rating || 0);
          const reviews = Number(item?.reviews || 0);
          const extractedPrice = item?.extracted_price;
          const price = extractedPrice ? `₹${Number(extractedPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : item?.price;
          return {
            title: String(item?.title || ''),
            price,
            link: String(item?.link || ''),
            rating,
            reviews,
            image: item?.thumbnail || item?.image || '',
            score: rating * (1 + reviews / 1000),
          };
        }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0];

        if (top) {
          results[query] = {
            title: top.title,
            price: top.price,
            link: top.link,
            rating: top.rating,
            reviews: top.reviews,
            image: top.image,
          };
        } else {
          results[query] = { title: '', link: '' };
        }
      });
      await Promise.allSettled(promises);
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 });
  }
}


