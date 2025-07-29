/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 减少 bundle 大小
  // API 路由重写到 Cloudflare Workers
  async rewrites() {
    return [
      {
        source: '/api/convert/:path*',
        destination: 'https://api.getgoodtape.com/convert/:path*',
      },
      {
        source: '/api/status/:path*',
        destination: 'https://api.getgoodtape.com/status/:path*',
      },
      {
        source: '/api/platforms/:path*',
        destination: 'https://api.getgoodtape.com/platforms/:path*',
      },
      {
        source: '/api/download/:path*',
        destination: 'https://api.getgoodtape.com/download/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
