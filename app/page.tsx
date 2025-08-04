'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileKeyboardHandler from '../components/MobileKeyboardHandler';
import MobileTouchFeedback from '../components/MobileTouchFeedback';
import MobilePerformanceOptimizer from '../components/MobilePerformanceOptimizer';
import SEOHead, { pageSEO } from '../components/SEOHead';

export default function HomePage() {
  return (
    <>
      <SEOHead {...pageSEO.home} />
      <MobilePerformanceOptimizer>
        <MobileKeyboardHandler>
          <div className="min-h-screen bg-background mobile-safe-area mobile-scroll-optimized transition-colors duration-300 flex flex-col">
            {/* Header */}
            <Header variant="landing" />

            {/* Main Content */}
            <main className="mobile-container py-8 sm:py-12 flex-1">
              <div className="max-w-6xl mx-auto">
                {/* Hero Section */}
                <section className="text-center mb-16 sm:mb-20">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                    Convert Any Video to MP3 in{' '}
                    <span className="text-primary">Seconds</span>
                  </h1>
                  <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                    The fastest, easiest way to extract high-quality audio from
                    YouTube, TikTok, and any video platform. No registration
                    required.
                  </p>
                  <div className="mb-8">
                    <MobileTouchFeedback className="inline-block">
                      <Link
                        href="/app"
                        className="mobile-link bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-xl font-semibold hover:shadow-lg transition-all duration-200 inline-block"
                      >
                        Convert Your First Video Free →
                      </Link>
                    </MobileTouchFeedback>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      No registration required
                    </span>
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      100% Free forever
                    </span>
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      High-quality output
                    </span>
                  </div>
                </section>

                {/* Loss Aversion Section */}
                <section className="bg-red-50 dark:bg-slate-800 dark:border-red-600 border border-red-200 rounded-2xl p-8 mb-16 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Stop Wasting Hours on Complicated Software
                  </h2>
                  <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 max-w-2xl mx-auto">
                    Tired of downloading sketchy software, dealing with ads, or
                    paying monthly fees just to convert a simple video? Most
                    converters are slow, unreliable, or filled with malware.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Slow downloads
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Annoying ads
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Hidden fees
                    </div>
                  </div>
                </section>

                {/* Process Section - How It Works */}
                <section className="mb-16 sm:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                      How It Works
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Convert any video to MP3 in just 3 simple steps
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-primary-foreground">
                          1
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Paste Video URL
                      </h3>
                      <p className="text-muted-foreground">
                        Copy and paste any video link from YouTube, TikTok,
                        Twitter, Facebook, or Instagram
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-primary-foreground">
                          2
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Choose Format
                      </h3>
                      <p className="text-muted-foreground">
                        Select MP3 for audio or MP4 for video, and pick your
                        preferred quality
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold text-primary-foreground">
                          3
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Download Instantly
                      </h3>
                      <p className="text-muted-foreground">
                        Your file is ready in seconds. Download directly to your
                        device
                      </p>
                    </div>
                  </div>
                </section>

                {/* Benefits Section */}
                <section className="mb-16 sm:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                      Why Choose GetGoodTape?
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      The most reliable video converter on the web
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <svg
                          className="w-6 h-6 text-primary-foreground"
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Lightning Fast
                      </h3>
                      <p className="text-muted-foreground">
                        Convert videos in seconds, not minutes. Our optimized
                        servers ensure the fastest processing times.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <svg
                          className="w-6 h-6 text-primary-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        High Quality
                      </h3>
                      <p className="text-muted-foreground">
                        Crystal clear audio extraction with multiple quality
                        options up to 320kbps MP3 and 1080p MP4.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                        <svg
                          className="w-6 h-6 text-primary-foreground"
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        100% Secure
                      </h3>
                      <p className="text-muted-foreground">
                        Your files are processed securely and automatically
                        deleted. No data is stored on our servers.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Pricing Section */}
                <section className="mb-16 sm:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                      Simple, Transparent Pricing
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Everything you need, completely free
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <div className="bg-card rounded-2xl p-8 border border-border shadow-lg relative">
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          Free Forever
                        </h3>
                        <div className="mb-6">
                          <span className="text-5xl font-bold text-foreground">
                            $0
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-left">
                          <li className="flex items-center gap-3">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-foreground">
                              Unlimited conversions
                            </span>
                          </li>
                          <li className="flex items-center gap-3">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-foreground">
                              All supported platforms
                            </span>
                          </li>
                          <li className="flex items-center gap-3">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-foreground">
                              High-quality output (up to 320kbps)
                            </span>
                          </li>
                          <li className="flex items-center gap-3">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-foreground">
                              No ads or watermarks
                            </span>
                          </li>
                          <li className="flex items-center gap-3">
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-foreground">
                              No registration required
                            </span>
                          </li>
                        </ul>
                        <MobileTouchFeedback className="w-full">
                          <Link
                            href="/app"
                            className="mobile-link w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold transition-colors"
                          >
                            Start Converting Now
                          </Link>
                        </MobileTouchFeedback>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Testimonials */}
                <section className="mb-16 sm:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                      What Our Users Say
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Join thousands of satisfied users
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="flex text-yellow-400">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        "Finally, a converter that actually works! No ads, no
                        BS, just clean conversions. I use it daily for my
                        podcast research."
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-semibold">
                            M
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Mike Chen
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Podcast Creator
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="flex text-yellow-400">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        "Super fast and reliable. I've converted hundreds of
                        TikTok videos for my content creation. The quality is
                        always perfect."
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-semibold">
                            S
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Sarah Johnson
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Content Creator
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="flex text-yellow-400">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        "Love how simple it is. No registration, no payment,
                        just paste and download. Exactly what I needed for my
                        music collection."
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-semibold">
                            D
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            David Rodriguez
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Music Enthusiast
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* FAQ Section */}
                <section className="mb-16 sm:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                      Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Everything you need to know about GetGoodTape
                    </p>
                  </div>
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-card rounded-xl p-6 border border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Is GetGoodTape really free?
                      </h3>
                      <p className="text-muted-foreground">
                        Yes! GetGoodTape is completely free to use. No hidden
                        fees, no subscription required, and no limits on the
                        number of conversions.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        What video platforms are supported?
                      </h3>
                      <p className="text-muted-foreground">
                        We support YouTube, TikTok, Twitter, Facebook,
                        Instagram, and many other popular video platforms. Just
                        paste any video URL and we'll handle the rest.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        What quality options are available?
                      </h3>
                      <p className="text-muted-foreground">
                        For MP3: 128kbps, 192kbps, and 320kbps. For MP4: 360p,
                        720p, and 1080p (depending on source quality).
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Is it safe to use?
                      </h3>
                      <p className="text-muted-foreground">
                        Absolutely! We don't store your files on our servers.
                        Everything is processed securely and deleted immediately
                        after conversion.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Do I need to create an account?
                      </h3>
                      <p className="text-muted-foreground">
                        No registration required! Just visit our site, paste
                        your video URL, and start converting immediately.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Final CTA */}
                <section className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-primary-foreground">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Ready to Convert Your First Video?
                  </h2>
                  <p className="text-xl mb-8 opacity-90">
                    Join thousands of users who trust GetGoodTape for their
                    video conversion needs.
                  </p>
                  <MobileTouchFeedback className="inline-block">
                    <Link
                      href="/app"
                      className="mobile-link bg-white text-primary hover:bg-gray-100 px-8 py-4 rounded-xl text-xl font-semibold transition-colors shadow-lg"
                    >
                      Start Converting Free →
                    </Link>
                  </MobileTouchFeedback>
                  <p className="text-sm mt-4 opacity-75">
                    No registration • No payment • No limits
                  </p>
                </section>
              </div>
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </MobileKeyboardHandler>
      </MobilePerformanceOptimizer>
    </>
  );
}
