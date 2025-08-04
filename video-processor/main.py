"""
GetGoodTape Video Processing Service
FastAPI application for handling video conversion tasks
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import logging
import asyncio
import subprocess
import json
from datetime import datetime

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import YouTube API integration
try:
    from youtube_api import youtube_api, get_youtube_metadata_via_api
    YOUTUBE_API_AVAILABLE = True
    logger.info("YouTube API integration loaded successfully")
except ImportError as e:
    YOUTUBE_API_AVAILABLE = False
    logger.warning(f"YouTube API integration not available: {e}")

    # Fallback functions
    async def get_youtube_metadata_via_api(url: str):
        return None

# Import proxy monitoring
try:
    from proxy_monitor import record_proxy_usage, proxy_monitor
    PROXY_MONITORING_AVAILABLE = True
    logger.info("Proxy monitoring loaded successfully")
except ImportError as e:
    PROXY_MONITORING_AVAILABLE = False
    logger.warning(f"Proxy monitoring not available: {e}")

    # Fallback function
    def record_proxy_usage(*args, **kwargs):
        pass

app = FastAPI(
    title="GetGoodTape Video Processor",
    description="Video processing service for converting videos to MP3/MP4",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    dependencies: dict

class VideoMetadataRequest(BaseModel):
    url: str
    platform: Optional[str] = None

class VideoMetadata(BaseModel):
    title: str
    duration: float  # in seconds (allow float for precise duration)
    thumbnail: str
    uploader: str
    upload_date: str
    view_count: Optional[int] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    formats: Optional[List[Dict[str, Any]]] = None
    webpage_url: str
    id: str

class MetadataResponse(BaseModel):
    success: bool
    metadata: Optional[VideoMetadata] = None
    error: Optional[str] = None
    warning: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None

class ConvertRequest(BaseModel):
    url: str
    format: str = Field(..., description="Output format: mp3 or mp4")
    quality: str = Field(..., description="Quality setting")
    platform: Optional[str] = None
    useBypass: Optional[bool] = Field(False, description="Use YouTube bypass methods if available")
    noProxy: Optional[bool] = Field(False, description="Disable proxy usage for direct connection")

class ConversionProgress(BaseModel):
    percentage: float
    speed: Optional[str] = None
    eta: Optional[str] = None
    file_size: Optional[str] = None

class ConversionResult(BaseModel):
    success: bool
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    duration: Optional[float] = None
    format: Optional[str] = None
    quality: Optional[str] = None
    download_url: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None

class ConvertResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    result: Optional[ConversionResult] = None
    progress: Optional[ConversionProgress] = None
    error: Optional[str] = None

@app.get("/server-ip")
async def get_server_ip():
    """
    Get the server's public IP address for proxy whitelist configuration
    """
    try:
        import requests
        # Get public IP from multiple sources for reliability
        ip_services = [
            "https://api.ipify.org",
            "https://ipinfo.io/ip",
            "https://icanhazip.com"
        ]

        for service in ip_services:
            try:
                response = requests.get(service, timeout=10)
                if response.status_code == 200:
                    ip = response.text.strip()
                    return {
                        "public_ip": ip,
                        "service_used": service,
                        "railway_internal_ip": "198.18.0.23"
                    }
            except Exception as e:
                continue

        return {"error": "Could not determine public IP", "railway_internal_ip": "198.18.0.23"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify service status and dependencies
    """
    try:
        # Check if required dependencies are available
        ytdlp_info = check_ytdlp()
        ffmpeg_info = check_ffmpeg()
        youtube_api_info = check_youtube_api()
        dependencies = {
            "yt-dlp": ytdlp_info["available"],
            "yt-dlp-version": ytdlp_info["version"],
            "ffmpeg": ffmpeg_info["available"],
            "ffmpeg-version": ffmpeg_info["version"],
            "youtube-api": youtube_api_info["available"],
            "youtube-api-status": youtube_api_info["status"],
            "python": True
        }
        
        # Determine overall status
        all_healthy = dependencies["yt-dlp"] and dependencies["ffmpeg"] and dependencies["python"]
        status = "healthy" if all_healthy else "degraded"
        
        return HealthResponse(
            status=status,
            service="video-processor",
            version="1.0.1",  # Bump version to force deployment
            dependencies=dependencies
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.post("/test-subprocess")
async def test_subprocess_endpoint(request: VideoMetadataRequest):
    """Test subprocess yt-dlp method"""
    try:
        logger.info(f"Testing subprocess method for URL: {request.url}")
        result = extract_metadata_with_subprocess(request.url, use_proxy=True)
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Subprocess test failed: {e}")
        return {"success": False, "error": str(e)}

def check_ytdlp() -> dict:
    """Check if yt-dlp is available and get version"""
    try:
        import yt_dlp
        version = yt_dlp.version.__version__
        return {"available": True, "version": version}
    except ImportError:
        return {"available": False, "version": "Not installed"}

def extract_metadata_with_subprocess(url: str, use_proxy: bool = True) -> dict:
    """
    Extract video metadata using command-line yt-dlp via subprocess
    This method works around Python library proxy issues
    """
    try:
        # Build yt-dlp command
        cmd = ['yt-dlp', '--dump-json', '--no-download']

        # Add proxy configuration if needed
        if use_proxy:
            user = os.getenv('RESIDENTIAL_PROXY_USER')
            password = os.getenv('RESIDENTIAL_PROXY_PASS')
            endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

            if user and password and endpoint:
                proxy_url = f"http://{user}:{password}@{endpoint}"
                cmd.extend(['--proxy', proxy_url])
                logger.info(f"🔄 Using subprocess with Decodo proxy: {endpoint}")
            else:
                logger.warning("⚠️ Proxy credentials not found, using direct connection")

        # Add URL
        cmd.append(url)

        # Execute command
        logger.info(f"🚀 Executing: yt-dlp --dump-json --no-download {url}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
            check=False
        )

        if result.returncode == 0:
            # Parse JSON output
            metadata = json.loads(result.stdout)
            logger.info(f"✅ Subprocess metadata extraction successful: {metadata.get('title', 'Unknown')}")
            return {
                'success': True,
                'metadata': {
                    'title': metadata.get('title'),
                    'duration': metadata.get('duration'),
                    'thumbnail': metadata.get('thumbnail'),
                    'uploader': metadata.get('uploader'),
                    'upload_date': metadata.get('upload_date', ''),
                    'view_count': metadata.get('view_count'),
                    'description': metadata.get('description'),
                    'tags': metadata.get('tags'),
                    'formats': metadata.get('formats', []),
                    'webpage_url': metadata.get('webpage_url'),
                    'id': metadata.get('id')
                }
            }
        else:
            logger.error(f"❌ Subprocess yt-dlp failed: {result.stderr}")
            return {'success': False, 'error': result.stderr}

    except subprocess.TimeoutExpired:
        logger.error("⏰ Subprocess yt-dlp timed out")
        return {'success': False, 'error': 'Subprocess timed out'}
    except Exception as e:
        logger.error(f"💥 Subprocess yt-dlp error: {e}")
        return {'success': False, 'error': str(e)}

def download_video_with_subprocess(url: str, output_path: str, format_selector: str = "best", use_proxy: bool = True) -> dict:
    """
    Download video using command-line yt-dlp via subprocess
    This method works around Python library proxy issues
    """
    try:
        # Build yt-dlp command
        cmd = ['yt-dlp', '-f', format_selector, '-o', output_path]

        # Add proxy configuration if needed
        if use_proxy:
            user = os.getenv('RESIDENTIAL_PROXY_USER')
            password = os.getenv('RESIDENTIAL_PROXY_PASS')
            endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

            if user and password and endpoint:
                proxy_url = f"http://{user}:{password}@{endpoint}"
                cmd.extend(['--proxy', proxy_url])
                logger.info(f"🔄 Using subprocess download with Decodo proxy: {endpoint}")
            else:
                logger.warning("⚠️ Proxy credentials not found, using direct connection")

        # Add URL
        cmd.append(url)

        # Execute command
        logger.info(f"🚀 Executing: yt-dlp -f {format_selector} -o {output_path} {url}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout for download
            check=False
        )

        if result.returncode == 0:
            logger.info(f"✅ Subprocess download successful")
            return {'success': True, 'output': result.stdout}
        else:
            logger.error(f"❌ Subprocess download failed: {result.stderr}")
            return {'success': False, 'error': result.stderr}

    except subprocess.TimeoutExpired:
        logger.error("⏰ Subprocess download timed out")
        return {'success': False, 'error': 'Download timed out'}
    except Exception as e:
        logger.error(f"💥 Subprocess download error: {e}")
        return {'success': False, 'error': str(e)}

def check_ffmpeg() -> dict:
    """Check if FFmpeg is available and get version"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Extract version from first line
            version_line = result.stdout.split('\n')[0] if result.stdout else "Unknown"
            version = version_line.split(' ')[2] if len(version_line.split(' ')) > 2 else "Unknown"
            return {"available": True, "version": version}
        else:
            return {"available": False, "version": "Not available"}
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        return {"available": False, "version": "Not available"}

def check_youtube_api() -> dict:
    """Check if YouTube API is available and configured"""
    if not YOUTUBE_API_AVAILABLE:
        return {"available": False, "status": "Module not imported"}

    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        return {"available": False, "status": "API key not configured"}

    if api_key == 'your_youtube_api_key_here':
        return {"available": False, "status": "Default placeholder API key"}

    return {"available": True, "status": "Configured and ready"}

async def extract_video_metadata(url: str) -> Dict[str, Any]:
    """
    Extract video metadata using yt-dlp (subprocess first, then Python library)
    """
    try:
        # Method 1: Try subprocess yt-dlp first (works with proxy)
        logger.info("🚀 Trying subprocess yt-dlp method...")
        subprocess_result = extract_metadata_with_subprocess(url, use_proxy=True)

        if subprocess_result.get('success'):
            logger.info("✅ Subprocess method successful!")
            return subprocess_result['metadata']
        else:
            logger.warning(f"⚠️ Subprocess method failed: {subprocess_result.get('error')}")

        # Method 2: Fallback to Python library yt-dlp
        logger.info("🔄 Falling back to Python library yt-dlp...")
        # Import yt-dlp
        import yt_dlp

        # Configure yt-dlp options with latest 2025 best practices
        ydl_opts = {
            'quiet': False,  # Enable output for debugging
            'no_warnings': False,
            'extract_flat': False,
            'writeinfojson': False,
            'writethumbnail': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
            # Latest 2025 anti-detection measures
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Cache-Control': 'max-age=0',
            },
            'extractor_args': {
                'youtube': {
                    # Latest 2025 YouTube bypass techniques
                    'player_client': ['ios', 'android', 'web', 'tv_embedded'],
                    'player_skip': ['configs'],
                    'skip': [],  # Don't skip anything, let yt-dlp decide
                    'innertube_host': ['youtubei.googleapis.com'],
                    # Note: Using public YouTube API key for yt-dlp compatibility
                    # This is a public key used by yt-dlp and is safe to use
                },
                'twitter': {
                    # Twitter/X specific settings
                    'api': ['syndication', 'legacy'],
                },
                'tiktok': {
                    # TikTok specific settings for 2025
                    'api_hostname': 'api16-normal-c-useast1a.tiktokv.com',
                    'app_version': '34.1.2',
                    'manifest_app_version': '2023405020',
                    'aid': '1988',
                    'app_name': 'musical_ly',
                    'app_id': '1233',
                    'carrier_region': 'US',
                    'region': 'US',
                    'device_id': '7318518857994389254',
                    'iid': '7318518857994389254',
                    'device_type': 'SM-G973F',
                    'device_brand': 'samsung',
                    'language': 'en',
                    'os_api': '25',
                    'os_version': '7.1.2',
                    'openudid': 'b4e4fae5d8e1b4e4',
                }
            },
            # Additional bypass options
            'geo_bypass': True,
            'age_limit': 99,
            'sleep_interval': 0,
            'max_sleep_interval': 0,
            'ignoreerrors': False,
            'no_color': True,
            'prefer_insecure': False,
        }

        # Extract metadata with fallback methods
        info = None
        last_error = None

        # Try multiple extraction methods with environment-specific optimizations
        import os
        is_cloud_env = bool(os.getenv('RENDER') or os.getenv('RAILWAY') or os.getenv('HEROKU'))

        extraction_methods = [
            # Method 1: Standard extraction
            ydl_opts,
            # Method 2: Android client only (works better in cloud environments)
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['android']}}},
            # Method 3: iOS client (often bypasses restrictions)
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['ios']}}},
            # Method 4: Web client with mobile user agent
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['web']}},
             'http_headers': {**ydl_opts['http_headers'], 'User-Agent': 'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'}},
            # Method 5: TV embedded client (for cloud environments)
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['tv_embedded']}}},
        ]

        # For cloud environments, try more aggressive methods first
        if is_cloud_env:
            extraction_methods = [
                # Start with iOS client for cloud environments
                {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['ios']}}},
                # Then Android
                {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['android']}}},
                # TV embedded
                {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['tv_embedded']}}},
                # Standard as fallback
                ydl_opts,
            ]

        for i, opts in enumerate(extraction_methods):
            try:
                print(f"🔄 Trying extraction method {i+1}/{len(extraction_methods)}")

                # Try to add proxy configuration for YouTube URLs with better error handling
                if 'youtube.com' in url or 'youtu.be' in url:
                    proxy_configured = False
                    try:
                        # First try: Use proxy manager with multiple fallbacks
                        from proxy_config import proxy_manager, get_yt_dlp_proxy_options
                        import random

                        # Get YouTube-optimized proxy list
                        proxies = proxy_manager.get_proxy_list(include_no_proxy=False, prioritize_youtube=True)

                        # Try multiple proxies in case of 407 errors
                        for i, proxy in enumerate(proxies[:3]):  # Try top 3 proxies
                            if proxy:
                                try:
                                    # Add session rotation (except for Decodo)
                                    if any(x in proxy for x in ['smartproxy', 'brightdata', 'oxylabs', 'lum-superproxy']) and 'decodo' not in proxy:
                                        proxy = proxy_manager.get_proxy_with_session(proxy)

                                    proxy_opts = get_yt_dlp_proxy_options(proxy)
                                    opts.update(proxy_opts)

                                    # Identify proxy type
                                    proxy_type = "Unknown"
                                    if 'lum-superproxy.io' in proxy:
                                        proxy_type = "Bright Data"
                                    elif 'decodo.com' in proxy:
                                        proxy_type = "Decodo"
                                    elif 'smartproxy.com' in proxy:
                                        proxy_type = "Smartproxy"

                                    print(f"🔄 Using {proxy_type} proxy #{i+1} for YouTube metadata")
                                    proxy_configured = True
                                    break
                                except Exception as proxy_error:
                                    print(f"⚠️ Proxy #{i+1} failed: {proxy_error}")
                                    continue

                        # Fallback: Try environment variables with validation
                        if not proxy_configured:
                            import os
                            user = os.getenv('RESIDENTIAL_PROXY_USER')
                            password = os.getenv('RESIDENTIAL_PROXY_PASS')
                            endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

                            if user and password and endpoint:
                                # Validate credentials format
                                if len(user) > 5 and len(password) > 5:
                                    opts['proxy'] = f"http://{user}:{password}@{endpoint}"
                                    opts['socket_timeout'] = 30
                                    opts['retries'] = 3
                                    print(f"🔄 Using fallback proxy: {endpoint}")
                                    proxy_configured = True
                                else:
                                    print("⚠️ Invalid proxy credentials format")

                        if not proxy_configured:
                            print("⚠️ No working proxy available - trying direct connection")
                            # For YouTube, try direct connection without proxy as fallback
                            opts.update({
                                'proxy': None,  # Explicitly disable proxy
                                'socket_timeout': 30,
                                'retries': 5,
                                'http_headers': {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.5',
                                    'Accept-Encoding': 'gzip, deflate',
                                    'Connection': 'keep-alive',
                                },
                            })
                            print("🔄 Using direct connection (no proxy) for YouTube metadata")

                    except Exception as e:
                        print(f"⚠️ Proxy configuration failed: {e}")
                        print("⚠️ Proceeding without proxy")

                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    if info:
                        print(f"✓ Extraction successful with method {i+1}")
                        break
            except Exception as e:
                last_error = e
                error_msg = str(e)
                print(f"✗ Method {i+1} failed: {error_msg}")

                # Check for specific YouTube errors that indicate IP blocking
                if 'Sign in to confirm' in error_msg or 'This video is not available' in error_msg:
                    print(f"⚠️ Detected YouTube access restriction, trying next method...")
                continue

        if not info:
            # Try YouTube API as fallback for YouTube videos
            if ('youtube.com' in url or 'youtu.be' in url) and YOUTUBE_API_AVAILABLE:
                print("🔄 Trying YouTube Data API as fallback...")
                try:
                    api_metadata = await get_youtube_metadata_via_api(url)
                    if api_metadata:
                        print("✓ YouTube API fallback successful")
                        # Convert API metadata to yt-dlp format
                        info = {
                            'title': api_metadata['title'],
                            'duration': api_metadata['duration'],
                            'uploader': api_metadata['uploader'],
                            'view_count': api_metadata.get('view_count', 0),
                            'thumbnail': api_metadata.get('thumbnail', ''),
                            'webpage_url': url,
                            'id': youtube_api.extract_video_id(url),
                            'extractor': 'youtube_api_fallback'
                        }
                        return info
                except Exception as e:
                    print(f"✗ YouTube API fallback failed: {e}")

            # Provide helpful error message based on the platform
            if 'youtube.com' in url or 'youtu.be' in url:
                if is_cloud_env:
                    if YOUTUBE_API_AVAILABLE:
                        error_msg = (
                            "YouTube access is currently restricted from this server location and API fallback failed. "
                            "This is a temporary limitation. Please try:\n"
                            "• A different YouTube video\n"
                            "• Videos from other platforms (Twitter, TikTok, etc.)\n"
                            "• Trying again in a few minutes"
                        )
                    else:
                        error_msg = (
                            "YouTube access is currently restricted from this server location. "
                            "YouTube API is not configured for fallback. Please try:\n"
                            "• A different YouTube video\n"
                            "• Videos from other platforms (Twitter, TikTok, etc.)\n"
                            "• Trying again in a few minutes"
                        )
                else:
                    error_msg = f"Could not extract YouTube video information. Last error: {last_error}"
            else:
                error_msg = f"Could not extract video information after trying all methods. Last error: {last_error}"

            raise ValueError(error_msg)

        return info

    except Exception as e:
        logger.error(f"Failed to extract metadata for {url}: {str(e)}")
        raise

def format_duration(seconds: float) -> str:
    """Format duration in seconds to human readable format"""
    seconds = int(seconds)  # Convert to int for formatting
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds}s"
    else:
        hours = seconds // 3600
        remaining_minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        return f"{hours}h {remaining_minutes}m {remaining_seconds}s"

def validate_video_duration(duration: float, max_duration: int = 7200) -> Optional[str]:
    """
    Validate video duration and return warning if too long
    max_duration: maximum allowed duration in seconds (default: 2 hours)
    """
    if duration > max_duration:
        formatted_duration = format_duration(duration)
        formatted_max = format_duration(max_duration)
        return f"Video duration ({formatted_duration}) exceeds maximum allowed duration ({formatted_max})"
    return None

def process_metadata(raw_info: Dict[str, Any]) -> VideoMetadata:
    """Process raw yt-dlp info into our VideoMetadata format"""

    # Extract basic information
    title = raw_info.get('title', 'Unknown Title')
    duration = raw_info.get('duration', 0) or 0
    thumbnail = raw_info.get('thumbnail', '')
    uploader = raw_info.get('uploader', raw_info.get('channel', 'Unknown'))
    upload_date = raw_info.get('upload_date', '')
    view_count = raw_info.get('view_count')
    description = raw_info.get('description', '')
    tags = raw_info.get('tags', [])
    webpage_url = raw_info.get('webpage_url', '')
    video_id = raw_info.get('id', '')

    # Format upload date
    if upload_date and len(upload_date) == 8:  # YYYYMMDD format
        try:
            date_obj = datetime.strptime(upload_date, '%Y%m%d')
            upload_date = date_obj.strftime('%Y-%m-%d')
        except ValueError:
            pass

    # Extract available formats information
    formats = []
    if 'formats' in raw_info:
        for fmt in raw_info['formats']:
            format_info = {
                'format_id': fmt.get('format_id', ''),
                'ext': fmt.get('ext', ''),
                'quality': fmt.get('quality', ''),
                'filesize': fmt.get('filesize'),
                'width': fmt.get('width'),
                'height': fmt.get('height'),
                'fps': fmt.get('fps'),
                'vcodec': fmt.get('vcodec', ''),
                'acodec': fmt.get('acodec', ''),
                'abr': fmt.get('abr'),  # audio bitrate
                'vbr': fmt.get('vbr'),  # video bitrate
            }
            formats.append(format_info)

    return VideoMetadata(
        title=title,
        duration=duration,
        thumbnail=thumbnail,
        uploader=uploader,
        upload_date=upload_date,
        view_count=view_count,
        description=description[:500] if description else None,  # Limit description length
        tags=tags[:10] if tags else None,  # Limit number of tags
        formats=formats,
        webpage_url=webpage_url,
        id=video_id
    )

def get_quality_settings(format_type: str, quality: str) -> Dict[str, Any]:
    """Get FFmpeg quality settings for different formats and qualities"""

    if format_type.lower() == 'mp3':
        quality_map = {
            '96': {'bitrate': '96k', 'codec': 'libmp3lame'},
            '128': {'bitrate': '128k', 'codec': 'libmp3lame'},
            '320': {'bitrate': '320k', 'codec': 'libmp3lame'},
        }
        return quality_map.get(quality, quality_map['128'])  # 默认使用128k

    elif format_type.lower() == 'mp4':
        quality_map = {
            '360': {'height': 360, 'codec': 'libx264', 'preset': 'fast'},
            '720': {'height': 720, 'codec': 'libx264', 'preset': 'fast'},
            '1080': {'height': 1080, 'codec': 'libx264', 'preset': 'fast'},
        }
        return quality_map.get(quality, quality_map['720'])

    return {}

async def convert_to_mp3(url: str, quality: str, output_path: str, use_bypass: bool = False, no_proxy: bool = False) -> ConversionResult:
    """
    Convert video to MP3 using yt-dlp and FFmpeg with speed optimizations (subprocess first, then Python library)
    """
    try:
        import tempfile
        import os
        import asyncio
        import subprocess

        # Get quality settings
        quality_settings = get_quality_settings('mp3', quality)
        bitrate = quality_settings.get('bitrate', '192k')

        # Method 1: Try subprocess yt-dlp first (works with proxy)
        if not no_proxy:
            logger.info("🚀 Trying subprocess yt-dlp for MP3 conversion...")

            with tempfile.TemporaryDirectory() as temp_dir:
                temp_audio_path = os.path.join(temp_dir, 'audio.%(ext)s')

                # Use subprocess to download audio
                format_selector = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[height<=480]'
                subprocess_result = download_video_with_subprocess(url, temp_audio_path, format_selector, use_proxy=True)

                if subprocess_result.get('success'):
                    # Find the downloaded file
                    downloaded_files = [f for f in os.listdir(temp_dir) if f.startswith('audio.')]
                    if downloaded_files:
                        downloaded_file = os.path.join(temp_dir, downloaded_files[0])

                        # Convert to MP3 using FFmpeg
                        logger.info(f"🎵 Converting to MP3 with bitrate {bitrate}...")
                        ffmpeg_cmd = [
                            'ffmpeg', '-i', downloaded_file,
                            '-vn', '-acodec', 'libmp3lame',
                            '-ab', bitrate, '-ar', '44100',
                            '-y', output_path
                        ]

                        ffmpeg_result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=300)

                        if ffmpeg_result.returncode == 0:
                            file_size = os.path.getsize(output_path)
                            logger.info(f"✅ Subprocess MP3 conversion successful! File size: {file_size} bytes")
                            return ConversionResult(
                                success=True,
                                output_path=output_path,
                                file_size=file_size,
                                format='mp3',
                                quality=quality
                            )
                        else:
                            logger.error(f"❌ FFmpeg conversion failed: {ffmpeg_result.stderr}")
                    else:
                        logger.error("❌ No audio file found after subprocess download")
                else:
                    logger.warning(f"⚠️ Subprocess download failed: {subprocess_result.get('error')}")

        # Method 2: Fallback to Python library yt-dlp
        logger.info("🔄 Falling back to Python library yt-dlp for MP3 conversion...")
        import yt_dlp

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Speed-optimized yt-dlp configuration
            ydl_opts = {
                # Audio-only format selection for faster download
                'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[height<=480]',
                'outtmpl': os.path.join(temp_dir, 'audio.%(ext)s'),

                # Optimized post-processing
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': bitrate.replace('k', ''),
                }],

                # Speed optimizations
                'concurrent_fragment_downloads': 4,  # Parallel fragment downloads
                'fragment_retries': 2,  # Reduce retry attempts
                'retries': 2,
                'socket_timeout': 15,  # Faster timeout
                'http_chunk_size': 1048576,  # 1MB chunks for faster download

                # Disable unnecessary features
                'writeinfojson': False,
                'writesubtitles': False,
                'writeautomaticsub': False,
                'writethumbnail': False,
                'writedescription': False,
                'writecomments': False,
                'getcomments': False,
                'writeannotations': False,

                # Minimal output
                'quiet': True,
                'no_warnings': True,
                'no_color': True,
            }

            # Always apply optimized configuration for YouTube
            if 'youtube.com' in url or 'youtu.be' in url:
                # Fast YouTube configuration
                ydl_opts.update({
                    'http_headers': {
                        'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)',
                        'X-YouTube-Client-Name': '5',
                        'X-YouTube-Client-Version': '19.29.1',
                    },
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['ios'],  # iOS client is fastest
                            'skip': ['dash'],  # Skip DASH for faster processing
                        }
                    },
                })

                # Enhanced proxy configuration with anti-detection measures
                proxy_configured = False

                # Skip proxy configuration if no_proxy is True
                if no_proxy:
                    print("🚫 Proxy disabled - using direct connection")
                    proxy_configured = True  # Skip proxy setup
                else:
                    try:
                        from proxy_config import proxy_manager, get_yt_dlp_proxy_options
                        import random
                        import time

                        # Get available proxies with YouTube optimization
                        proxies = proxy_manager.get_proxy_list(include_no_proxy=False, prioritize_youtube=True)

                        # Try multiple proxies with enhanced session rotation
                        for i, proxy in enumerate(proxies[:3]):  # Try top 3 proxies
                            if proxy:
                                try:
                                    # Enhanced session rotation with random elements
                                    if any(x in proxy for x in ['smartproxy', 'brightdata', 'oxylabs', 'decodo', 'lum-superproxy']):
                                        # Add random session ID and country rotation
                                        session_id = random.randint(10000, 99999)
                                        countries = ['US', 'CA', 'GB', 'AU', 'DE']
                                        country = random.choice(countries)
                                        proxy = proxy_manager.get_proxy_with_session(proxy, session_id=session_id, country=country)

                                    proxy_opts = get_yt_dlp_proxy_options(proxy)
                                    ydl_opts.update(proxy_opts)

                                    # Enhanced anti-detection options
                                    ydl_opts['socket_timeout'] = 60
                                    ydl_opts['retries'] = 8
                                    ydl_opts['fragment_retries'] = 10
                                    ydl_opts['retry_sleep_functions'] = {
                                        'http': lambda n: random.uniform(1, 3) * n,
                                        'fragment': lambda n: random.uniform(0.5, 2) * n,
                                    }

                                    # Add random user agent rotation
                                    user_agents = [
                                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
                                    ]
                                    ydl_opts['http_headers'] = {'User-Agent': random.choice(user_agents)}

                                    proxy_type = "Unknown"
                                    if 'lum-superproxy.io' in proxy:
                                        proxy_type = "Bright Data"
                                    elif 'decodo.com' in proxy:
                                        proxy_type = "Decodo"
                                    elif 'smartproxy.com' in proxy:
                                        proxy_type = "Smartproxy"

                                    print(f"🔄 Using {proxy_type} proxy #{i+1} with enhanced anti-detection")
                                    proxy_configured = True
                                    break
                                except Exception as proxy_error:
                                    print(f"⚠️ Proxy #{i+1} configuration failed: {proxy_error}")
                                    continue

                        # Enhanced fallback with session rotation
                        if not proxy_configured:
                            import os
                            user = os.getenv('RESIDENTIAL_PROXY_USER')
                            password = os.getenv('RESIDENTIAL_PROXY_PASS')
                            endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

                            if user and password and endpoint and len(user) > 5 and len(password) > 5:
                                # Check if this is Decodo proxy (doesn't support session rotation)
                                if 'decodo.com' in endpoint:
                                    # Use original credentials for Decodo
                                    proxy_url = f"http://{user}:{password}@{endpoint}"
                                    ydl_opts['proxy'] = proxy_url
                                    print(f"🔄 Using Decodo proxy without session rotation: {proxy_url}")
                                else:
                                    # Add session rotation for other proxies
                                    session_id = random.randint(10000, 99999)
                                    enhanced_user = f"{user}-session-{session_id}"
                                    ydl_opts['proxy'] = f"http://{enhanced_user}:{password}@{endpoint}"
                                    print(f"🔄 Using enhanced fallback proxy with session {session_id}")

                                ydl_opts['socket_timeout'] = 60
                                ydl_opts['retries'] = 8
                                proxy_configured = True

                        if not proxy_configured:
                            print("⚠️ No working proxy available - trying direct connection")
                            # For YouTube, try direct connection without proxy as fallback
                            # This often works for many regions and is better than failing
                            ydl_opts.update({
                                'proxy': None,  # Explicitly disable proxy
                                'socket_timeout': 30,
                                'retries': 5,
                                'http_headers': {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.5',
                                    'Accept-Encoding': 'gzip, deflate',
                                    'Connection': 'keep-alive',
                                },
                            })
                            print("🔄 Using direct connection (no proxy) for YouTube")

                    except Exception as e:
                        print(f"⚠️ Enhanced proxy setup failed: {e}")
                        print("⚠️ Proceeding with basic configuration")
            else:
                # Platform-specific configuration for other platforms
                if 'tiktok.com' in url:
                    # TikTok-specific configuration
                    ydl_opts.update({
                        'http_headers': {
                            'User-Agent': 'com.zhiliaoapp.musically/2023405020 (Linux; U; Android 7.1.2; en_US; SM-G973F; Build/N2G48H;tt-ok/3.12.13.1)',
                            'Accept': 'application/json, text/plain, */*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Referer': 'https://www.tiktok.com/',
                            'Origin': 'https://www.tiktok.com',
                            'X-Requested-With': 'com.zhiliaoapp.musically',
                        },
                        'extractor_args': {
                            'tiktok': {
                                'api_hostname': 'api16-normal-c-useast1a.tiktokv.com',
                                'app_version': '34.1.2',
                                'manifest_app_version': '2023405020',
                                'aid': '1988',
                            }
                        }
                    })
                else:
                    # Default configuration for other platforms
                    ydl_opts.update({
                        'http_headers': {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        },
                    })

            # Fast download and convert in one step with proxy fallback
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Download and convert in one operation (faster than separate steps)
                    info = ydl.extract_info(url, download=True)
                    title = info.get('title', 'audio')
                    duration = info.get('duration', 0)
            except Exception as e:
                error_str = str(e)
                # Check if it's a proxy authentication error (HTTP 407) or tunnel connection failed
                if (('407' in error_str or 'Proxy Authentication Required' in error_str or
                     'Tunnel connection failed' in error_str or 'ProxyError' in error_str or
                     'proxy' in error_str.lower()) and ('youtube.com' in url or 'youtu.be' in url)):
                    print(f"🔄 Proxy authentication failed ({error_str[:100]}...), trying direct connection")

                    # Create a new configuration without proxy for YouTube
                    no_proxy_opts = ydl_opts.copy()
                    no_proxy_opts.update({
                        'proxy': None,  # Explicitly disable proxy
                        'socket_timeout': 30,
                        'retries': 3,
                        'http_headers': {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'Connection': 'keep-alive',
                        },
                        'extractor_args': {
                            'youtube': {
                                'player_client': ['ios'],  # iOS client often works without proxy
                                'skip': ['dash'],
                            }
                        },
                    })

                    print("🔄 Attempting YouTube conversion without proxy...")
                    with yt_dlp.YoutubeDL(no_proxy_opts) as ydl:
                        info = ydl.extract_info(url, download=True)
                        title = info.get('title', 'audio')
                        duration = info.get('duration', 0)
                    print("✅ Direct connection successful!")
                else:
                    # Re-raise the original error if it's not a proxy issue
                    raise

            # Find the converted file
            all_files = os.listdir(temp_dir)
            logger.info(f"Files in temp directory: {all_files}")

            converted_files = [f for f in all_files if f.endswith('.mp3')]
            if not converted_files:
                # Try to find any audio file that might have been created
                audio_files = [f for f in all_files if any(f.endswith(ext) for ext in ['.m4a', '.webm', '.ogg', '.wav'])]
                if audio_files:
                    logger.info(f"Found audio file to convert: {audio_files[0]}")
                    # Use FFmpeg to convert to MP3
                    input_file = os.path.join(temp_dir, audio_files[0])
                    # Generate unique temp filename based on output path
                    temp_filename = os.path.basename(output_path)
                    output_file = os.path.join(temp_dir, temp_filename)

                    ffmpeg_cmd = [
                        'ffmpeg', '-i', input_file,
                        '-codec:a', 'libmp3lame',
                        '-b:a', bitrate,
                        '-y',  # Overwrite output file
                        output_file
                    ]

                    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                    if result.returncode == 0:
                        temp_file = output_file
                    else:
                        logger.error(f"FFmpeg conversion failed: {result.stderr}")
                        raise ValueError(f"Failed to convert audio to MP3: {result.stderr}")
                else:
                    raise ValueError("No audio file was created")
            else:
                temp_file = os.path.join(temp_dir, converted_files[0])

            # Move to final output path
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            os.rename(temp_file, output_path)

            # Get file size
            file_size = os.path.getsize(output_path)

            logger.info(f"Successfully converted to MP3: {title} ({format_duration(duration)}) - {file_size} bytes")

            # Generate download URL for the file
            filename = os.path.basename(output_path)
            download_url = f"/download/{filename}"

            return ConversionResult(
                success=True,
                file_path=output_path,
                file_size=file_size,
                duration=duration,
                format='mp3',
                quality=quality,
                download_url=download_url,
                filename=filename
            )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to convert to MP3: {error_msg}")

        return ConversionResult(
            success=False,
            error=f"MP3 conversion failed: {error_msg}"
        )

async def convert_to_mp4(url: str, quality: str, output_path: str, use_bypass: bool = False, no_proxy: bool = False) -> ConversionResult:
    """
    Convert video to MP4 using yt-dlp and FFmpeg
    """
    try:
        import yt_dlp
        import tempfile
        import os

        # Get quality settings
        quality_settings = get_quality_settings('mp4', quality)
        height = quality_settings.get('height', 720)
        codec = quality_settings.get('codec', 'libx264')
        preset = quality_settings.get('preset', 'fast')

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Configure yt-dlp options for video download
            # Use a simple filename to avoid issues with special characters
            ydl_opts = {
                'format': f'best[height<={height}]/best',
                'outtmpl': os.path.join(temp_dir, 'downloaded_video.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegVideoConvertor',
                    'preferedformat': 'mp4',
                }],
                'quiet': True,
                'no_warnings': True,
            }

            # Apply bypass methods if requested
            if use_bypass and ('youtube.com' in url or 'youtu.be' in url):
                print("🔄 Using YouTube bypass methods for MP4 conversion")
                # Use the same bypass configuration as the youtube-bypass endpoint
                ydl_opts.update({
                    'http_headers': {
                        'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)',
                        'X-YouTube-Client-Name': '5',
                        'X-YouTube-Client-Version': '19.29.1',
                    },
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['ios'],
                            'innertube_host': ['youtubei.googleapis.com'],
                        }
                    },
                })

                # Try to get proxy configuration
                try:
                    from proxy_config import proxy_manager, get_yt_dlp_proxy_options
                    proxies = proxy_manager.get_proxy_list(include_no_proxy=False)
                    if proxies:
                        best_proxy = proxies[0]  # Use the first available proxy
                        proxy_opts = get_yt_dlp_proxy_options(best_proxy)
                        ydl_opts.update(proxy_opts)
                        print(f"🔄 Using proxy for bypass: {best_proxy is not None}")
                except Exception as e:
                    print(f"⚠️ Could not configure proxy: {e}")
            else:
                # Standard configuration for non-bypass mode
                ydl_opts.update({
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-us,en;q=0.5',
                        'Accept-Encoding': 'gzip,deflate',
                        'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                        'Keep-Alive': '300',
                        'Connection': 'keep-alive',
                    },
                    'extractor_args': {
                        'youtube': {
                            'skip': ['dash', 'hls'],
                            'player_client': ['android', 'web'],
                        }
                    },
                })

            # Download and convert
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Extract info first
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'video')
                duration = info.get('duration', 0)

                # Download and convert
                ydl.download([url])

                # Find the converted file
                converted_files = [f for f in os.listdir(temp_dir) if f.endswith('.mp4')]
                if not converted_files:
                    raise ValueError("No MP4 file was created")

                temp_file = os.path.join(temp_dir, converted_files[0])

                # Additional FFmpeg processing for quality optimization
                # Generate unique temp filename based on output path
                temp_filename = os.path.basename(output_path)
                final_output = os.path.join(temp_dir, f"final_{temp_filename}")

                # Build FFmpeg command for quality optimization
                ffmpeg_cmd = [
                    'ffmpeg', '-i', temp_file,
                    '-c:v', codec,
                    '-preset', preset,
                    '-crf', '23',  # Constant Rate Factor for good quality
                    '-maxrate', f'{get_bitrate_for_resolution(height)}',
                    '-bufsize', f'{get_bitrate_for_resolution(height, buffer=True)}',
                    '-vf', f'scale=-2:{height}',  # Scale to target height, maintain aspect ratio
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-movflags', '+faststart',  # Optimize for web streaming
                    '-y',  # Overwrite output file
                    final_output
                ]

                # Run FFmpeg
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"FFmpeg error: {result.stderr}")
                    # Fallback to original file if FFmpeg fails
                    final_output = temp_file

                # Move to final output path
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                os.rename(final_output, output_path)

                # Get file size
                file_size = os.path.getsize(output_path)

                logger.info(f"Successfully converted to MP4: {title} ({format_duration(duration)}) - {format_file_size(file_size)}")

                # Generate download URL for the file
                filename = os.path.basename(output_path)
                download_url = f"/download/{filename}"

                return ConversionResult(
                    success=True,
                    file_path=output_path,
                    file_size=file_size,
                    duration=duration,
                    format='mp4',
                    quality=quality,
                    download_url=download_url,
                    filename=filename
                )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to convert to MP4: {error_msg}")

        return ConversionResult(
            success=False,
            error=f"MP4 conversion failed: {error_msg}"
        )

def get_bitrate_for_resolution(height: int, buffer: bool = False) -> str:
    """
    Get appropriate bitrate for video resolution
    """
    bitrate_map = {
        360: '1000k',
        720: '2500k',
        1080: '5000k',
    }

    base_bitrate = bitrate_map.get(height, '2500k')

    if buffer:
        # Buffer size should be 2x the bitrate
        bitrate_value = int(base_bitrate.replace('k', '')) * 2
        return f'{bitrate_value}k'

    return base_bitrate

def estimate_file_size(duration: float, format_type: str, quality: str) -> int:
    """
    Estimate output file size based on duration, format, and quality
    """
    if format_type.lower() == 'mp3':
        # MP3 bitrate estimates (bytes per second)
        bitrate_map = {
            '96': 12000,   # 96 kbps ≈ 12 KB/s
            '128': 16000,  # 128 kbps ≈ 16 KB/s
            '256': 32000,  # 256 kbps ≈ 32 KB/s
            '320': 40000,  # 320 kbps ≈ 40 KB/s
        }
        bytes_per_second = bitrate_map.get(quality, 16000)  # 默认128k
        return duration * bytes_per_second

    elif format_type.lower() == 'mp4':
        # MP4 estimates (very rough, depends on content)
        quality_map = {
            '360': 500000,   # ~500 KB/s
            '720': 1500000,  # ~1.5 MB/s
            '1080': 3000000, # ~3 MB/s
        }
        bytes_per_second = quality_map.get(quality, 1500000)
        return duration * bytes_per_second

    return 0

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

@app.post("/extract-metadata", response_model=MetadataResponse)
async def extract_metadata_endpoint(request: VideoMetadataRequest):
    """
    Extract video metadata from a given URL
    """
    try:
        logger.info(f"Extracting metadata for URL: {request.url}")

        # Extract raw metadata
        raw_info = await extract_video_metadata(request.url)

        # Process into our format
        metadata = process_metadata(raw_info)

        # Validate duration and generate warning if needed
        warning = validate_video_duration(metadata.duration)

        logger.info(f"Successfully extracted metadata for: {metadata.title} ({format_duration(metadata.duration)})")

        return MetadataResponse(
            success=True,
            metadata=metadata,
            warning=warning
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to extract metadata for {request.url}: {error_msg}")

        # Provide user-friendly error messages for common issues
        if "tiktok" in request.url.lower():
            if "Unable to extract webpage video data" in error_msg:
                user_friendly_error = (
                    "TikTok video extraction failed due to anti-bot protection. "
                    "This is a common issue with TikTok. Please try:\n"
                    "• A different TikTok video\n"
                    "• Trying again in a few minutes\n"
                    "• Using videos from other platforms (YouTube, Twitter, etc.)\n"
                    "• Checking if the video is still available and public"
                )
            else:
                user_friendly_error = f"TikTok extraction failed: {error_msg}"
        elif "youtube" in request.url.lower():
            user_friendly_error = (
                "YouTube access is currently restricted from this server location. "
                "Please try a different video or try again later."
            )
        else:
            user_friendly_error = f"Failed to extract video metadata: {error_msg}"

        # Return error response
        return MetadataResponse(
            success=False,
            error=user_friendly_error
        )

@app.post("/convert-fast", response_model=ConvertResponse)
async def convert_video_fast_endpoint(request: ConvertRequest):
    """
    Fast video conversion with speed optimizations (recommended for best performance)
    Skips metadata pre-check to save 5-10 seconds
    """
    try:
        logger.info(f"Starting FAST conversion: {request.url} -> {request.format} ({request.quality})")

        # Validate format and quality
        supported_formats = ['mp3', 'mp4']
        if request.format.lower() not in supported_formats:
            return ConvertResponse(
                success=False,
                error=f"Unsupported format: {request.format}. Supported formats: {', '.join(supported_formats)}"
            )

        # Generate output filename
        import time
        timestamp = int(time.time())
        safe_filename = f"converted_{timestamp}.{request.format.lower()}"
        output_path = f"/tmp/{safe_filename}"

        # Direct conversion without metadata pre-check (saves time)
        if request.format.lower() == 'mp3':
            result = await convert_to_mp3(request.url, request.quality, output_path, use_bypass=True, no_proxy=request.noProxy)
        else:
            result = await convert_to_mp4(request.url, request.quality, output_path, use_bypass=True, no_proxy=request.noProxy)

        if result.success:
            logger.info(f"FAST conversion completed: {result.file_path}")
            return ConvertResponse(
                success=True,
                result=result
            )
        else:
            logger.error(f"FAST conversion failed: {result.error}")
            return ConvertResponse(
                success=False,
                error=result.error
            )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"FAST conversion error: {error_msg}")
        return ConvertResponse(
            success=False,
            error=f"Conversion failed: {error_msg}"
        )

@app.post("/convert-no-proxy", response_model=ConvertResponse)
async def convert_video_no_proxy_endpoint(request: ConvertRequest):
    """
    Convert video without using any proxy (direct connection only)
    Faster and more reliable for regions where direct access works
    """
    try:
        logger.info(f"Starting NO-PROXY conversion: {request.url} -> {request.format} ({request.quality})")

        # Force no proxy mode
        request.noProxy = True

        # Quick metadata extraction with timeout
        try:
            import asyncio
            raw_info = await asyncio.wait_for(extract_video_metadata(request.url), timeout=30.0)
            metadata = process_metadata(raw_info)
        except asyncio.TimeoutError:
            return ConvertResponse(
                success=False,
                error="Metadata extraction timed out. The video may be too large or the source is slow."
            )
        except Exception as e:
            return ConvertResponse(
                success=False,
                error=f"Failed to extract video metadata: {str(e)}"
            )

        # Validate format and quality
        supported_formats = ['mp3', 'mp4']
        if request.format.lower() not in supported_formats:
            return ConvertResponse(
                success=False,
                error=f"Unsupported format: {request.format}. Supported formats: {', '.join(supported_formats)}"
            )

        # Check video duration - reject very long videos
        if metadata.duration and metadata.duration > 3600:  # 1 hour limit
            return ConvertResponse(
                success=False,
                error=f"Video too long ({metadata.duration/60:.1f} minutes). Maximum duration is 60 minutes."
            )

        # Generate unique output filename
        import time
        import hashlib

        # Clean title for filename
        safe_title = "".join(c for c in metadata.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title[:50] if len(safe_title) > 50 else safe_title

        # Create hash for uniqueness
        url_hash = hashlib.md5(request.url.encode()).hexdigest()[:8]
        timestamp = int(time.time())

        output_filename = f"{safe_title}_{url_hash}_{timestamp}.{request.format.lower()}"
        output_path = f"/tmp/{output_filename}"

        # Set conversion timeout based on video duration
        conversion_timeout = min(300, max(60, metadata.duration * 2)) if metadata.duration else 120

        try:
            print(f"🚫 NO-PROXY Conversion parameters: format={request.format}, quality={request.quality}")
            if request.format.lower() == 'mp3':
                result = await asyncio.wait_for(
                    convert_to_mp3(request.url, request.quality, output_path, use_bypass=False, no_proxy=True),
                    timeout=conversion_timeout
                )
            elif request.format.lower() == 'mp4':
                result = await asyncio.wait_for(
                    convert_to_mp4(request.url, request.quality, output_path, use_bypass=False, no_proxy=True),
                    timeout=conversion_timeout
                )
            else:
                return ConvertResponse(
                    success=False,
                    error=f"Unsupported format: {request.format}"
                )
        except asyncio.TimeoutError:
            return ConvertResponse(
                success=False,
                error=f"Conversion timed out after {conversion_timeout} seconds. Try a shorter video or lower quality."
            )

        if result.success:
            logger.info(f"NO-PROXY conversion completed: {output_filename} ({format_file_size(result.file_size)})")
            return ConvertResponse(
                success=True,
                result=result
            )
        else:
            return ConvertResponse(
                success=False,
                error=result.error
            )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"NO-PROXY conversion endpoint error: {error_msg}")
        return ConvertResponse(
            success=False,
            error=f"Conversion failed: {error_msg}"
        )

@app.post("/convert", response_model=ConvertResponse)
async def convert_video_endpoint(request: ConvertRequest):
    """
    Convert video to specified format and quality with timeout protection
    (Standard endpoint with metadata validation - slower but safer)
    """
    try:
        logger.info(f"Starting conversion: {request.url} -> {request.format} ({request.quality})")

        # Quick metadata extraction with timeout
        try:
            import asyncio
            raw_info = await asyncio.wait_for(extract_video_metadata(request.url), timeout=30.0)
            metadata = process_metadata(raw_info)
        except asyncio.TimeoutError:
            return ConvertResponse(
                success=False,
                error="Metadata extraction timed out. The video may be too large or the source is slow."
            )
        except Exception as e:
            return ConvertResponse(
                success=False,
                error=f"Failed to extract video metadata: {str(e)}"
            )

        # Validate format and quality
        supported_formats = ['mp3', 'mp4']
        if request.format.lower() not in supported_formats:
            return ConvertResponse(
                success=False,
                error=f"Unsupported format: {request.format}. Supported formats: {', '.join(supported_formats)}"
            )

        # Check video duration - reject very long videos
        if metadata.duration and metadata.duration > 3600:  # 1 hour limit
            return ConvertResponse(
                success=False,
                error=f"Video too long ({metadata.duration/60:.1f} minutes). Maximum duration is 60 minutes."
            )

        # Generate unique output filename
        import time
        import hashlib

        # Clean title for filename
        safe_title = "".join(c for c in metadata.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title[:40]  # Limit length to leave room for timestamp

        # Add timestamp and video ID for uniqueness
        timestamp = int(time.time())
        video_id = request.url.split('/')[-1].split('?')[0].split('&')[0][-11:]  # Get YouTube video ID

        # Create unique filename: title_videoID_timestamp.format
        if safe_title:
            output_filename = f"{safe_title}_{video_id}_{timestamp}.{request.format.lower()}"
        else:
            # Fallback if title is empty or only special chars
            output_filename = f"video_{video_id}_{timestamp}.{request.format.lower()}"

        output_path = f"/tmp/{output_filename}"

        # Perform conversion with timeout based on video duration
        conversion_timeout = min(300, max(60, metadata.duration * 2)) if metadata.duration else 120

        try:
            print(f"🔧 Conversion parameters: format={request.format}, quality={request.quality}, useBypass={request.useBypass}, noProxy={request.noProxy}")
            if request.format.lower() == 'mp3':
                result = await asyncio.wait_for(
                    convert_to_mp3(request.url, request.quality, output_path, request.useBypass, request.noProxy),
                    timeout=conversion_timeout
                )
            elif request.format.lower() == 'mp4':
                result = await asyncio.wait_for(
                    convert_to_mp4(request.url, request.quality, output_path, request.useBypass, request.noProxy),
                    timeout=conversion_timeout
                )
            else:
                return ConvertResponse(
                    success=False,
                    error=f"Unsupported format: {request.format}"
                )
        except asyncio.TimeoutError:
            return ConvertResponse(
                success=False,
                error=f"Conversion timed out after {conversion_timeout} seconds. Try a shorter video or lower quality."
            )

        if result.success:
            logger.info(f"Conversion completed: {output_filename} ({format_file_size(result.file_size)})")
            return ConvertResponse(
                success=True,
                result=result
            )
        else:
            return ConvertResponse(
                success=False,
                error=result.error
            )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Conversion endpoint error: {error_msg}")
        return ConvertResponse(
            success=False,
            error=f"Conversion failed: {error_msg}"
        )

@app.post("/test-convert")
async def test_convert_endpoint(request: ConvertRequest):
    """
    Test conversion endpoint with detailed logging
    """
    try:
        logger.info(f"Test conversion request: {request.url} -> {request.format} ({request.quality})")

        # Test file size estimation
        estimated_size = estimate_file_size(213, request.format, request.quality)  # Rick Roll duration
        logger.info(f"Estimated file size: {format_file_size(estimated_size)}")

        # Test quality settings
        quality_settings = get_quality_settings(request.format, request.quality)
        logger.info(f"Quality settings: {quality_settings}")

        return {
            "message": "Test conversion endpoint",
            "request": request.dict(),
            "estimated_size": format_file_size(estimated_size),
            "quality_settings": quality_settings,
            "status": "ready_for_conversion"
        }

    except Exception as e:
        logger.error(f"Test conversion error: {str(e)}")
        return {"error": str(e)}

@app.post("/demo-convert")
async def demo_convert_endpoint():
    """
    Demo conversion using a simple test audio file
    """
    try:
        import tempfile
        import os

        # Create a simple test audio file using FFmpeg
        with tempfile.TemporaryDirectory() as temp_dir:
            # Generate a 5-second test tone
            test_audio = os.path.join(temp_dir, 'test_input.wav')
            output_mp3 = os.path.join(temp_dir, 'test_output.mp3')

            # Generate test audio (5 second sine wave at 440Hz)
            generate_cmd = [
                'ffmpeg', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=5',
                '-y', test_audio
            ]

            result = subprocess.run(generate_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Failed to generate test audio: {result.stderr}"
                }

            # Convert to MP3
            convert_cmd = [
                'ffmpeg', '-i', test_audio,
                '-codec:a', 'libmp3lame',
                '-b:a', '192k',
                '-y', output_mp3
            ]

            result = subprocess.run(convert_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Failed to convert to MP3: {result.stderr}"
                }

            # Check if file was created
            if os.path.exists(output_mp3):
                file_size = os.path.getsize(output_mp3)
                return {
                    "success": True,
                    "message": "Demo conversion successful!",
                    "details": {
                        "input_format": "WAV (generated test tone)",
                        "output_format": "MP3",
                        "duration": "5 seconds",
                        "bitrate": "192k",
                        "file_size": format_file_size(file_size),
                        "file_size_bytes": file_size
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Output file was not created"
                }

    except Exception as e:
        logger.error(f"Demo conversion error: {str(e)}")
        return {
            "success": False,
            "error": f"Demo conversion failed: {str(e)}"
        }

@app.post("/demo-video-convert")
async def demo_video_convert_endpoint():
    """
    Demo video conversion using a simple test video file
    """
    try:
        import tempfile
        import os

        # Create a simple test video file using FFmpeg
        with tempfile.TemporaryDirectory() as temp_dir:
            # Generate a 3-second test video (color bars with audio)
            test_video = os.path.join(temp_dir, 'test_input.mp4')
            output_mp4 = os.path.join(temp_dir, 'test_output.mp4')

            # Generate test video (3 second color pattern with sine wave audio)
            generate_cmd = [
                'ffmpeg',
                '-f', 'lavfi', '-i', 'testsrc=duration=3:size=640x480:rate=30',
                '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
                '-c:v', 'libx264', '-c:a', 'aac',
                '-y', test_video
            ]

            result = subprocess.run(generate_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Failed to generate test video: {result.stderr}"
                }

            # Convert/optimize the video
            convert_cmd = [
                'ffmpeg', '-i', test_video,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-vf', 'scale=480:360',  # Scale to 360p
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                '-y', output_mp4
            ]

            result = subprocess.run(convert_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Failed to convert video: {result.stderr}"
                }

            # Check if file was created
            if os.path.exists(output_mp4):
                file_size = os.path.getsize(output_mp4)
                return {
                    "success": True,
                    "message": "Demo video conversion successful!",
                    "details": {
                        "input_format": "MP4 (generated test pattern)",
                        "output_format": "MP4",
                        "duration": "3 seconds",
                        "resolution": "480x360",
                        "video_codec": "H.264",
                        "audio_codec": "AAC",
                        "file_size": format_file_size(file_size),
                        "file_size_bytes": file_size
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Output video file was not created"
                }

    except Exception as e:
        logger.error(f"Demo video conversion error: {str(e)}")
        return {
            "success": False,
            "error": f"Demo video conversion failed: {str(e)}"
        }

@app.post("/validate-conversion")
async def validate_conversion_endpoint(request: ConvertRequest):
    """
    Validate conversion parameters without actually converting
    """
    try:
        logger.info(f"Validating conversion: {request.url} -> {request.format} ({request.quality})")

        # Validate format
        supported_formats = ['mp3', 'mp4']
        if request.format.lower() not in supported_formats:
            return {
                "valid": False,
                "error": f"Unsupported format: {request.format}. Supported: {', '.join(supported_formats)}"
            }

        # Validate quality based on format
        if request.format.lower() == 'mp3':
            supported_qualities = ['128', '192', '320']
            if request.quality not in supported_qualities:
                return {
                    "valid": False,
                    "error": f"Unsupported MP3 quality: {request.quality}. Supported: {', '.join(supported_qualities)}"
                }
        elif request.format.lower() == 'mp4':
            supported_qualities = ['360', '720', '1080']
            if request.quality not in supported_qualities:
                return {
                    "valid": False,
                    "error": f"Unsupported MP4 quality: {request.quality}. Supported: {', '.join(supported_qualities)}"
                }

        # Try to extract metadata to validate URL
        try:
            raw_info = await extract_video_metadata(request.url)
            metadata = process_metadata(raw_info)

            # Estimate file size
            estimated_size = estimate_file_size(metadata.duration, request.format, request.quality)

            return {
                "valid": True,
                "metadata": {
                    "title": metadata.title,
                    "duration": metadata.duration,
                    "duration_formatted": format_duration(metadata.duration),
                    "uploader": metadata.uploader
                },
                "conversion": {
                    "format": request.format,
                    "quality": request.quality,
                    "estimated_size": estimated_size,
                    "estimated_size_formatted": format_file_size(estimated_size),
                    "quality_settings": get_quality_settings(request.format, request.quality)
                }
            }

        except Exception as metadata_error:
            return {
                "valid": False,
                "error": f"Failed to extract video metadata: {str(metadata_error)}"
            }

    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return {
            "valid": False,
            "error": f"Validation failed: {str(e)}"
        }

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download a converted file"""
    try:
        import os
        from fastapi.responses import FileResponse

        # Security: Only allow files from the output directory
        safe_filename = os.path.basename(filename)
        file_path = os.path.join("/tmp", safe_filename)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # Determine content type based on file extension
        content_type = "application/octet-stream"
        if filename.endswith('.mp3'):
            content_type = "audio/mpeg"
        elif filename.endswith('.mp4'):
            content_type = "video/mp4"

        return FileResponse(
            path=file_path,
            media_type=content_type,
            filename=safe_filename,
            headers={"Cache-Control": "public, max-age=3600"}
        )

    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        raise HTTPException(status_code=500, detail="Download failed")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "GetGoodTape Video Processing Service",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "extract_metadata": "/extract-metadata",
            "convert": "/convert",
            "convert_fast": "/convert-fast",  # NEW: Speed-optimized conversion (recommended)
            "download": "/download/{filename}",
            "validate_conversion": "/validate-conversion",
            "test_convert": "/test-convert",
            "demo_convert": "/demo-convert",
            "demo_video_convert": "/demo-video-convert",
            "youtube_api_test": "/youtube-api-test",
            "docs": "/docs"
        },
        "features": {
            "youtube_api_fallback": YOUTUBE_API_AVAILABLE,
            "youtube_api_configured": bool(os.getenv('YOUTUBE_API_KEY') and os.getenv('YOUTUBE_API_KEY') != 'your_youtube_api_key_here')
        },
        "supported_formats": {
            "mp3": {
                "qualities": ["128", "192", "320"],
                "description": "Audio-only MP3 format with bitrate in kbps"
            },
            "mp4": {
                "qualities": ["360", "720", "1080"],
                "description": "Video MP4 format with resolution in pixels"
            }
        }
    }

@app.post("/youtube-api-test")
async def test_youtube_api(request: dict):
    """
    Test YouTube Data API functionality
    """
    if not YOUTUBE_API_AVAILABLE:
        return {
            "success": False,
            "error": "YouTube API module not available",
            "details": "youtube_api.py not imported successfully"
        }

    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key or api_key == 'your_youtube_api_key_here':
        return {
            "success": False,
            "error": "YouTube API key not configured",
            "details": "Set YOUTUBE_API_KEY environment variable"
        }

    url = request.get('url')
    if not url:
        # Use default test video
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    try:
        result = await youtube_api.validate_video_url(url)
        return {
            "success": True,
            "api_test_result": result,
            "test_url": url
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"YouTube API test failed: {str(e)}",
            "test_url": url
        }



@app.post("/youtube-bypass")
async def youtube_bypass_endpoint(request: dict):
    """
    Specialized YouTube bypass endpoint using multiple strategies including proxies
    """
    import yt_dlp
    import random
    import time
    from proxy_config import proxy_manager, get_yt_dlp_proxy_options

    start_time = time.time()
    proxy_used = "none"

    try:
        url = request.get('url')
        if not url:
            return {"success": False, "error": "URL is required"}

        # Get optimized proxy list
        proxies = proxy_manager.get_proxy_list(include_no_proxy=True)

        # Multiple user agents to rotate
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
        ]

        # 2025 YouTube bypass strategies using latest yt-dlp techniques
        strategies = [
            {
                'name': 'iOS 17 (2025)',
                'opts': {
                    'quiet': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['ios'],
                            'innertube_host': ['youtubei.googleapis.com'],
                            # Using yt-dlp default key
                        }
                    },
                    'http_headers': {
                        'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)',
                        'X-YouTube-Client-Name': '5',
                        'X-YouTube-Client-Version': '19.29.1',
                    },
                }
            },
            {
                'name': 'Android 14 (2025)',
                'opts': {
                    'quiet': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['android'],
                            'innertube_host': ['youtubei.googleapis.com'],
                            # Using yt-dlp default key
                        }
                    },
                    'http_headers': {
                        'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14; SM-S918B Build/UP1A.231005.007) gzip',
                        'X-YouTube-Client-Name': '3',
                        'X-YouTube-Client-Version': '19.29.37',
                    },
                }
            },
            {
                'name': 'Web Chrome 131 (2025)',
                'opts': {
                    'quiet': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['web'],
                            'innertube_host': ['youtubei.googleapis.com'],
                            # Using yt-dlp default key
                        }
                    },
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"',
                    },
                }
            },
            {
                'name': 'TV Embedded (2025)',
                'opts': {
                    'quiet': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['tv_embedded'],
                            'innertube_host': ['youtubei.googleapis.com'],
                        }
                    },
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/7.0 TV Safari/537.36',
                    },
                }
            },
            {
                'name': 'Android Music (2025)',
                'opts': {
                    'quiet': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['android_music'],
                            'innertube_host': ['music.youtube.com'],
                        }
                    },
                    'http_headers': {
                        'User-Agent': 'com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14) gzip',
                    },
                }
            }
        ]

        # Try each strategy with different proxies
        for strategy in strategies:
            for proxy in proxies:
                try:
                    # Add session rotation for residential proxies
                    if proxy and ('smartproxy' in proxy or 'brightdata' in proxy or 'oxylabs' in proxy):
                        proxy = proxy_manager.get_proxy_with_session(proxy)

                    strategy_name = f"{strategy['name']}" + (f" + Proxy" if proxy else "")
                    print(f"Trying strategy: {strategy_name}")

                    # Add proxy to options if available
                    opts = strategy['opts'].copy()
                    proxy_opts = get_yt_dlp_proxy_options(proxy)
                    opts.update(proxy_opts)

                    time.sleep(random.uniform(0.5, 2))  # Random delay

                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        if info:
                            # Record successful proxy usage
                            proxy_manager.record_proxy_result(proxy, True)
                            return {
                                "success": True,
                                "strategy": strategy_name,
                                "title": info.get('title', 'Unknown'),
                                "duration": info.get('duration', 0),
                                "formats_available": len(info.get('formats', [])),
                                "message": f"Successfully bypassed using {strategy_name}",
                                "proxy_used": proxy is not None,
                                "proxy_type": "residential" if proxy and any(x in proxy for x in ['smartproxy', 'brightdata', 'oxylabs']) else "datacenter" if proxy else "none"
                            }
                except Exception as e:
                    # Record failed proxy usage
                    proxy_manager.record_proxy_result(proxy, False)
                    print(f"Strategy {strategy_name} failed: {str(e)}")
                    continue

        return {
            "success": False,
            "error": "All bypass strategies failed",
            "strategies_tried": [s['name'] for s in strategies]
        }

    except Exception as e:
        return {"success": False, "error": f"Bypass failed: {str(e)}"}


@app.get("/proxy-stats")
async def get_proxy_stats():
    """Get proxy performance statistics"""
    try:
        from proxy_config import proxy_manager
        import os

        stats = proxy_manager.get_proxy_stats()
        best_proxies = proxy_manager.get_best_proxies(min_attempts=3)
        proxy_list = proxy_manager.get_proxy_list()

        # Check environment variables
        env_check = {
            "RESIDENTIAL_PROXY_USER": bool(os.getenv('RESIDENTIAL_PROXY_USER')),
            "RESIDENTIAL_PROXY_PASS": bool(os.getenv('RESIDENTIAL_PROXY_PASS')),
            "RESIDENTIAL_PROXY_ENDPOINT": bool(os.getenv('RESIDENTIAL_PROXY_ENDPOINT')),
            "SMARTPROXY_USER": bool(os.getenv('SMARTPROXY_USER')),
            "SMARTPROXY_PASS": bool(os.getenv('SMARTPROXY_PASS')),
            "BRIGHTDATA_USER": bool(os.getenv('BRIGHTDATA_USER')),
            "BRIGHTDATA_PASS": bool(os.getenv('BRIGHTDATA_PASS'))
        }

        return {
            "success": True,
            "proxy_stats": stats,
            "best_proxies": best_proxies,
            "total_proxies_configured": len(proxy_list),
            "residential_proxies": len(proxy_manager.residential_proxies),
            "datacenter_proxies": len(proxy_manager.datacenter_proxies),
            "free_proxies": len(proxy_manager.free_proxies),
            "proxy_list_sample": proxy_list[:3] if proxy_list else [],
            "environment_variables": env_check
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to get proxy stats: {str(e)}"}


@app.post("/test-proxy")
async def test_proxy_endpoint(request: dict):
    """Test a specific proxy configuration"""
    try:
        from proxy_config import test_proxy

        proxy_url = request.get('proxy_url')
        test_url = request.get('test_url', 'https://httpbin.org/ip')

        if not proxy_url:
            return {"success": False, "error": "proxy_url is required"}

        is_working = test_proxy(proxy_url, test_url)

        return {
            "success": True,
            "proxy_url": proxy_url,
            "is_working": is_working,
            "test_url": test_url
        }
    except Exception as e:
        return {"success": False, "error": f"Proxy test failed: {str(e)}"}

@app.get("/test-proxy-detailed")
async def test_proxy_detailed():
    """Test proxy with detailed error information"""
    try:
        from proxy_config import proxy_manager
        import requests

        proxies = proxy_manager.get_proxy_list(include_no_proxy=False)
        if not proxies:
            return {"error": "No proxies configured"}

        proxy = proxies[0]  # Test first proxy

        # Test different endpoints
        test_results = []
        test_urls = [
            'https://httpbin.org/ip',
            'https://api.ipify.org',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ]

        for test_url in test_urls:
            try:
                response = requests.get(
                    test_url,
                    proxies={'http': proxy, 'https': proxy},
                    timeout=10,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                )
                test_results.append({
                    "url": test_url,
                    "status_code": response.status_code,
                    "success": response.status_code == 200,
                    "response_size": len(response.text),
                    "error": None
                })
            except Exception as e:
                test_results.append({
                    "url": test_url,
                    "status_code": None,
                    "success": False,
                    "response_size": 0,
                    "error": str(e)
                })

        # Mask sensitive info
        masked_proxy = proxy.replace(proxy.split(':')[1].split('@')[0], '***')

        return {
            "proxy": masked_proxy,
            "server_ip": "208.77.246.74",
            "test_results": test_results,
            "summary": {
                "total_tests": len(test_results),
                "successful": sum(1 for r in test_results if r["success"]),
                "failed": sum(1 for r in test_results if not r["success"])
            }
        }

    except Exception as e:
        return {"error": f"Detailed proxy test failed: {str(e)}"}

@app.get("/test-all-proxies")
async def test_all_proxies_endpoint():
    """Test all configured proxies"""
    try:
        from proxy_config import proxy_manager, test_proxy

        proxies = proxy_manager.get_proxy_list(include_no_proxy=False)
        results = []

        for i, proxy in enumerate(proxies[:5]):  # Test first 5 proxies only
            if proxy:
                is_working = test_proxy(proxy, 'https://httpbin.org/ip')
                # Mask sensitive info in response
                masked_proxy = proxy.replace(proxy.split(':')[1].split('@')[0], '***')
                results.append({
                    "index": i,
                    "proxy": masked_proxy,
                    "is_working": is_working
                })

        return {
            "success": True,
            "total_proxies": len(proxies),
            "tested_proxies": len(results),
            "results": results
        }
    except Exception as e:
        return {"success": False, "error": f"Proxy test failed: {str(e)}"}

@app.get("/check-ip")
async def check_ip_endpoint():
    """Check server's outbound IP address"""
    try:
        import requests

        # Check without proxy
        response = requests.get('https://httpbin.org/ip', timeout=10)
        server_ip = response.json()

        # Try with first proxy
        from proxy_config import proxy_manager
        proxies = proxy_manager.get_proxy_list(include_no_proxy=False)
        proxy_result = None

        if proxies:
            first_proxy = proxies[0]
            try:
                proxy_response = requests.get(
                    'https://httpbin.org/ip',
                    proxies={'http': first_proxy, 'https': first_proxy},
                    timeout=15
                )
                proxy_result = proxy_response.json()
            except Exception as e:
                proxy_result = {"error": str(e)}

        return {
            "success": True,
            "server_ip": server_ip,
            "proxy_ip": proxy_result,
            "total_proxies": len(proxies) if proxies else 0
        }
    except Exception as e:
        return {"success": False, "error": f"IP check failed: {str(e)}"}

@app.post("/test-proxy-formats")
async def test_proxy_formats_endpoint(request: dict):
    """Test different proxy authentication formats"""
    try:
        import requests
        import os

        user = os.getenv('RESIDENTIAL_PROXY_USER')
        password = os.getenv('RESIDENTIAL_PROXY_PASS')
        endpoint = os.getenv('RESIDENTIAL_PROXY_ENDPOINT')

        if not all([user, password, endpoint]):
            return {"success": False, "error": "Proxy credentials not configured"}

        # Test different formats
        formats_to_test = [
            f"http://{user}:{password}@{endpoint}",
            f"http://{user}-session-12345:{password}@{endpoint}",
            f"http://{user}-country-US:{password}@{endpoint}",
            f"http://{user}-session-12345-country-US:{password}@{endpoint}",
        ]

        results = []
        for i, proxy_url in enumerate(formats_to_test):
            try:
                response = requests.get(
                    'https://httpbin.org/ip',
                    proxies={'http': proxy_url, 'https': proxy_url},
                    timeout=10
                )
                result = {
                    "format": i + 1,
                    "proxy": proxy_url.replace(password, "***"),
                    "success": True,
                    "ip": response.json()
                }
            except Exception as e:
                result = {
                    "format": i + 1,
                    "proxy": proxy_url.replace(password, "***"),
                    "success": False,
                    "error": str(e)
                }
            results.append(result)

        return {
            "success": True,
            "server_ip": "208.77.246.56",
            "formats_tested": len(results),
            "results": results
        }
    except Exception as e:
        return {"success": False, "error": f"Proxy format test failed: {str(e)}"}

@app.post("/fallback-extract")
async def fallback_extract_endpoint(request: dict):
    """
    Fallback extraction using alternative methods when yt-dlp fails
    """
    try:
        url = request.get('url')
        if not url:
            return {"success": False, "error": "URL is required"}

        # Extract video ID from URL
        import re
        video_id_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
        if not video_id_match:
            return {"success": False, "error": "Could not extract video ID from URL"}

        video_id = video_id_match.group(1)

        # Try alternative extraction methods
        methods = [
            {
                'name': 'YouTube oEmbed API',
                'url': f'https://www.youtube.com/oembed?url={url}&format=json'
            },
            {
                'name': 'YouTube RSS Feed',
                'url': f'https://www.youtube.com/feeds/videos.xml?video_id={video_id}'
            }
        ]

        import aiohttp
        async with aiohttp.ClientSession() as session:
            for method in methods:
                try:
                    async with session.get(method['url']) as response:
                        if response.status == 200:
                            if 'oembed' in method['url']:
                                data = await response.json()
                                return {
                                    "success": True,
                                    "method": method['name'],
                                    "title": data.get('title', 'Unknown'),
                                    "author": data.get('author_name', 'Unknown'),
                                    "thumbnail": data.get('thumbnail_url', ''),
                                    "message": f"Extracted using {method['name']}"
                                }
                            else:
                                # RSS feed parsing would go here
                                return {
                                    "success": True,
                                    "method": method['name'],
                                    "message": f"RSS feed accessible for video {video_id}"
                                }
                except Exception as e:
                    print(f"Method {method['name']} failed: {str(e)}")
                    continue

        return {
            "success": False,
            "error": "All fallback methods failed",
            "video_id": video_id,
            "suggestion": "Try using a different video or check if the video is publicly accessible"
        }

    except Exception as e:
        return {"success": False, "error": f"Fallback extraction failed: {str(e)}"}

@app.post("/test-ytdlp")
async def test_ytdlp_endpoint(request: dict):
    """
    Test yt-dlp configuration and version
    """
    try:
        url = request.get('url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')

        import yt_dlp
        import subprocess

        # Get yt-dlp version
        version = yt_dlp.version.__version__

        # Test basic extraction with verbose output
        ydl_opts = {
            'quiet': False,
            'verbose': True,
            'extract_flat': False,
            'no_warnings': False,
            'extractor_args': {
                'youtube': {
                    'player_client': ['ios'],
                }
            },
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    return {
                        "success": True,
                        "yt_dlp_version": version,
                        "extraction_successful": True,
                        "title": info.get('title', 'Unknown'),
                        "duration": info.get('duration', 0),
                        "formats_count": len(info.get('formats', [])),
                        "extractor": info.get('extractor', 'Unknown'),
                        "extractor_key": info.get('extractor_key', 'Unknown'),
                    }
                else:
                    return {
                        "success": False,
                        "yt_dlp_version": version,
                        "extraction_successful": False,
                        "error": "No info extracted"
                    }
        except Exception as extract_error:
            return {
                "success": False,
                "yt_dlp_version": version,
                "extraction_successful": False,
                "error": str(extract_error),
                "error_type": type(extract_error).__name__
            }

    except Exception as e:
        return {"success": False, "error": f"Test failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)