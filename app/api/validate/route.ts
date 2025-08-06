import { NextRequest } from 'next/server';

const BACKEND_URL = 'https://getgoodtape-video-proc.fly.dev'; // 强制使用生产环境

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const requestData = JSON.parse(body);
    console.log('🔍 Validate API called with URL:', requestData.url);

    // 使用后端的 extract-metadata 端点来验证 URL
    const response = await fetch(`${BACKEND_URL}/extract-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();

    // 转换后端响应为前端期望的格式
    if (data.success && data.metadata) {
      return Response.json({
        isValid: true,
        platform: 'youtube', // 根据 URL 检测平台
        metadata: {
          title: data.metadata.title,
          duration: data.metadata.duration,
          thumbnail: data.metadata.thumbnail,
          uploader: data.metadata.uploader,
          channelTitle: data.metadata.uploader,
          videoId: data.metadata.id,
          platform: 'youtube',
        },
      });
    } else {
      return Response.json({
        isValid: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: data.error || 'Unable to validate video URL',
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
