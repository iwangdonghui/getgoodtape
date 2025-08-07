import { NextRequest } from 'next/server';

const WORKERS_WS_URL =
  'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function GET(request: NextRequest) {
  console.log('🔌 WebSocket upgrade request received');

  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  try {
    // In a real implementation, we would need to handle WebSocket proxying
    // For now, we'll return instructions for direct connection
    return new Response(
      JSON.stringify({
        error: 'WebSocket proxy not implemented',
        message: 'Please connect directly to Workers WebSocket',
        wsUrl: WORKERS_WS_URL,
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('WebSocket proxy error:', error);
    return new Response('WebSocket proxy error', { status: 500 });
  }
}

// Handle WebSocket upgrade for development
export async function POST(request: NextRequest) {
  return GET(request);
}
