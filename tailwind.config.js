/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand color scheme
        cream: '#FDF6E3',
        'warm-orange': '#FF8C42',
        'deep-brown': '#8B4513',
        'mint-green': '#98FB98',
        'tape-gold': '#DAA520',
      },
      fontFamily: {
        brand: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
