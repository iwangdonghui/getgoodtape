import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-video-proc.fly.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    const response = await fetch(`${WORKERS_URL}/api/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json({ error: 'Proxy error' }, { status: 500 });
  }
}
