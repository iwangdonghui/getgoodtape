import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: object;
}

const defaultSEO = {
  title:
    'GetGoodTape - YouTube to MP3 Converter | Free Video to Audio Converter',
  description:
    'Convert YouTube videos to MP3 and MP4 for free. Fast, secure, and high-quality video to audio converter supporting YouTube, TikTok, Twitter, Facebook, and Instagram.',
  keywords: [
    'YouTube to MP3',
    'YouTube to MP4',
    'video converter',
    'audio converter',
    'YouTube converter',
    'MP3 converter',
    'video to audio',
    'download YouTube',
    'TikTok converter',
    'Twitter video download',
    'Facebook video converter',
    'Instagram video download',
    'free converter',
    'online converter',
    'GetGoodTape',
  ],
  ogImage: '/og-image.png',
  ogType: 'website' as const,
  twitterCard: 'summary_large_image' as const,
};

export default function SEOHead({
  title = defaultSEO.title,
  description = defaultSEO.description,
  keywords = defaultSEO.keywords,
  canonicalUrl,
  ogImage = defaultSEO.ogImage,
  ogType = defaultSEO.ogType,
  twitterCard = defaultSEO.twitterCard,
  structuredData,
}: SEOHeadProps) {
  const fullTitle =
    title === defaultSEO.title ? title : `${title} | GetGoodTape`;
  const currentUrl =
    canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  // 结构化数据 - WebApplication
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GetGoodTape',
    description: description,
    url: 'https://getgoodtape.com',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'YouTube to MP3 conversion',
      'YouTube to MP4 conversion',
      'TikTok video download',
      'Twitter video download',
      'Facebook video download',
      'Instagram video download',
      'High quality audio extraction',
      'Fast conversion speed',
      'No registration required',
      'Free to use',
    ],
    screenshot: ogImage,
    softwareVersion: '1.0',
    author: {
      '@type': 'Organization',
      name: 'GetGoodTape',
    },
  };

  return (
    <Head>
      {/* 基本 Meta 标签 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="GetGoodTape" />
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph 标签 */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage} />
      <meta
        property="og:image:alt"
        content="GetGoodTape - Video to Audio Converter"
      />
      <meta property="og:site_name" content="GetGoodTape" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card 标签 */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta
        name="twitter:image:alt"
        content="GetGoodTape - Video to Audio Converter"
      />

      {/* 额外的 SEO 标签 */}
      <meta name="theme-color" content="#F97316" />
      <meta name="msapplication-TileColor" content="#F97316" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="GetGoodTape" />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />

      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData || defaultStructuredData),
        }}
      />

      {/* 预连接到外部域名 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />

      {/* DNS 预取 */}
      <link rel="dns-prefetch" href="//www.youtube.com" />
      <link rel="dns-prefetch" href="//www.tiktok.com" />
      <link rel="dns-prefetch" href="//twitter.com" />
      <link rel="dns-prefetch" href="//www.facebook.com" />
      <link rel="dns-prefetch" href="//www.instagram.com" />
    </Head>
  );
}

// 预定义的页面 SEO 配置
export const pageSEO = {
  home: {
    title:
      'GetGoodTape - Free YouTube to MP3 Converter | Video to Audio Online',
    description:
      'Convert YouTube videos to MP3 and MP4 for free. Fast, secure, and high-quality video to audio converter supporting YouTube, TikTok, Twitter, Facebook, and Instagram.',
    keywords: [
      'YouTube to MP3 converter',
      'YouTube to MP4 converter',
      'free video converter',
      'online audio converter',
      'YouTube downloader',
      'video to MP3',
      'GetGoodTape',
    ],
  },

  app: {
    title: 'Convert Videos - GetGoodTape Video to Audio Converter',
    description:
      'Start converting your videos to MP3 or MP4 now. Paste any YouTube, TikTok, Twitter, Facebook, or Instagram video URL and get high-quality audio files instantly.',
    keywords: [
      'convert video',
      'video converter app',
      'YouTube converter online',
      'MP3 converter',
      'video to audio converter',
      'download video audio',
    ],
  },

  about: {
    title: 'About GetGoodTape - Professional Video to Audio Conversion',
    description:
      'Learn about GetGoodTape, the leading free online video to audio converter. Discover our features, supported platforms, and commitment to quality.',
    keywords: [
      'about GetGoodTape',
      'video converter features',
      'supported platforms',
      'video conversion quality',
    ],
  },
};
