/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 减少 bundle 大小

  // 性能优化配置
  experimental: {
    // 暂时禁用CSS优化以避免Vercel部署问题
    // optimizeCss: true, // CSS 优化
    optimizePackageImports: ['@tanstack/react-query'], // 包导入优化
    // 启用更多性能优化
    serverComponentsExternalPackages: ['sharp'], // 外部化图片处理包
    optimizeServerReact: true, // 优化服务器端 React
  },

  // 压缩配置
  compress: true,

  // 启用 SWC 压缩器
  swcMinify: true,

  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 添加图片尺寸优化
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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

  // API 路由重写到 Cloudflare Workers (仅在生产环境)
  async rewrites() {
    // 在开发环境中不使用重写，让本地API路由处理请求
    if (process.env.NODE_ENV === 'development') {
      return [];
    }

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

  // Webpack 优化配置
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev) {
      // 启用更激进的代码分割
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // 启用 Tree Shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // 优化模块解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };

    return config;
  },

  // 性能预算配置
  onDemandEntries: {
    // 页面在内存中保持的时间
    maxInactiveAge: 25 * 1000,
    // 同时保持的页面数
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
