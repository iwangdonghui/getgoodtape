import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '../components/QueryProvider';
import MemoryOptimizer from '../components/MemoryOptimizer';
import MobilePerformanceOptimizer from '../components/MobilePerformanceOptimizer';

export const metadata: Metadata = {
  metadataBase: new URL('https://getgoodtape.com'),
  title:
    'YouTube to MP3 Converter - Free Online Video to Audio Converter | GetGoodTape',
  description:
    'Convert YouTube videos to MP3 and MP4 files for free. Fast, secure, and high-quality video conversion from YouTube, TikTok, Twitter, Facebook, and Instagram. No registration required.',
  keywords:
    'YouTube to MP3, video converter, YouTube converter, MP3 converter, MP4 converter, online converter, free converter, video to audio, TikTok to mp3, Twitter video converter, Facebook video converter, Instagram video converter',
  openGraph: {
    title: 'YouTube to MP3 Converter - Free Online Video Converter',
    description:
      'Convert YouTube videos to MP3 and MP4 files for free. Fast, secure, and high-quality video conversion.',
    type: 'website',
    url: 'https://getgoodtape.com',
    siteName: 'GetGoodTape',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GetGoodTape - YouTube to MP3 Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube to MP3 Converter - Free Online Video Converter',
    description:
      'Convert YouTube videos to MP3 and MP4 files for free. Fast, secure, and high-quality video conversion.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://getgoodtape.com',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GetGoodTape',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4F46E5' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1E1E' },
  ],
  viewportFit: 'cover', // 支持刘海屏等异形屏
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-brand antialiased">
        <MemoryOptimizer enableGarbageCollection={true} memoryThreshold={120}>
          <MobilePerformanceOptimizer>
            <QueryProvider>{children}</QueryProvider>
          </MobilePerformanceOptimizer>
        </MemoryOptimizer>
      </body>
    </html>
  );
}
