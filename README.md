# GetGoodTape

A modern video conversion platform that transforms social media videos into high-quality MP3 and MP4 files.

## Features

- Convert videos from YouTube, TikTok, X (Twitter), Facebook, and Instagram
- High-quality MP3 and MP4 output formats
- Fast, reliable conversion powered by professional tools
- Clean, user-friendly interface
- Mobile-responsive design

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, Python FastAPI
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Processing**: yt-dlp, FFmpeg
- **Deployment**: Vercel (frontend), Cloudflare Workers (API), Railway (processing)

## Project Structure

```
├── app/                    # Next.js App Router pages and API routes
├── components/             # Reusable React components
├── workers/               # Cloudflare Workers API
│   ├── src/
│   │   ├── handlers/      # API route handlers
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Worker entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml      # Cloudflare Workers configuration
├── .kiro/specs/           # Feature specifications and design docs
├── docs/                  # Documentation
└── package.json           # Main project dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.11+ (for processing service)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd getgoodtape
```

2. Install dependencies:

```bash
npm install
```

3. Install workers dependencies:

```bash
cd workers
npm install
cd ..
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Workers Development

To develop the Cloudflare Workers API:

```bash
cd workers
npm run dev
```

This will start the workers development server on port 8787.

### Full Development Environment

To start both frontend and workers simultaneously:

```bash
npm run dev:all
```

This runs the development script that starts:

- Next.js frontend at http://localhost:3000
- Cloudflare Workers at http://localhost:8787

## Development Scripts

### Main Project

- `npm run dev` - Start Next.js development server
- `npm run dev:all` - Start both frontend and workers
- `npm run build` - Build both projects for production
- `npm run build:frontend` - Build Next.js only
- `npm run build:workers` - Build workers only
- `npm run start` - Start production server
- `npm run lint` - Run ESLint on both projects
- `npm run lint:frontend` - Run ESLint on frontend only
- `npm run lint:workers` - Run ESLint on workers only
- `npm run lint:fix` - Run ESLint with auto-fix on both projects
- `npm run format` - Format code with Prettier on both projects
- `npm run format:check` - Check code formatting on both projects
- `npm run type-check` - Run TypeScript type checking on both projects
- `npm run install:all` - Install dependencies for both projects

### Workers

- `npm run dev` - Start workers development server
- `npm run deploy` - Deploy workers to Cloudflare
- `npm run build` - Build workers for production
- `npm run lint` - Run ESLint on workers
- `npm run lint:fix` - Run ESLint with auto-fix on workers
- `npm run format` - Format workers code with Prettier
- `npm run type-check` - Run TypeScript type checking on workers

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for Git hooks
- **lint-staged** for pre-commit checks

Pre-commit hooks automatically run linting and formatting on staged files.

## Brand Identity

**Tagline:** "From noisy video to pristine tape"

### Color Palette

- **Cream White** (`#FDF6E3`) - Primary background
- **Warm Orange** (`#FF8C42`) - Primary brand color
- **Deep Brown** (`#8B4513`) - Text and accents
- **Mint Green** (`#98FB98`) - Action color
- **Tape Gold** (`#DAA520`) - Accent color

### Current Features

- Email subscription system with admin dashboard
- Brand visual system with custom logo
- Responsive landing page
- Admin access at `/admin/subscribers`

## License

This project is private and proprietary.
