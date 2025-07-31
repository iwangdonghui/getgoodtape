import React from 'react';
import Link from 'next/link';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  variant?: 'landing' | 'app';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'landing' }) => {
  if (variant === 'landing') {
    return (
      <header className="mobile-container py-4 sm:py-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <Logo size="lg" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              GetGoodTape
            </h1>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <ThemeToggle />
            <Link
              href="/app"
              className="mobile-link bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm sm:text-base whitespace-nowrap shadow-md"
            >
              Try Beta
            </Link>
          </div>
        </div>
        <div className="mt-2 text-center sm:hidden">
          <div className="text-xs text-muted-foreground bg-green-500/10 px-3 py-1 rounded-full inline-block">
            Coming Soon
          </div>
        </div>
      </header>
    );
  }

  // App variant
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
            <Logo size="md" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                GetGoodTape
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Video Converter
              </p>
            </div>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex"
            >
              ← Back
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors sm:hidden"
            >
              ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
