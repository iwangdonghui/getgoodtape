import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(`${WORKERS_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Validation proxy error:', error);
    return Response.json({ error: 'Validation proxy error' }, { status: 500 });
  }
}
