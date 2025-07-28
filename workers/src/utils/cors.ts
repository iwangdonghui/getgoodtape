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

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return headers;
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
