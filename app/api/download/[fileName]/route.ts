import { NextRequest } from 'next/server';

const BACKEND_URL = 'https://getgoodtape-video-proc.fly.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileName: string } }
) {
  try {
    const { fileName } = params;
    console.log('🔗 Download request for:', fileName);

    const response = await fetch(`${BACKEND_URL}/download/${fileName}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Backend download failed:', response.status);
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    // 获取文件内容和头部信息
    const fileBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    console.log('✅ Download successful:', {
      fileName,
      contentType,
      size: contentLength,
    });

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        ...(contentLength && { 'Content-Length': contentLength }),
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return Response.json({ error: 'Download proxy error' }, { status: 500 });
  }
}
