import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';

export default function ContactPage() {
  return (
    <>
      <SEOHead
        title="Contact Us - GetGoodTape"
        description="Get in touch with the GetGoodTape team for support, feedback, or business inquiries"
        canonicalUrl="/contact"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header variant="app" />

        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Contact Us
              </h1>
              <p className="text-lg text-muted-foreground">
                We'd love to hear from you. Get in touch with our team.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-card border border-border rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-6">
                  Send us a message
                </h2>
                <form className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Subject
                    </label>
                    <select
                      id="subject"
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select a subject</option>
                      <option value="support">Technical Support</option>
                      <option value="feedback">Feedback</option>
                      <option value="business">Business Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Tell us how we can help you..."
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Send Message
                  </button>
                </form>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-6">
                    Get in touch
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Have a question or need help? We're here to assist you with
                    any issues or feedback you might have.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">📧</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Email
                      </h3>
                      <p className="text-muted-foreground">
                        support@getgoodtape.com
                      </p>
                      <p className="text-sm text-muted-foreground">
                        We'll respond within 24 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">💬</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Live Chat
                      </h3>
                      <p className="text-muted-foreground">
                        Available on our website
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Monday to Friday, 9 AM - 6 PM EST
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🐦</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Social Media
                      </h3>
                      <p className="text-muted-foreground">@getgoodtape</p>
                      <p className="text-sm text-muted-foreground">
                        Follow us for updates and tips
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Quick Help
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Looking for immediate answers? Check out our FAQ section for
                    common questions and solutions.
                  </p>
                  <a
                    href="/faq"
                    className="inline-flex items-center text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                  >
                    Visit FAQ →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
