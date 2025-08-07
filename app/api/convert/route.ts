import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('🔄 Proxying convert request to Workers API');

    const response = await fetch(`${WORKERS_URL}/api/convert`, {
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
    console.error('Proxy error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}
