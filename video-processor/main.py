"""
GetGoodTape Video Processing Service
FastAPI application for handling video conversion tasks
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging

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
        import subprocess
        result = subprocess.run(
            ["ffmpeg", "-version"], 
            capture_output=True, 
            text=True, 
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        return False

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "GetGoodTape Video Processing Service",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)