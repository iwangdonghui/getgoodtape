import { NextRequest } from 'next/server';

const WORKERS_URL =
  process.env.NODE_ENV === 'development'
    ? 'https://getgoodtape-video-proc.fly.dev'
    : 'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('🔍 Validate API called with body:', body);

    // In development, return a mock success response if Fly.io doesn't have this endpoint
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: returning mock validation response');
      return Response.json({
        success: true,
        message: 'Validation successful (dev mode)',
        timestamp: new Date().toISOString(),
      });
    }

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
