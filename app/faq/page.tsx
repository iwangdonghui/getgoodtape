import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';

const faqData = [
  {
    question: 'What video platforms do you support?',
    answer:
      'We support YouTube, TikTok, Instagram, Twitter, Facebook, and many other popular video platforms. Our platform list is constantly expanding.',
  },
  {
    question: 'Is GetGoodTape free to use?',
    answer:
      'Yes! GetGoodTape is completely free to use. We believe in providing high-quality video conversion services without any cost.',
  },
  {
    question: 'What formats can I convert to?',
    answer:
      'You can convert videos to MP3 (audio only) or MP4 (video + audio) formats with multiple quality options for each format.',
  },
  {
    question: 'How long does conversion take?',
    answer:
      'Conversion time depends on the video length and quality settings. Most videos are processed within 1-3 minutes.',
  },
  {
    question: 'Is my data safe and private?',
    answer:
      'Absolutely! We process your videos securely and automatically delete all files after conversion. We never store your personal data or videos.',
  },
  {
    question: "What's the maximum video length I can convert?",
    answer:
      'You can convert videos up to 2 hours in length. For longer videos, please contact our support team.',
  },
];

export default function FAQPage() {
  return (
    <>
      <SEOHead
        title="FAQ - GetGoodTape"
        description="Frequently asked questions about GetGoodTape video converter"
        canonicalUrl="/faq"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header variant="app" />

        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about GetGoodTape
              </p>
            </div>

            <div className="space-y-6">
              {faqData.map((faq, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <div className="bg-muted/30 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Still have questions?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Can't find the answer you're looking for? Feel free to reach
                  out to our support team.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
