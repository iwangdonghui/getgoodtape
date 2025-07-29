# GetGoodTape Production Deployment Guide

## 🎯 Overview

This guide walks you through deploying GetGoodTape to production with:

- **Frontend**: Already deployed ✅
- **Video Processor**: Railway/Render (FastAPI + yt-dlp + FFmpeg)
- **API**: Cloudflare Workers + D1 + R2 + KV

## 📋 Prerequisites

- [x] Frontend deployed to Vercel ✅
- [ ] Cloudflare account with Workers/D1/R2 access
- [ ] Railway account (recommended) or alternative cloud platform
- [ ] Domain configured (api.getgoodtape.com)

## 🚀 Step 1: Deploy Video Processor

### 📊 Platform Compatibility Guide

Based on our testing, different cloud platforms have varying levels of success with YouTube video extraction:

#### 🟢 Excellent YouTube Support (Recommended for Production)

- **Google Cloud Run**: Best IP reputation, reliable YouTube access, auto-scaling
- **AWS Lambda/App Runner**: Good IP reputation, works well with YouTube
- **Vercel**: Good for development, some limitations on execution time

#### 🟡 Partial YouTube Support (Good for Development)

- **Railway**: Generally works but some YouTube videos may be blocked
- **Heroku**: Mixed results, depends on dyno IP assignment
- **DigitalOcean**: Usually works but occasional blocks
- **Fly.io**: Good performance, occasional YouTube restrictions

#### 🔴 Limited YouTube Support (Not Recommended for YouTube)

- **Render**: Frequently blocked by YouTube's anti-bot measures ⚠️
- **Netlify Functions**: Limited execution time, IP restrictions

**Note**: All platforms work well with Twitter, TikTok, Instagram, and other video platforms. The restrictions mainly affect YouTube due to their aggressive anti-bot measures.

### Option A: Railway (Recommended for Development)

1. **Push to GitHub** (if not already done)

   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Choose `video-processor` as the root directory
   - Railway will auto-detect the Dockerfile

3. **Configure Environment Variables**

   ```
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

4. **Get Deployment URL**
   - Copy the Railway-provided URL (e.g., `https://your-app.railway.app`)
   - Test health: `curl https://your-app.railway.app/health`

### Option B: Render (⚠️ Limited YouTube Support)

> **Warning**: Render's IP addresses are frequently blocked by YouTube's anti-bot measures. While it works perfectly for Twitter, TikTok, Instagram, and other platforms, YouTube videos will often fail to extract. Consider using Google Cloud Run or Railway for better YouTube compatibility.

1. **Create Web Service**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect GitHub repository

2. **Configuration**

   ```
   Name: getgoodtape-video-processor
   Language: Docker
   Root Directory: video-processor
   Branch: main
   Build Command: (leave empty - Docker will handle)
   Start Command: (leave empty - Docker will handle)
   ```

3. **Environment Variables**
   ```
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

### Option C: Fly.io (Developer Friendly)

1. **Install Fly CLI**

   ```bash
   # macOS
   brew install flyctl

   # Or download from https://fly.io/docs/getting-started/installing-flyctl/
   ```

2. **Deploy**

   ```bash
   cd video-processor
   fly launch --no-deploy
   # Follow prompts to configure app
   fly deploy
   ```

3. **Configuration**
   - Fly will auto-detect the Dockerfile
   - Set environment variables in fly.toml or via CLI
   - Get URL: `https://your-app.fly.dev`

### Option D: Google Cloud Run (🟢 Recommended for Production)

> **Best Choice**: Excellent YouTube support, reliable IP reputation, auto-scaling, and cost-effective pricing.

1. **Setup**

   ```bash
   # Install gcloud CLI
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Deploy**

   ```bash
   cd video-processor
   gcloud run deploy getgoodtape-processor \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 900
   ```

3. **Environment Variables**
   ```
   PORT=8080
   GOOGLE_CLOUD=true
   ```

### Option E: AWS App Runner (AWS Ecosystem)

1. **Push to GitHub** (if not already done)
2. **Create App Runner Service**
   - Go to AWS Console → App Runner
   - Create service from source code
   - Connect GitHub repository
   - Choose `video-processor` directory
   - Configure auto-scaling and environment variables

### Option F: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean → Apps
   - Create app from GitHub
   - Select repository and `video-processor` directory

2. **Configuration**
   ```
   Name: getgoodtape-processor
   Type: Web Service
   Environment Variables:
     PORT=8000
     PYTHONUNBUFFERED=1
   ```

### Option G: Heroku (Classic Choice)

1. **Setup**

   ```bash
   # Install Heroku CLI
   heroku login
   cd video-processor
   heroku create getgoodtape-processor
   ```

2. **Deploy**
   ```bash
   # Heroku will auto-detect Dockerfile
   git push heroku main
   heroku config:set PORT=8000
   ```

## 🔧 Step 2: Setup Cloudflare Resources

### Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Create Resources

```bash
cd workers

# Create D1 database
wrangler d1 create getgoodtape-prod

# Create R2 bucket
wrangler r2 bucket create getgoodtape-files

# Create KV namespace
wrangler kv:namespace create getgoodtape-cache
```

### Update wrangler.toml

Replace the placeholder IDs with actual ones from the commands above:

```toml
[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "getgoodtape-prod"
database_id = "your-actual-database-id"

[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "getgoodtape-files"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-actual-kv-namespace-id"
```

### Initialize Database Schema

```bash
# Apply database schema
wrangler d1 execute getgoodtape-prod --file=schema.sql
```

## 🌐 Step 3: Deploy Workers API

### Configure Production Variables

```bash
cd workers

# Create production environment file
cat > .prod.vars << EOF
ENVIRONMENT=production
PROCESSING_SERVICE_URL=https://your-railway-app.railway.app
EOF
```

### Deploy to Cloudflare

```bash
# Deploy to production
wrangler deploy --env production

# Verify deployment
curl https://api.getgoodtape.com/health
```

### Configure Custom Domain

1. In Cloudflare dashboard, go to Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add custom domain: `api.getgoodtape.com`

## 🧪 Step 4: Test Complete Flow

### 1. Test API Health

```bash
curl https://api.getgoodtape.com/health
```

### 2. Test Platforms

```bash
curl https://api.getgoodtape.com/api/platforms
```

### 3. Test URL Validation

```bash
curl -X POST https://api.getgoodtape.com/api/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

### 4. Test Conversion

```bash
curl -X POST https://api.getgoodtape.com/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "128"
  }'
```

### 5. Test Frontend

- Visit https://getgoodtape.com
- Try converting a video
- Check all features work end-to-end

## 📊 Step 5: Monitoring & Optimization

### Cloudflare Analytics

- Monitor Workers requests and errors
- Check D1 database performance
- Monitor R2 storage usage

### Railway/Render Monitoring

- Check video processor logs
- Monitor CPU and memory usage
- Set up alerts for downtime

### Performance Optimization

1. **Caching Strategy**
   - Platform data: 10 minutes
   - Metadata: 5 minutes
   - Conversion status: Real-time

2. **Error Handling**
   - Retry failed conversions
   - Graceful degradation
   - User-friendly error messages

3. **Rate Limiting**
   - Implement per-IP limits
   - Queue management
   - Fair usage policies

## 🔒 Security Considerations

### API Security

- CORS configuration for production domains
- Input validation and sanitization
- Rate limiting and DDoS protection

### Video Processing

- File size limits
- Processing timeouts
- Secure temporary file handling

### Data Privacy

- Automatic file cleanup
- No persistent user data storage
- GDPR compliance

## 🚨 Troubleshooting

### Common Issues

1. **Video Processor Timeout**
   - Increase Railway/Render timeout settings
   - Optimize FFmpeg parameters
   - Implement async processing

2. **Database Connection Errors**
   - Check D1 database configuration
   - Verify wrangler.toml settings
   - Test database connectivity

3. **CORS Errors**
   - Update allowed origins in Workers
   - Check frontend API configuration
   - Verify domain settings

4. **File Storage Issues**
   - Check R2 bucket permissions
   - Verify file upload/download
   - Monitor storage quotas

### Debug Commands

```bash
# Check Workers logs
wrangler tail --env production

# Check D1 database
wrangler d1 execute getgoodtape-prod --command "SELECT * FROM platforms LIMIT 5"

# Test video processor directly
curl https://your-app.railway.app/health
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Multiple video processor instances
- Load balancing
- Geographic distribution

### Performance Optimization

- CDN for static assets
- Database query optimization
- Caching strategies

### Cost Optimization

- Monitor usage patterns
- Optimize resource allocation
- Implement usage analytics

## ✅ Deployment Checklist

- [ ] Video processor deployed and healthy
- [ ] Cloudflare resources created
- [ ] Database schema applied
- [ ] Workers API deployed
- [ ] Custom domain configured
- [ ] End-to-end testing completed
- [ ] Monitoring set up
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Security measures implemented

## 🎉 Success!

Your GetGoodTape application is now fully deployed and ready for production use!

**Live URLs:**

- Frontend: https://getgoodtape.com
- API: https://api.getgoodtape.com
- Video Processor: https://your-app.railway.app

**Next Steps:**

1. Monitor initial usage and performance
2. Gather user feedback
3. Implement additional features
4. Scale based on demand
