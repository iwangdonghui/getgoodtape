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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    duration: int  # in seconds
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

class ConversionProgress(BaseModel):
    percentage: float
    speed: Optional[str] = None
    eta: Optional[str] = None
    file_size: Optional[str] = None

class ConversionResult(BaseModel):
    success: bool
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    duration: Optional[int] = None
    format: Optional[str] = None
    quality: Optional[str] = None
    error: Optional[str] = None

class ConvertResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    result: Optional[ConversionResult] = None
    progress: Optional[ConversionProgress] = None
    error: Optional[str] = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify service status and dependencies
    """
    try:
        # Check if required dependencies are available
        ytdlp_info = check_ytdlp()
        ffmpeg_info = check_ffmpeg()
        dependencies = {
            "yt-dlp": ytdlp_info["available"],
            "yt-dlp-version": ytdlp_info["version"],
            "ffmpeg": ffmpeg_info["available"],
            "ffmpeg-version": ffmpeg_info["version"],
            "python": True
        }
        
        # Determine overall status
        all_healthy = dependencies["yt-dlp"] and dependencies["ffmpeg"] and dependencies["python"]
        status = "healthy" if all_healthy else "degraded"
        
        return HealthResponse(
            status=status,
            service="video-processor",
            version="1.0.0",
            dependencies=dependencies
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Health check failed")

def check_ytdlp() -> dict:
    """Check if yt-dlp is available and get version"""
    try:
        import yt_dlp
        version = yt_dlp.version.__version__
        return {"available": True, "version": version}
    except ImportError:
        return {"available": False, "version": "Not installed"}

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

async def extract_video_metadata(url: str) -> Dict[str, Any]:
    """
    Extract video metadata using yt-dlp
    """
    try:
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
                    'innertube_key': ['AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'],
                },
                'twitter': {
                    # Twitter/X specific settings
                    'api': ['syndication', 'legacy'],
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

        # Try multiple extraction methods
        extraction_methods = [
            # Method 1: Standard extraction
            ydl_opts,
            # Method 2: Android client only
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['android']}}},
            # Method 3: Web client with different headers
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['web']}},
             'http_headers': {**ydl_opts['http_headers'], 'User-Agent': 'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'}},
            # Method 4: iOS client
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['ios']}}},
        ]

        for i, opts in enumerate(extraction_methods):
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    if info:
                        print(f"✓ Extraction successful with method {i+1}")
                        break
            except Exception as e:
                last_error = e
                print(f"✗ Method {i+1} failed: {str(e)}")
                continue

        if not info:
            raise ValueError(f"Could not extract video information after trying all methods. Last error: {last_error}")

        return info

    except Exception as e:
        logger.error(f"Failed to extract metadata for {url}: {str(e)}")
        raise

def format_duration(seconds: int) -> str:
    """Format duration in seconds to human readable format"""
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

def validate_video_duration(duration: int, max_duration: int = 7200) -> Optional[str]:
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
            '128': {'bitrate': '128k', 'codec': 'libmp3lame'},
            '192': {'bitrate': '192k', 'codec': 'libmp3lame'},
            '320': {'bitrate': '320k', 'codec': 'libmp3lame'},
        }
        return quality_map.get(quality, quality_map['192'])

    elif format_type.lower() == 'mp4':
        quality_map = {
            '360': {'height': 360, 'codec': 'libx264', 'preset': 'fast'},
            '720': {'height': 720, 'codec': 'libx264', 'preset': 'fast'},
            '1080': {'height': 1080, 'codec': 'libx264', 'preset': 'fast'},
        }
        return quality_map.get(quality, quality_map['720'])

    return {}

async def convert_to_mp3(url: str, quality: str, output_path: str) -> ConversionResult:
    """
    Convert video to MP3 using yt-dlp and FFmpeg
    """
    try:
        import yt_dlp
        import tempfile
        import os

        # Get quality settings
        quality_settings = get_quality_settings('mp3', quality)
        bitrate = quality_settings.get('bitrate', '192k')

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Configure yt-dlp options for audio extraction
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality,
                }],
                'quiet': False,  # Enable output for debugging
                'no_warnings': False,
                # Enhanced anti-detection measures
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
            }

            # Download and convert
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Extract info first
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'audio')
                duration = info.get('duration', 0)

                # Download and convert
                ydl.download([url])

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
                        output_file = os.path.join(temp_dir, 'converted.mp3')

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

                return ConversionResult(
                    success=True,
                    file_path=output_path,
                    file_size=file_size,
                    duration=duration,
                    format='mp3',
                    quality=quality
                )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to convert to MP3: {error_msg}")

        return ConversionResult(
            success=False,
            error=f"MP3 conversion failed: {error_msg}"
        )

async def convert_to_mp4(url: str, quality: str, output_path: str) -> ConversionResult:
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
            ydl_opts = {
                'format': f'best[height<={height}]/best',
                'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegVideoConvertor',
                    'preferedformat': 'mp4',
                }],
                'quiet': True,
                'no_warnings': True,
                # Enhanced anti-detection measures
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
            }

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
                final_output = os.path.join(temp_dir, 'final_output.mp4')

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

                return ConversionResult(
                    success=True,
                    file_path=output_path,
                    file_size=file_size,
                    duration=duration,
                    format='mp4',
                    quality=quality
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

def estimate_file_size(duration: int, format_type: str, quality: str) -> int:
    """
    Estimate output file size based on duration, format, and quality
    """
    if format_type.lower() == 'mp3':
        # MP3 bitrate estimates (bytes per second)
        bitrate_map = {
            '128': 16000,  # 128 kbps ≈ 16 KB/s
            '192': 24000,  # 192 kbps ≈ 24 KB/s
            '320': 40000,  # 320 kbps ≈ 40 KB/s
        }
        bytes_per_second = bitrate_map.get(quality, 24000)
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

        # Return error response
        return MetadataResponse(
            success=False,
            error=f"Failed to extract video metadata: {error_msg}"
        )

@app.post("/convert", response_model=ConvertResponse)
async def convert_video_endpoint(request: ConvertRequest):
    """
    Convert video to specified format and quality
    """
    try:
        logger.info(f"Starting conversion: {request.url} -> {request.format} ({request.quality})")

        # First extract metadata to get duration for size estimation
        raw_info = await extract_video_metadata(request.url)
        metadata = process_metadata(raw_info)

        # Validate format and quality
        supported_formats = ['mp3', 'mp4']
        if request.format.lower() not in supported_formats:
            return ConvertResponse(
                success=False,
                error=f"Unsupported format: {request.format}. Supported formats: {', '.join(supported_formats)}"
            )

        # Estimate file size
        estimated_size = estimate_file_size(metadata.duration, request.format, request.quality)

        # Generate output filename
        safe_title = "".join(c for c in metadata.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title[:50]  # Limit length
        output_filename = f"{safe_title}.{request.format.lower()}"
        output_path = f"/tmp/{output_filename}"

        # Perform conversion based on format
        if request.format.lower() == 'mp3':
            result = await convert_to_mp3(request.url, request.quality, output_path)
        elif request.format.lower() == 'mp4':
            result = await convert_to_mp4(request.url, request.quality, output_path)
        else:
            return ConvertResponse(
                success=False,
                error=f"Unsupported format: {request.format}"
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
            "validate_conversion": "/validate-conversion",
            "test_convert": "/test-convert",
            "demo_convert": "/demo-convert",
            "demo_video_convert": "/demo-video-convert",
            "docs": "/docs"
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

@app.post("/youtube-bypass")
async def youtube_bypass_endpoint(request: dict):
    """
    Specialized YouTube bypass endpoint using multiple strategies including proxies
    """
    try:
        url = request.get('url')
        if not url:
            return {"success": False, "error": "URL is required"}

        import yt_dlp
        import random
        import time

        # Free proxy list (rotate through these)
        free_proxies = [
            None,  # No proxy first
            'http://proxy-server.scraperapi.com:8001',
            'http://rotating-residential.scraperapi.com:8001',
            'socks5://127.0.0.1:1080',  # Local SOCKS5 if available
        ]

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
                            'innertube_key': ['AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'],
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
                            'innertube_key': ['AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'],
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
                            'innertube_key': ['AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'],
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
            for proxy in free_proxies:
                try:
                    strategy_name = f"{strategy['name']}" + (f" + Proxy" if proxy else "")
                    print(f"Trying strategy: {strategy_name}")

                    # Add proxy to options if available
                    opts = strategy['opts'].copy()
                    if proxy:
                        opts['proxy'] = proxy

                    time.sleep(random.uniform(0.5, 2))  # Random delay

                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        if info:
                            return {
                                "success": True,
                                "strategy": strategy_name,
                                "title": info.get('title', 'Unknown'),
                                "duration": info.get('duration', 0),
                                "formats_available": len(info.get('formats', [])),
                                "message": f"Successfully bypassed using {strategy_name}",
                                "proxy_used": proxy is not None
                            }
                except Exception as e:
                    print(f"Strategy {strategy_name} failed: {str(e)}")
                    continue

        return {
            "success": False,
            "error": "All bypass strategies failed",
            "strategies_tried": [s['name'] for s in strategies]
        }

    except Exception as e:
        return {"success": False, "error": f"Bypass failed: {str(e)}"}

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