# URL Validation System - Quick Reference

## API Endpoints

### Workers API (`/validate`)

```bash
# Basic validation
curl -X POST https://your-workers-domain.com/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### video-processor API (`/extract-metadata`)

```bash
# Direct metadata extraction
curl -X POST https://getgoodtape-production.up.railway.app/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://twitter.com/user/status/123456789"}'
```

## Supported Platforms

| Platform  | Domain                | Example URL                                    | Video ID Format |
| --------- | --------------------- | ---------------------------------------------- | --------------- |
| YouTube   | youtube.com, youtu.be | `https://www.youtube.com/watch?v=dQw4w9WgXcQ`  | 11 characters   |
| Twitter/X | twitter.com, x.com    | `https://twitter.com/user/status/123456789`    | Numeric ID      |
| TikTok    | tiktok.com            | `https://www.tiktok.com/@user/video/123456789` | Numeric ID      |
| Instagram | instagram.com         | `https://www.instagram.com/p/ABC123/`          | Alphanumeric    |
| Facebook  | facebook.com          | `https://www.facebook.com/watch/?v=123456789`  | Numeric ID      |

## Response Formats

### Success Response

```json
{
  "isValid": true,
  "platform": {
    "name": "YouTube",
    "domain": "youtube.com",
    "supportedFormats": ["mp3", "mp4"],
    "maxDuration": 3600,
    "icon": "🎥"
  },
  "metadata": {
    "title": "Video Title",
    "duration": 213,
    "thumbnail": "https://...",
    "uploader": "Channel Name"
  },
  "videoId": "dQw4w9WgXcQ"
}
```

### Error Response

```json
{
  "isValid": false,
  "error": {
    "type": "INVALID_URL",
    "message": "Invalid URL format",
    "retryable": false
  }
}
```

## Error Types

| Error Type             | Description                 | Retryable | Action                 |
| ---------------------- | --------------------------- | --------- | ---------------------- |
| `INVALID_URL`          | Malformed URL               | No        | Fix URL format         |
| `UNSUPPORTED_PLATFORM` | Platform not supported      | No        | Use supported platform |
| `NETWORK_ERROR`        | Connection issues           | Yes       | Retry after delay      |
| `RATE_LIMITED`         | API quota exceeded          | Yes       | Wait and retry         |
| `PROXY_ERROR`          | Proxy authentication failed | No        | Automatic fallback     |
| `EXTRACTION_FAILED`    | Metadata extraction failed  | Maybe     | Try different video    |

## Platform-Specific Behavior

### YouTube

1. **Primary**: YouTube Data API (fast, reliable)
2. **Fallback**: yt-dlp with proxy rotation
3. **Final Fallback**: Direct connection without proxy

### Twitter/X

1. **Method**: yt-dlp with Twitter-specific headers
2. **Common Issues**: Rate limiting, login requirements
3. **Workaround**: Public tweets only

### TikTok

1. **Method**: yt-dlp with mobile app simulation
2. **Common Issues**: Anti-bot protection, frequent API changes
3. **Success Rate**: ~70% (varies by region)

### Instagram

1. **Method**: yt-dlp with standard configuration
2. **Limitations**: Public content only
3. **Common Issues**: Login walls for private content

### Facebook

1. **Method**: yt-dlp with standard configuration
2. **Limitations**: Public videos only
3. **Common Issues**: Privacy restrictions

## Performance Expectations

| Scenario              | Expected Time | Notes                    |
| --------------------- | ------------- | ------------------------ |
| Cache Hit             | 50-100ms      | Cloudflare Workers cache |
| YouTube API           | 300-800ms     | Direct API call          |
| yt-dlp Success        | 3-8 seconds   | Including proxy setup    |
| yt-dlp with Fallbacks | 10-20 seconds | Multiple retry attempts  |

## Common Integration Patterns

### Basic Validation

```javascript
async function validateUrl(url) {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return response.json();
}
```

### With Error Handling

```javascript
async function validateUrlSafely(url) {
  try {
    const result = await validateUrl(url);
    if (result.isValid) {
      return result;
    } else {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Validation failed:', error);
    return null;
  }
}
```

### With Retry Logic

```javascript
async function validateUrlWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await validateUrl(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Debugging Commands

### Health Checks

```bash
# Check video-processor health
curl https://getgoodtape-production.up.railway.app/health

# Check proxy status
curl https://getgoodtape-production.up.railway.app/test-all-proxies
```

### Test Specific URLs

```bash
# Test YouTube URL
curl -X POST https://getgoodtape-production.up.railway.app/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Test Twitter URL
curl -X POST https://getgoodtape-production.up.railway.app/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://twitter.com/user/status/123456789"}'
```

### Bypass Testing

```bash
# Test YouTube bypass methods
curl -X POST https://getgoodtape-production.up.railway.app/youtube-bypass \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Configuration

### Environment Variables (Workers)

```bash
ENVIRONMENT=production
PROCESSING_SERVICE_URL=https://getgoodtape-production.up.railway.app
YOUTUBE_API_KEY=your_youtube_api_key
```

### Environment Variables (video-processor)

```bash
YOUTUBE_API_KEY=your_youtube_api_key
RESIDENTIAL_PROXY_USER=your_proxy_username
RESIDENTIAL_PROXY_PASS=your_proxy_password
RESIDENTIAL_PROXY_ENDPOINT=gate.decodo.com:10001
```

## Monitoring

### Key Metrics to Track

- **Success Rate**: Percentage of successful validations
- **Response Time**: Average validation time per platform
- **Cache Hit Rate**: Percentage of requests served from cache
- **Proxy Success Rate**: Percentage of successful proxy connections
- **Error Distribution**: Breakdown of error types

### Log Patterns to Watch

```bash
# Proxy authentication failures
grep "407\|Proxy Authentication Required" logs

# Anti-bot protection triggers
grep "Sign in to confirm\|not a bot" logs

# Network timeouts
grep "timeout\|connection refused" logs

# Successful extractions
grep "Successfully extracted metadata" logs
```

## Best Practices

### For Frontend Integration

1. Always handle errors gracefully
2. Implement retry logic for retryable errors
3. Show user-friendly error messages
4. Cache successful validations client-side
5. Provide loading states for slow operations

### For Backend Integration

1. Use appropriate timeouts (30s for metadata extraction)
2. Implement circuit breakers for external services
3. Log detailed error information for debugging
4. Monitor proxy health and success rates
5. Keep yt-dlp updated for platform compatibility

### For Error Handling

1. Classify errors by type and retryability
2. Provide specific error messages for each scenario
3. Implement exponential backoff for retries
4. Fall back to alternative methods when possible
5. Log errors with sufficient context for debugging

## Troubleshooting Checklist

### When Validation Fails

1. ✅ Check URL format and platform support
2. ✅ Verify video-processor health endpoint
3. ✅ Test direct metadata extraction
4. ✅ Check proxy status and authentication
5. ✅ Review recent error logs
6. ✅ Test with known working URLs
7. ✅ Verify environment variables
8. ✅ Check API key validity (YouTube)

### When Performance is Slow

1. ✅ Check cache hit rates
2. ✅ Monitor proxy response times
3. ✅ Verify network connectivity
4. ✅ Review timeout configurations
5. ✅ Check for rate limiting
6. ✅ Monitor video-processor resource usage

This quick reference provides essential information for developers working with the URL validation system, including common commands, expected behaviors, and troubleshooting steps.
