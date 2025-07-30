/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 减少 bundle 大小

  // 性能优化配置
  experimental: {
    optimizeCss: true, // CSS 优化
    optimizePackageImports: ['@tanstack/react-query'], // 包导入优化
  },

  // 压缩配置
  compress: true,

  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 缓存头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // API 路由重写到 Cloudflare Workers
  async rewrites() {
    return [
      {
        source: '/api/convert/:path*',
        destination:
          'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/convert/:path*',
      },
      {
        source: '/api/status/:path*',
        destination:
          'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/status/:path*',
      },
      {
        source: '/api/platforms/:path*',
        destination:
          'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/platforms/:path*',
      },
      {
        source: '/api/download/:path*',
        destination:
          'https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/download/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
