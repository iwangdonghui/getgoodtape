import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://getgoodtape.com';

  const robots = `User-agent: *
Allow: /

# 允许搜索引擎访问所有公开页面
Allow: /app
Allow: /about
Allow: /help
Allow: /platforms
Allow: /youtube-to-mp3
Allow: /youtube-to-mp4
Allow: /tiktok-to-mp3
Allow: /twitter-to-mp3
Allow: /facebook-to-mp3
Allow: /instagram-to-mp3

# 禁止访问管理和API路径
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /static/

# 站点地图位置
Sitemap: ${baseUrl}/sitemap.xml

# 爬取延迟 (对服务器友好)
Crawl-delay: 1

# 特定搜索引擎优化
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 缓存24小时
    },
  });
}
