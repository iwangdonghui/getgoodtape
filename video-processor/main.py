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

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify service status and dependencies
    """
    try:
        # Check if required dependencies are available
        dependencies = {
            "yt-dlp": check_ytdlp(),
            "ffmpeg": check_ffmpeg(),
            "python": True
        }
        
        # Determine overall status
        all_healthy = all(dependencies.values())
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

def check_ytdlp() -> bool:
    """Check if yt-dlp is available"""
    try:
        import yt_dlp
        return True
    except ImportError:
        return False

def check_ffmpeg() -> bool:
    """Check if FFmpeg is available"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        return False

async def extract_video_metadata(url: str) -> Dict[str, Any]:
    """
    Extract video metadata using yt-dlp
    """
    try:
        # Import yt-dlp
        import yt_dlp

        # Configure yt-dlp options
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'writeinfojson': False,
            'writethumbnail': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
        }

        # Extract metadata
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            if not info:
                raise ValueError("Could not extract video information")

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
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)