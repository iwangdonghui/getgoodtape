import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy health check to avoid CORS issues in diagnostics
 */
export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/health',
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Workers API returned ${response.status}`,
          status: response.status,
          statusText: response.statusText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      status: response.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    let errorMessage = 'Unknown error';
    let errorType = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.name === 'AbortError') {
        errorType = 'TIMEOUT_ERROR';
        errorMessage = 'Request timeout (10 seconds)';
      } else if (error.message.includes('Failed to fetch')) {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'Network connection failed';
      } else if (error.message.includes('NetworkError')) {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'Network error occurred';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorType,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
