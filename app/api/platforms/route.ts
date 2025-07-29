import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${WORKERS_URL}/api/platforms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}
