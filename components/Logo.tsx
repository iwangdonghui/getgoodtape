import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Tape machine body */}
        <rect
          x="4"
          y="16"
          width="56"
          height="32"
          rx="4"
          fill="#8B4513"
          stroke="#DAA520"
          strokeWidth="1"
        />
        
        {/* Left tape reel */}
        <circle
          cx="18"
          cy="28"
          r="8"
          fill="#DAA520"
          stroke="#8B4513"
          strokeWidth="1"
        />
        <circle
          cx="18"
          cy="28"
          r="3"
          fill="#8B4513"
        />
        
        {/* Right tape reel */}
        <circle
          cx="46"
          cy="28"
          r="8"
          fill="#DAA520"
          stroke="#8B4513"
          strokeWidth="1"
        />
        <circle
          cx="46"
          cy="28"
          r="3"
          fill="#8B4513"
        />
        
        {/* Tape connecting the reels */}
        <path
          d="M26 28 L38 28"
          stroke="#654321"
          strokeWidth="2"
        />
        <path
          d="M26 30 L38 30"
          stroke="#654321"
          strokeWidth="1"
        />
        
        {/* Play button overlay */}
        <circle
          cx="32"
          cy="32"
          r="12"
          fill="#98FB98"
          fillOpacity="0.9"
          stroke="#8B4513"
          strokeWidth="2"
        />
        
        {/* Play triangle */}
        <path
          d="M28 26 L28 38 L40 32 Z"
          fill="#8B4513"
        />
        
        {/* Tape machine details */}
        <rect
          x="8"
          y="40"
          width="48"
          height="4"
          rx="2"
          fill="#654321"
        />
        
        {/* Control buttons */}
        <circle cx="12" cy="42" r="1" fill="#DAA520" />
        <circle cx="16" cy="42" r="1" fill="#DAA520" />
        <circle cx="20" cy="42" r="1" fill="#DAA520" />
      </svg>
    </div>
  );
};

export default Logo;