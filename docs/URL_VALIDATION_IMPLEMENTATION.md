# URL Validation System - Implementation Guide

## Code Examples and Integration Patterns

### 1. Frontend Integration (Cloudflare Workers)

#### Basic URL Validation Request

```typescript
// Client-side validation request
async function validateUrl(url: string) {
  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const result = await response.json();

    if (result.isValid) {
      console.log('Platform:', result.platform.name);
      console.log('Metadata:', result.metadata);
      return result;
    } else {
      console.error('Validation failed:', result.error);
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}
```

#### Advanced Error Handling

```typescript
// Enhanced error handling with retry logic
async function validateUrlWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await validateUrl(url);
      return result;
    } catch (error) {
      if (error.retryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 2. Platform Detection Implementation

#### URL Pattern Matching

```typescript
// Platform detection patterns
const PLATFORM_PATTERNS = [
  {
    name: 'YouTube',
    domain: 'youtube.com',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ],
    extractVideoId: (url: string) => {
      const match = url.match(
        /(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      return match ? match[1] : null;
    },
  },
  {
    name: 'X (Twitter)',
    domain: 'twitter.com',
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    ],
    extractVideoId: (url: string) => {
      const match = url.match(/status\/(\d+)/);
      return match ? match[1] : null;
    },
  },
];
```

#### Platform-Specific Validation

```typescript
// Validate platform-specific requirements
function validatePlatformRequirements(platform: Platform, url: string) {
  switch (platform.name) {
    case 'YouTube':
      return validateYouTubeUrl(url);
    case 'TikTok':
      return validateTikTokUrl(url);
    case 'X (Twitter)':
      return validateTwitterUrl(url);
    default:
      return { isValid: true };
  }
}

function validateYouTubeUrl(url: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId || videoId.length !== 11) {
    return {
      isValid: false,
      error: 'Invalid YouTube video ID format',
    };
  }
  return { isValid: true, videoId };
}
```

### 3. Backend Integration (video-processor)

#### Metadata Extraction with Fallbacks

```python
async def extract_metadata_with_fallbacks(url: str):
    """Extract metadata with comprehensive fallback strategy"""

    # Step 1: Try primary extraction method
    try:
        metadata = await extract_video_metadata(url)
        if metadata:
            return process_metadata(metadata)
    except ProxyAuthenticationError as e:
        logger.warning(f"Proxy authentication failed: {e}")
        # Continue to fallback
    except AntiBot Protection as e:
        logger.warning(f"Anti-bot protection detected: {e}")
        # Continue to fallback

    # Step 2: Try YouTube API fallback (YouTube only)
    if is_youtube_url(url):
        try:
            api_metadata = await get_youtube_metadata_via_api(url)
            if api_metadata:
                return convert_api_to_standard_format(api_metadata)
        except Exception as e:
            logger.error(f"YouTube API fallback failed: {e}")

    # Step 3: Try alternative extraction methods
    for method in get_alternative_methods(url):
        try:
            metadata = await method(url)
            if metadata:
                return process_metadata(metadata)
        except Exception as e:
            logger.debug(f"Alternative method {method.__name__} failed: {e}")
            continue

    # All methods failed
    raise ExtractionFailedException("All extraction methods failed")
```

#### Proxy Management Implementation

```python
class ProxyManager:
    def __init__(self):
        self.proxies = self._load_proxy_list()
        self.success_rates = {}

    def get_best_proxy(self, platform: str = None):
        """Get the best performing proxy for a platform"""
        available_proxies = [p for p in self.proxies if self._is_proxy_healthy(p)]

        if platform == 'youtube':
            # Prioritize residential proxies for YouTube
            residential = [p for p in available_proxies if 'residential' in p]
            if residential:
                return max(residential, key=lambda p: self.success_rates.get(p, 0))

        return max(available_proxies, key=lambda p: self.success_rates.get(p, 0))

    def record_proxy_result(self, proxy: str, success: bool):
        """Record proxy performance for future selection"""
        if proxy not in self.success_rates:
            self.success_rates[proxy] = 0.5  # Start with neutral rating

        # Update success rate with exponential moving average
        current_rate = self.success_rates[proxy]
        new_rate = current_rate * 0.9 + (1.0 if success else 0.0) * 0.1
        self.success_rates[proxy] = new_rate
```

### 4. Error Handling Patterns

#### Comprehensive Error Classification

```python
class VideoProcessingError(Exception):
    """Base exception for video processing errors"""
    def __init__(self, message: str, error_type: str, retryable: bool = False):
        super().__init__(message)
        self.error_type = error_type
        self.retryable = retryable

class ProxyAuthenticationError(VideoProcessingError):
    def __init__(self, message: str):
        super().__init__(message, "PROXY_ERROR", retryable=True)

class AntiBotProtectionError(VideoProcessingError):
    def __init__(self, message: str):
        super().__init__(message, "ANTI_BOT", retryable=False)

class NetworkTimeoutError(VideoProcessingError):
    def __init__(self, message: str):
        super().__init__(message, "NETWORK_ERROR", retryable=True)
```

#### Error Detection and Classification

```python
def classify_yt_dlp_error(error_message: str) -> VideoProcessingError:
    """Classify yt-dlp errors into appropriate exception types"""
    error_lower = error_message.lower()

    # Proxy authentication errors
    if any(keyword in error_lower for keyword in [
        '407', 'proxy authentication required',
        'tunnel connection failed', 'proxyerror'
    ]):
        return ProxyAuthenticationError(error_message)

    # Anti-bot protection
    if any(keyword in error_lower for keyword in [
        'sign in to confirm', 'not a bot', 'captcha',
        'too many requests', 'rate limited'
    ]):
        return AntiBotProtectionError(error_message)

    # Network issues
    if any(keyword in error_lower for keyword in [
        'timeout', 'connection refused', 'network unreachable',
        'dns resolution failed'
    ]):
        return NetworkTimeoutError(error_message)

    # Generic extraction failure
    return VideoProcessingError(error_message, "EXTRACTION_FAILED")
```

### 5. Caching Implementation

#### Cache Management

```typescript
class CacheManager {
  constructor(private env: Env) {}

  async cacheUrlValidation(
    url: string,
    result: ValidationResult,
    ttl: number = 1800
  ): Promise<void> {
    const key = this.generateCacheKey(url);
    const data = {
      ...result,
      timestamp: Date.now(),
      version: '1.0',
    };

    await this.env.CACHE.put(key, JSON.stringify(data), {
      expirationTtl: ttl,
    });
  }

  async getUrlValidation(url: string): Promise<ValidationResult | null> {
    const key = this.generateCacheKey(url);
    const cached = await this.env.CACHE.get(key);

    if (!cached) return null;

    try {
      const data = JSON.parse(cached);

      // Check if cache is still valid
      const age = Date.now() - data.timestamp;
      if (age > 1800000) {
        // 30 minutes
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache parsing error:', error);
      return null;
    }
  }

  private generateCacheKey(url: string): string {
    // Normalize URL for consistent caching
    const normalized = new URL(url);
    normalized.search = ''; // Remove query parameters for YouTube
    return `url:${btoa(normalized.toString())}`;
  }
}
```

### 6. Response Format Standardization

#### Unified Metadata Format

```typescript
interface UnifiedMetadata {
  title: string;
  description?: string;
  duration: number; // seconds
  duration_text?: string; // "3:45"
  thumbnail?: string;
  uploader?: string;
  upload_date?: string; // ISO 8601
  view_count?: number;
  like_count?: number;
  id?: string;
  platform: string;
  source: 'youtube_api' | 'yt_dlp' | 'fallback';
}
```

#### Format Conversion Functions

```python
def convert_youtube_api_to_unified(api_data: dict) -> UnifiedMetadata:
    """Convert YouTube API response to unified format"""
    return {
        'title': api_data['title'],
        'description': api_data.get('description', ''),
        'duration': api_data['duration_seconds'],
        'duration_text': format_duration(api_data['duration_seconds']),
        'thumbnail': api_data['thumbnail_url'],
        'uploader': api_data['channel_title'],
        'upload_date': api_data['published_at'],
        'view_count': api_data['view_count'],
        'like_count': api_data.get('like_count'),
        'id': api_data['video_id'],
        'platform': 'YouTube',
        'source': 'youtube_api'
    }

def convert_yt_dlp_to_unified(yt_dlp_data: dict) -> UnifiedMetadata:
    """Convert yt-dlp response to unified format"""
    return {
        'title': yt_dlp_data.get('title', 'Unknown'),
        'description': yt_dlp_data.get('description', ''),
        'duration': yt_dlp_data.get('duration', 0),
        'duration_text': format_duration(yt_dlp_data.get('duration', 0)),
        'thumbnail': yt_dlp_data.get('thumbnail'),
        'uploader': yt_dlp_data.get('uploader'),
        'upload_date': yt_dlp_data.get('upload_date'),
        'view_count': yt_dlp_data.get('view_count'),
        'like_count': yt_dlp_data.get('like_count'),
        'id': yt_dlp_data.get('id'),
        'platform': detect_platform_from_url(yt_dlp_data.get('webpage_url', '')),
        'source': 'yt_dlp'
    }
```

### 7. Testing and Validation

#### Unit Test Examples

```typescript
// Test platform detection
describe('Platform Detection', () => {
  test('should detect YouTube URLs correctly', () => {
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ];

    urls.forEach(url => {
      const result = UrlValidator.validateUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform?.name).toBe('YouTube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  test('should reject invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      'https://unsupported-platform.com/video/123',
    ];

    invalidUrls.forEach(url => {
      const result = UrlValidator.validateUrl(url);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

#### Integration Test Examples

```python
# Test metadata extraction
async def test_metadata_extraction():
    """Test metadata extraction for various platforms"""
    test_urls = {
        'youtube': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'twitter': 'https://twitter.com/user/status/123456789',
        'tiktok': 'https://www.tiktok.com/@user/video/123456789'
    }

    for platform, url in test_urls.items():
        try:
            metadata = await extract_video_metadata(url)
            assert metadata is not None
            assert 'title' in metadata
            assert 'duration' in metadata
            print(f"✅ {platform}: {metadata['title']}")
        except Exception as e:
            print(f"❌ {platform}: {str(e)}")
```

This implementation guide provides practical code examples and patterns for integrating with the URL validation system. The examples demonstrate proper error handling, caching strategies, and response format standardization across all supported platforms.
