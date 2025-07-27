'use client';

import { useState } from 'react';
import Logo from '../components/Logo';

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

      const data = await response.json();

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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="lg" />
            <h1 className="text-2xl font-bold text-deep-brown">GetGoodTape</h1>
          </div>
          <div className="text-sm text-deep-brown/70">
            Coming Soon
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="mb-8">
              <Logo size="lg" className="mx-auto mb-6" />
              <h2 className="text-5xl md:text-6xl font-bold text-deep-brown mb-4">
                GetGoodTape
              </h2>
              <p className="text-xl md:text-2xl text-warm-orange font-medium mb-8">
                From noisy video to pristine tape
              </p>
            </div>
            
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-warm-orange/20">
              <h3 className="text-2xl font-semibold text-deep-brown mb-4">
                Transform Your Videos Into Perfect Audio
              </h3>
              <p className="text-lg text-deep-brown/80 mb-6 max-w-2xl mx-auto">
                Convert videos from YouTube, TikTok, Twitter, Facebook, and Instagram 
                into high-quality MP3 and MP4 files. Clean, fast, and reliable.
              </p>
              
              {/* Supported Platforms */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {['YouTube', 'TikTok', 'Twitter', 'Facebook', 'Instagram'].map((platform) => (
                  <span 
                    key={platform}
                    className="bg-warm-orange/10 text-deep-brown px-4 py-2 rounded-full text-sm font-medium"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Email Subscription */}
          <div className="bg-gradient-to-r from-warm-orange to-tape-gold rounded-2xl p-8 text-white mb-16">
            <h3 className="text-2xl font-bold mb-4">
              Be the first to know when we launch!
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Get early access and exclusive features when GetGoodTape goes live.
            </p>
            
            {!isSubscribed ? (
              <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 rounded-lg text-deep-brown placeholder-deep-brown/60 focus:outline-none focus:ring-2 focus:ring-mint-green"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary whitespace-nowrap disabled:opacity-50"
                  >
                    {isLoading ? 'Subscribing...' : 'Notify Me'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-mint-green/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-lg font-medium">
                  🎉 Thanks for subscribing! We'll be in touch soon.
                </p>
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/30 rounded-xl p-6 border border-warm-orange/20">
              <div className="w-12 h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-deep-brown" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-deep-brown mb-2">High Quality</h4>
              <p className="text-deep-brown/70">
                Crystal clear audio extraction with multiple quality options
              </p>
            </div>
            
            <div className="bg-white/30 rounded-xl p-6 border border-warm-orange/20">
              <div className="w-12 h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-deep-brown" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-deep-brown mb-2">Lightning Fast</h4>
              <p className="text-deep-brown/70">
                Quick conversions with instant downloads
              </p>
            </div>
            
            <div className="bg-white/30 rounded-xl p-6 border border-warm-orange/20">
              <div className="w-12 h-12 bg-mint-green rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-deep-brown" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-deep-brown mb-2">Secure & Private</h4>
              <p className="text-deep-brown/70">
                Your files are processed securely and deleted automatically
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-orange/20 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Logo size="sm" />
            <span className="text-deep-brown font-medium">GetGoodTape</span>
          </div>
          <p className="text-deep-brown/60 text-sm">
            © 2024 GetGoodTape. Coming soon to transform your video experience.
          </p>
        </div>
      </footer>
    </div>
  );
}