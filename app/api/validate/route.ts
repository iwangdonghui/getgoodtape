import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const requestData = JSON.parse(body);
    console.log('🔍 Validate API called with URL:', requestData.url);

    // 使用Workers的 validate 端点来验证 URL
    const response = await fetch(`${WORKERS_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();

    // 转换后端响应为前端期望的格式
    if (data.isValid) {
      return Response.json({
        isValid: true,
        platform: data.platform,
        metadata: data.metadata,
        videoId: data.videoId,
        normalizedUrl: data.normalizedUrl,
      });
    } else {
      return Response.json({
        isValid: false,
        error: data.error || {
          type: 'VALIDATION_ERROR',
          message: 'Unable to validate video URL',
          retryable: true,
        },
      });
    }
  } catch (error) {
    console.error('Validation proxy error:', error);
    return Response.json(
      {
        isValid: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network error occurred',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
