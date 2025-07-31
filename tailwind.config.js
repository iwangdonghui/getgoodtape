/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', 'class'], // 启用基于类的暗色模式
  theme: {
    extend: {
      colors: {
        'neutral-bg': '#F9F9F9',
        'neutral-panel': '#F0F0F0',
        'neutral-border': '#EAEAEA',
        'brand-primary': '#4F46E5',
        'brand-primary-hover': '#4338CA',
        'brand-primary-light': '#6366F1',
        'brand-primary-dark': '#3730A3',
        'neutral-text': '#1E1E1E',
        'neutral-text-light': '#4B5563',
        'neutral-text-muted': '#6B7280',
        'success-green': '#16A34A',
        'success-green-light': '#22C55E',
        'success-green-dark': '#15803D',
        'dark-bg': '#1E1E1E',
        'dark-panel': '#2D2D2D',
        'dark-panel-hover': '#3A3A3A',
        'dark-border': '#404040',
        'dark-text': '#F9F9F9',
        'dark-text-muted': '#B3B3B3',
        'dark-text-light': '#D1D5DB',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        brand: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
