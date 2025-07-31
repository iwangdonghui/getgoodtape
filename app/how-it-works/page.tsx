import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';

const steps = [
  {
    number: 1,
    title: 'Paste Video URL',
    description:
      'Copy and paste the URL of the video you want to convert from any supported platform.',
    icon: '🔗',
  },
  {
    number: 2,
    title: 'Choose Format & Quality',
    description:
      'Select your preferred output format (MP3 or MP4) and quality settings.',
    icon: '⚙️',
  },
  {
    number: 3,
    title: 'Start Conversion',
    description:
      'Click the convert button and our advanced processing system will handle the rest.',
    icon: '🚀',
  },
  {
    number: 4,
    title: 'Download Your File',
    description:
      'Once processing is complete, download your converted file instantly.',
    icon: '⬇️',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SEOHead
        title="How It Works - GetGoodTape"
        description="Learn how to convert videos to MP3 and MP4 with GetGoodTape in 4 simple steps"
        canonicalUrl="/how-it-works"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header variant="app" />

        <main className="flex-1 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                How It Works
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Convert your favorite videos to high-quality audio and video
                files in just 4 simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {steps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <span className="text-3xl">{step.icon}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of users who trust GetGoodTape for their video
                conversion needs. Fast, reliable, and completely free.
              </p>
              <a
                href="/app"
                className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-semibold"
              >
                Start Converting Now
              </a>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl mb-4">🎵</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  High Quality
                </h3>
                <p className="text-muted-foreground text-sm">
                  Crystal clear audio and video output with multiple quality
                  options
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Lightning Fast
                </h3>
                <p className="text-muted-foreground text-sm">
                  Advanced processing technology for quick conversions
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-4">🔒</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Secure & Private
                </h3>
                <p className="text-muted-foreground text-sm">
                  Your files are processed securely and deleted after conversion
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
