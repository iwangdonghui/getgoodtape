import { NextRequest } from 'next/server';

const WORKERS_WS_URL =
  'wss://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/ws';

export async function GET(request: NextRequest) {
  console.log('🔌 WebSocket upgrade request received');

  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    // 如果不是WebSocket升级请求，返回WebSocket信息
    return new Response(
      JSON.stringify({
        message: 'WebSocket endpoint',
        development: {
          note: 'In development, WebSocket connections are simulated',
          directUrl: WORKERS_WS_URL,
        },
        production: {
          url: WORKERS_WS_URL,
        },
        status: 'available',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    // 在开发环境中，我们模拟WebSocket连接
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Simulating WebSocket connection');

      // 返回模拟的WebSocket响应
      return new Response(
        JSON.stringify({
          message: 'WebSocket simulation in development',
          note: 'Real WebSocket connections require Workers deployment',
          directUrl: WORKERS_WS_URL,
          suggestion: 'Use direct Workers URL for real WebSocket connections',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 生产环境中尝试代理到Workers
    return new Response(
      JSON.stringify({
        error: 'WebSocket proxy not fully implemented',
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
