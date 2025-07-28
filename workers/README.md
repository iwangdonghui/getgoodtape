# GetGoodTape API - Cloudflare Workers

This is the main API service for GetGoodTape, built on Cloudflare Workers with D1 database, R2 storage, and KV cache.

## Quick Start

### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **Authentication**: Run `wrangler login` to authenticate

### Setup Infrastructure

```bash
# Install dependencies
npm install

# Set up all Cloudflare resources (development)
npm run setup:all

# Or set up individually
npm run setup:db:dev    # D1 Database
npm run setup:r2:dev    # R2 Storage
npm run setup:kv:dev    # KV Namespace
```

### Development

```bash
# Start local development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Deployment

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

## Project Structure

```
workers/
├── src/
│   ├── handlers/          # API route handlers
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   │   ├── database.ts   # Database operations
│   │   ├── cache.ts      # KV cache operations
│   │   └── cors.ts       # CORS handling
│   └── index.ts          # Main entry point
├── migrations/           # Database migrations
├── scripts/             # Setup and utility scripts
├── schema.sql           # Complete database schema
├── wrangler.toml        # Cloudflare Workers configuration
└── package.json
```

## API Endpoints

### Core Conversion API

- `POST /convert` - Start video conversion
- `GET /status/{jobId}` - Get conversion status
- `GET /platforms` - List supported platforms
- `GET /download/{fileId}` - Download converted file

### Admin/Utility API

- `GET /health` - Health check
- `GET /stats` - System statistics
- `DELETE /cleanup` - Clean expired jobs

## Database Schema

### Tables

1. **conversion_jobs** - Video conversion job tracking
2. **platforms** - Supported video platform configurations
3. **usage_stats** - Analytics and usage statistics

### Supported Platforms

- YouTube (youtube.com)
- TikTok (tiktok.com)
- X/Twitter (x.com, twitter.com)
- Facebook (facebook.com)
- Instagram (instagram.com)

## Configuration

### Environment Variables

Create a `.dev.vars` file for local development:

```bash
ENVIRONMENT=development
PROCESSING_SERVICE_URL=http://localhost:8000
```

### wrangler.toml

Update the configuration file with your actual Cloudflare resource IDs:

```toml
name = "getgoodtape-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

[env.development]
vars = { ENVIRONMENT = "development" }

[[env.development.d1_databases]]
binding = "DB"
database_name = "getgoodtape-dev"
database_id = "your-actual-database-id"

[[env.development.r2_buckets]]
binding = "STORAGE"
bucket_name = "getgoodtape-files-dev"

[[env.development.kv_namespaces]]
binding = "CACHE"
id = "your-actual-kv-namespace-id"
```

## Usage Examples

### Convert a Video

```bash
curl -X POST https://api.getgoodtape.com/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "mp3",
    "quality": "192"
  }'
```

### Check Status

```bash
curl https://api.getgoodtape.com/status/job-id-here
```

### List Platforms

```bash
curl https://api.getgoodtape.com/platforms
```

## Development

### Database Operations

```typescript
import { DatabaseManager } from './utils/database';

const db = new DatabaseManager(env);

// Create a conversion job
const job = await db.createConversionJob({
  id: 'unique-job-id',
  url: 'https://youtube.com/watch?v=...',
  platform: 'youtube',
  format: 'mp3',
  quality: '192',
  status: 'queued',
  progress: 0,
});

// Update job status
await db.updateConversionJob('job-id', {
  status: 'processing',
  progress: 50,
});
```

### Cache Operations

```typescript
import { CacheManager } from './utils/cache';

const cache = new CacheManager(env);

// Cache video metadata
await cache.cacheVideoMetadata('video-id', {
  title: 'Video Title',
  duration: 180,
  thumbnail: 'https://...',
  uploader: 'Channel Name',
  uploadDate: '2024-01-01',
});

// Get cached metadata
const metadata = await cache.getVideoMetadata('video-id');
```

### Rate Limiting

```typescript
const rateLimit = await cache.checkRateLimit(clientIP, 10, 60);
if (!rateLimit.allowed) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

## Monitoring

### Health Check

```bash
curl https://api.getgoodtape.com/health
```

### System Stats

```bash
curl https://api.getgoodtape.com/stats
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check if D1 database exists: `wrangler d1 list`
   - Verify database ID in `wrangler.toml`
   - Run migrations: `npm run setup:db:dev`

2. **R2 Storage Access Denied**
   - Check if bucket exists: `wrangler r2 bucket list`
   - Verify bucket name in `wrangler.toml`
   - Check CORS configuration

3. **KV Cache Not Working**
   - Check if namespace exists: `wrangler kv:namespace list`
   - Verify namespace ID in `wrangler.toml`
   - Check binding name (should be "CACHE")

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
export DEBUG=true
wrangler dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
