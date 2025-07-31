import React, { useState, useEffect } from 'react';
import { apiClient, PlatformInfo } from '../lib/api-client';

const getPlatformIcon = (platformName: string): JSX.Element => {
  const iconMap: Record<string, JSX.Element> = {
    YouTube: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    'X (Twitter)': (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    Twitter: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#1DA1F2">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
    ),
    TikTok: (
      <svg className="w-10 h-10" viewBox="0 0 24 24">
        <defs>
          <linearGradient
            id="tiktok-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FF0050" />
            <stop offset="50%" stopColor="#FF0050" />
            <stop offset="100%" stopColor="#00F2EA" />
          </linearGradient>
        </defs>
        <path
          fill="url(#tiktok-gradient)"
          d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.43z"
        />
      </svg>
    ),
    Facebook: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    Instagram: (
      <svg className="w-10 h-10" viewBox="0 0 24 24">
        <defs>
          <linearGradient
            id="instagram-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#833AB4" />
            <stop offset="50%" stopColor="#FD1D1D" />
            <stop offset="100%" stopColor="#FCB045" />
          </linearGradient>
        </defs>
        <path
          fill="url(#instagram-gradient)"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        />
      </svg>
    ),
  };
  return iconMap[platformName] || iconMap.YouTube;
};

export const SupportedPlatforms: React.FC = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await apiClient.getPlatforms();
        if (data.success && data.platforms && Array.isArray(data.platforms)) {
          setPlatforms(data.platforms);
        } else {
          console.warn('Invalid platforms data received:', data);
          setPlatforms([]);
        }
      } catch (error) {
        console.error('Failed to fetch platforms:', error);
        setPlatforms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading platforms...</p>
      </div>
    );
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Supported Platforms
          </h2>
          <p className="text-muted-foreground">
            Convert videos from your favorite platforms
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 w-full max-w-7xl px-4">
            {Array.isArray(platforms) && platforms.length > 0 ? (
              platforms.map((platform, index) => (
                <div
                  key={platform.name}
                  className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-lg hover:border-primary/50 transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer group"
                >
                  <div className="mb-3 group-hover:scale-110 transition-transform duration-300 ease-in-out flex justify-center">
                    {getPlatformIcon(platform.name)}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-2">
                    {platform.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Array.isArray(platform.supportedFormats) &&
                      platform.supportedFormats.map(format => (
                        <span
                          key={format}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium"
                        >
                          {format.toUpperCase()}
                        </span>
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">
                  No platforms available at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportedPlatforms;
