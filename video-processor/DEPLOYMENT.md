# Video Processor Deployment Guide

## Railway Deployment (Recommended)

### Prerequisites

1. Railway account: [railway.app](https://railway.app)
2. GitHub repository with the video-processor code

### Quick Deploy

1. **Connect Repository**

   ```bash
   # Push video-processor to GitHub if not already done
   git add .
   git commit -m "Add video processor deployment config"
   git push
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Choose the `video-processor` directory as the root
   - Railway will automatically detect the Dockerfile

3. **Environment Variables**
   Set these in Railway dashboard:

   ```
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

4. **Custom Domain (Optional)**
   - In Railway dashboard, go to Settings → Domains
   - Add a custom domain or use the provided Railway domain

### Alternative: Render Deployment

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configuration**

   ```
   Name: getgoodtape-video-processor
   Environment: Docker
   Region: Choose closest to your users
   Branch: main
   Root Directory: video-processor
   ```

3. **Environment Variables**
   ```
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

### Alternative: Docker Deployment

1. **Build Image**

   ```bash
   cd video-processor
   docker build -t getgoodtape-video-processor .
   ```

2. **Run Container**

   ```bash
   docker run -p 8000:8000 \
     -e PORT=8000 \
     getgoodtape-video-processor
   ```

3. **Deploy to Cloud**
   - Push to Docker Hub or container registry
   - Deploy to your preferred cloud platform

## Post-Deployment

### 1. Test Health Check

```bash
curl https://your-deployment-url/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "video-processor",
  "version": "1.0.0",
  "dependencies": {
    "yt-dlp": true,
    "ffmpeg": true,
    "python": true
  }
}
```

### 2. Test Video Processing

```bash
curl -X POST https://your-deployment-url/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

### 3. Test Conversion

```bash
curl -X POST https://your-deployment-url/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "128"
  }'
```

## Configuration for Workers API

After deployment, update your Cloudflare Workers environment:

1. **Development (.dev.vars)**

   ```
   PROCESSING_SERVICE_URL=https://your-deployment-url
   ```

2. **Production (wrangler.toml)**
   ```toml
   [env.production.vars]
   PROCESSING_SERVICE_URL = "https://your-deployment-url"
   ```

## Monitoring and Logs

### Railway

- View logs in Railway dashboard
- Set up log drains for external monitoring

### Render

- View logs in Render dashboard
- Configure log retention settings

### Health Monitoring

Set up uptime monitoring for:

- `/health` endpoint
- Basic conversion test

## Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Ensure Dockerfile installs ffmpeg
   - Check container logs for installation errors

2. **yt-dlp extraction fails**
   - Update yt-dlp to latest version
   - Check YouTube rate limiting

3. **Memory issues**
   - Increase container memory allocation
   - Optimize video processing settings

4. **Timeout errors**
   - Increase request timeout settings
   - Implement async processing for large files

### Performance Optimization

1. **Resource Allocation**
   - CPU: 1-2 cores minimum
   - Memory: 1-2GB minimum
   - Storage: 10GB+ for temporary files

2. **Scaling**
   - Enable auto-scaling based on CPU/memory
   - Set up load balancing for multiple instances

3. **Caching**
   - Implement Redis for metadata caching
   - Use CDN for processed files
