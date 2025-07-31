import React from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '🎵',
    title: 'High Quality',
    description:
      'Crystal clear audio and video output with multiple quality options',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Advanced processing technology for quick conversions',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description:
      'Your files are processed securely and deleted after conversion',
  },
];

export const BrandFeatures: React.FC = () => {
  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center group hover:scale-105 transition-transform duration-200"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandFeatures;
