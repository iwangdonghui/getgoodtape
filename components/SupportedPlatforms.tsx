import React, { useState, useEffect } from 'react';
import { apiClient, PlatformInfo } from '../lib/api-client';

const getPlatformIcon = (platformName: string): JSX.Element => {
  const iconMap: Record<string, JSX.Element> = {
    YouTube: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    'X (Twitter)': (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    Twitter: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md">
            {Array.isArray(platforms) && platforms.length > 0 ? (
              platforms.map((platform, index) => (
                <div
                  key={platform.name}
                  className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg hover:border-primary/50 transition-all duration-300 ease-in-out hover:-translate-y-2 cursor-pointer group"
                >
                  <div className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300 ease-in-out flex justify-center">
                    {getPlatformIcon(platform.name)}
                  </div>
                  <h3 className="font-semibold text-foreground text-base mb-2">
                    {platform.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Supported
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Array.isArray(platform.supportedFormats) &&
                      platform.supportedFormats.map(format => (
                        <span
                          key={format}
                          className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium"
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
