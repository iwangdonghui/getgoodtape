import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '../components/QueryProvider';

export const metadata: Metadata = {
  title: 'GetGoodTape - From noisy video to pristine tape',
  description:
    'Convert YouTube, TikTok, and social media videos to high-quality MP3 and MP4 formats. Coming soon.',
  keywords:
    'YouTube mp3 converter, TikTok to mp3, video converter, audio converter',
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
  themeColor: '#FF8C42',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-brand antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
