/**
 * CORS utility functions for GetGoodTape API
 */

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  maxAge?: number;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://getgoodtape.com',
  'https://www.getgoodtape.com',
  'http://localhost:3000',
  'http://localhost:8787',
  'https://getgoodtape-git-main-donghuis-projects.vercel.app',
  'https://getgoodtape.vercel.app',
  // 支持所有 Vercel 预览部署
  /^https:\/\/getgoodtape-.*\.vercel\.app$/,
];

export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = DEFAULT_ALLOWED_ORIGINS;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
  };

  // Check if origin is allowed (support both strings and regex patterns)
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    // Use the first string origin as fallback
    const fallbackOrigin = allowedOrigins.find(
      o => typeof o === 'string'
    ) as string;
    headers['Access-Control-Allow-Origin'] =
      fallbackOrigin || 'https://getgoodtape.com';
  }

  return headers;
}

/**
 * Check if origin is allowed (supports regex patterns)
 */
function isOriginAllowed(
  origin: string,
  allowedOrigins: (string | RegExp)[]
): boolean {
  return allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    } else if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(request.headers.get('Origin') || undefined),
    });
  }
  return null;
}

export function addCorsHeaders(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers);
  const corsHeadersObj = corsHeaders(origin);

  Object.entries(corsHeadersObj).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Legacy support for existing interface
export function createCorsHeaders(options: CorsOptions = {}): Headers {
  const headers = new Headers();

  // Set allowed origins
  const origin = options.origin || DEFAULT_ALLOWED_ORIGINS[0];
  if (Array.isArray(origin)) {
    headers.set('Access-Control-Allow-Origin', origin[0]);
  } else {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  // Set allowed methods
  const methods = options.methods || [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'OPTIONS',
  ];
  headers.set('Access-Control-Allow-Methods', methods.join(', '));

  // Set allowed headers
  const allowedHeaders = options.headers || [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ];
  headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));

  // Set max age
  const maxAge = options.maxAge || 86400;
  headers.set('Access-Control-Max-Age', maxAge.toString());

  return headers;
}

export function handleCorsPreflightRequest(
  request: Request,
  options: CorsOptions = {}
): Response {
  const headers = createCorsHeaders(options);
  return new Response(null, { status: 204, headers });
}
