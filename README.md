# GetGoodTape - Brand Visual System

## Brand Identity

**Tagline:** "From noisy video to pristine tape"

**Mission:** Transform videos from social media platforms into high-quality audio and video files with a nostalgic, warm aesthetic that evokes the golden age of analog recording.

## Color Palette

- **Cream White** (`#FDF6E3`) - Primary background, clean and warm
- **Warm Orange** (`#FF8C42`) - Primary brand color, energetic and inviting  
- **Deep Brown** (`#8B4513`) - Text and accents, sophisticated and grounded
- **Mint Green** (`#98FB98`) - Action color for buttons and highlights
- **Tape Gold** (`#DAA520`) - Accent color for premium elements

## Logo Design

The GetGoodTape logo combines:
- **Tape Machine**: Vintage cassette deck with two reels
- **Play Button**: Modern circular play button overlay
- **Color Integration**: Uses brand colors to bridge retro and modern aesthetics

## Typography

- **Primary Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Usage**: Clean, modern sans-serif that balances with the vintage aesthetic

## Visual Elements

### Landing Page Features
- Clean, minimalist design with warm color palette
- Prominent logo and tagline placement
- Email subscription form with gradient background
- Supported platforms showcase
- Feature preview cards with icons
- Responsive design for all devices

### Brand Voice
- Warm and approachable
- Nostalgic but modern
- Quality-focused
- User-friendly

## Features

### Email Subscription System
- Real email collection with validation
- Subscriber data stored in JSON format
- Admin dashboard to view and export subscribers
- CSV export functionality for email marketing

### Admin Access
- Visit `/admin/subscribers` to view subscriber list
- Default password: `getgoodtape2024` (change in production)
- Export subscriber data as CSV

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## API Endpoints

- `POST /api/subscribe` - Subscribe to email list
- `GET /api/subscribers` - Get all subscribers (admin)
- `GET /api/health` - Health check

## File Structure

```
/
├── app/
│   ├── globals.css      # Global styles and brand colors
│   ├── layout.tsx       # Root layout with metadata
│   └── page.tsx         # Main landing page
├── components/
│   └── Logo.tsx         # Brand logo component
├── tailwind.config.js   # Tailwind configuration with brand colors
└── package.json         # Dependencies and scripts
```