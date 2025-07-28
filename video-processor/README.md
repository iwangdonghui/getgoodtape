# GetGoodTape Video Processor

FastAPI-based video processing service for converting videos from various platforms to MP3/MP4 formats.

## Features

- Health check endpoint with dependency verification
- FastAPI with automatic API documentation
- Docker support for easy deployment
- yt-dlp integration for video downloading
- FFmpeg integration for video/audio conversion

## Dependencies

- Python 3.11+
- FFmpeg
- yt-dlp

## Development

### Local Setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Install FFmpeg:

- macOS: `brew install ffmpeg`
- Ubuntu/Debian: `sudo apt-get install ffmpeg`
- Windows: Download from https://ffmpeg.org/download.html

3. Run development server:

```bash
python dev.py
```

The server will be available at http://localhost:8000 with API docs at http://localhost:8000/docs

### Docker Development

1. Build the Docker image:

```bash
docker build -t getgoodtape-processor .
```

2. Run the container:

```bash
docker run -p 8000:8000 getgoodtape-processor
```

## API Endpoints

- `GET /` - Root endpoint with service information
- `GET /health` - Health check with dependency status
- `GET /docs` - Interactive API documentation

## Deployment

This service is designed to be deployed on Railway with the following configuration:

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Dockerfile
3. Set environment variables as needed
4. Deploy

The service will automatically bind to the PORT environment variable provided by Railway.

## Health Check

The `/health` endpoint returns:

- Service status (healthy/degraded)
- Dependency status (yt-dlp, ffmpeg, python)
- Service version information

Example response:

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
