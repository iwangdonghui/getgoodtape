/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 减少 bundle 大小
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
