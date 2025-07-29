import { NextRequest } from 'next/server';

const WORKERS_URL =
  'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileName: string } }
) {
  try {
    const { fileName } = params;

    const response = await fetch(`${WORKERS_URL}/api/download/${fileName}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return Response.json(
        { error: 'File not found' },
        { status: response.status }
      );
    }

    // Forward the file response with proper headers
    const headers = new Headers();

    // Copy relevant headers from the Workers response
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const contentDisposition = response.headers.get('content-disposition');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentDisposition)
      headers.set('Content-Disposition', contentDisposition);

    // Add download headers
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return Response.json({ error: 'Download failed' }, { status: 500 });
  }
}
