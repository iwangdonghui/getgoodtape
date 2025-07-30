'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import MobileKeyboardHandler from '../components/MobileKeyboardHandler';
import MobileTouchFeedback from '../components/MobileTouchFeedback';
import MobilePerformanceOptimizer from '../components/MobilePerformanceOptimizer';
import SEOHead, { pageSEO } from '../components/SEOHead';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        setIsSubscribed(true);
        setEmail('');
      } else {
        console.error('Subscription failed:', data.error);
        alert('订阅失败，请稍后重试。');
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('网络错误，请检查连接后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead {...pageSEO.home} />
      <MobilePerformanceOptimizer>
        <MobileKeyboardHandler>
          <div className="min-h-screen bg-cream mobile-safe-area mobile-scroll-optimized">
            {/* Header */}
            <header className="mobile-container py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Logo size="lg" />
                  <h1 className="text-lg sm:text-2xl font-bold text-deep-brown">
                    GetGoodTape
                  </h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <Link
                    href="/app"
                    className="mobile-link bg-warm-orange text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-warm-orange/90 transition-colors font-medium text-sm sm:text-base"
                  >
                    Try Beta
                  </Link>
                  <div className="hidden sm:block text-sm text-deep-brown/70">
                    Coming Soon
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="mobile-container py-8 sm:py-12">
              <div className="max-w-4xl mx-auto text-center">
                {/* Hero Section */}
                <div className="mb-12 sm:mb-16">
                  <div className="mb-6 sm:mb-8">
                    <Logo size="lg" className="mx-auto mb-4 sm:mb-6" />
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-deep-brown mb-3 sm:mb-4">
                      GetGoodTape
                    </h2>
                    <p className="text-lg sm:text-xl md:text-2xl text-warm-orange font-medium mb-6 sm:mb-8 px-4">
                      From noisy video to pristine tape
                    </p>

                    {/* Main CTA Button */}
                    <div className="mb-6 sm:mb-8 px-4">
                      <MobileTouchFeedback className="w-full sm:w-auto inline-block">
                        <Link
                          href="/app"
                          className="mobile-link bg-gradient-to-r from-warm-orange to-tape-gold text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:shadow-lg hover:scale-105 hover:rounded-xl transition-all duration-200 w-full sm:w-auto"
                        >
                          🚀 Start Converting Now (Beta)
                        </Link>
                      </MobileTouchFeedback>
                      <p className="text-xs sm:text-sm text-deep-brown/60 mt-3 px-2">
                        No signup required • Free to use • Instant results
                      </p>
                    </div>
                  </div>

                  <div className="mobile-card mb-8 sm:mb-12">
                    <h3 className="text-xl sm:text-2xl font-semibold text-deep-brown mb-3 sm:mb-4">
                      Transform Your Videos Into Perfect Audio
                    </h3>
                    <p className="text-base sm:text-lg text-deep-brown/80 mb-4 sm:mb-6 max-w-2xl mx-auto">
                      Convert videos from YouTube, TikTok, Twitter, Facebook,
                      and Instagram into high-quality MP3 and MP4 files. Clean,
                      fast, and reliable.
                    </p>

                    {/* Supported Platforms */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
                      {[
                        'YouTube',
                        'TikTok',
                        'Twitter',
                        'Facebook',
                        'Instagram',
                      ].map(platform => (
                        <span
                          key={platform}
                          className="bg-warm-orange/10 text-deep-brown px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Try Now Section */}
                <div className="bg-mint-green/20 border border-mint-green/30 rounded-2xl p-8 mb-8">
                  <h3 className="text-2xl font-bold text-deep-brown mb-4">
                    🎉 Beta is Live!
                  </h3>
                  <p className="text-lg text-deep-brown/80 mb-6">
                    Our beta version is ready! Start converting your videos
                    right now.
                  </p>
                  <Link
                    href="/app"
                    className="inline-block bg-mint-green text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-mint-green/90 transition-colors"
                  >
                    Try GetGoodTape Beta →
                  </Link>
                </div>

                {/* Email Subscription */}
                <div className="bg-gradient-to-r from-warm-orange to-tape-gold rounded-2xl p-6 sm:p-8 text-white mb-12 sm:mb-16">
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                    Want updates on new features?
                  </h3>
                  <p className="text-base sm:text-lg mb-4 sm:mb-6 opacity-90">
                    Subscribe to get notified about new features, improvements,
                    and the official launch.
                  </p>

                  {!isSubscribed ? (
                    <form
                      onSubmit={handleSubscribe}
                      className="max-w-md mx-auto"
                    >
                      <div className="mobile-flex">
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="flex-1 mobile-input text-deep-brown placeholder-deep-brown/60 focus:ring-mint-green"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn-primary whitespace-nowrap disabled:opacity-50 w-full sm:w-auto"
                        >
                          {isLoading ? 'Subscribing...' : 'Notify Me'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-mint-green/20 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
                      <p className="text-base sm:text-lg font-medium">
                        🎉 Thanks for subscribing! We'll be in touch soon.
                      </p>
                    </div>
                  )}
                </div>

                {/* Features Preview */}
                <div className="mobile-grid gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
                  <div className="bg-white/30 rounded-xl p-4 sm:p-6 border border-warm-orange/20">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-deep-brown"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-deep-brown mb-2">
                      High Quality
                    </h4>
                    <p className="text-sm sm:text-base text-deep-brown/70">
                      Crystal clear audio extraction with multiple quality
                      options
                    </p>
                  </div>

                  <div className="bg-white/30 rounded-xl p-6 border border-warm-orange/20">
                    <div className="w-12 h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-deep-brown"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-deep-brown mb-2">
                      Lightning Fast
                    </h4>
                    <p className="text-deep-brown/70">
                      Quick conversions with instant downloads
                    </p>
                  </div>

                  <div className="bg-white/30 rounded-xl p-6 border border-warm-orange/20">
                    <div className="w-12 h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-deep-brown"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-deep-brown mb-2">
                      Secure & Private
                    </h4>
                    <p className="text-deep-brown/70">
                      Your files are processed securely and deleted
                      automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Final CTA */}
              <div className="bg-deep-brown text-white rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Ready to Get Good Tape?
                </h3>
                <p className="text-lg mb-6 opacity-90">
                  Join thousands of creators who are already using GetGoodTape
                  to convert their favorite videos.
                </p>
                <Link
                  href="/app"
                  className="inline-block bg-warm-orange text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-warm-orange/90 transition-colors"
                >
                  Start Converting Free →
                </Link>
              </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-warm-orange/20 py-8">
              <div className="container mx-auto px-4 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Logo size="sm" />
                  <span className="text-deep-brown font-medium">
                    GetGoodTape
                  </span>
                </div>
                <p className="text-deep-brown/60 text-sm">
                  © 2025 GetGoodTape. Coming soon to transform your video
                  experience.
                </p>
              </div>
            </footer>
          </div>
        </MobileKeyboardHandler>
      </MobilePerformanceOptimizer>
    </>
  );
}
