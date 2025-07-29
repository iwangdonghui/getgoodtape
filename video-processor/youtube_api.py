"""
YouTube Data API integration for enhanced video processing
"""
import os
import re
import aiohttp
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class YouTubeVideoInfo:
    """YouTube video information from API"""
    video_id: str
    title: str
    description: str
    duration: str  # ISO 8601 format (PT4M13S)
    duration_seconds: int
    channel_title: str
    published_at: str
    view_count: int
    like_count: Optional[int]
    thumbnail_url: str
    is_live: bool
    is_private: bool

class YouTubeAPI:
    """YouTube Data API v3 client"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('YOUTUBE_API_KEY')
        self.base_url = "https://www.googleapis.com/youtube/v3"
        
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
            r'youtube\.com/v/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def parse_duration(self, duration: str) -> int:
        """Convert ISO 8601 duration to seconds"""
        # PT4M13S -> 253 seconds
        import re
        
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration)
        
        if not match:
            return 0
            
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    async def get_video_info(self, video_id: str) -> Optional[YouTubeVideoInfo]:
        """Get video information using YouTube Data API"""
        if not self.api_key:
            logger.warning("YouTube API key not configured")
            return None
            
        url = f"{self.base_url}/videos"
        params = {
            'part': 'snippet,contentDetails,statistics,status',
            'id': video_id,
            'key': self.api_key
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"YouTube API error: {response.status}")
                        return None
                        
                    data = await response.json()
                    
                    if 'error' in data:
                        logger.error(f"YouTube API error: {data['error']}")
                        return None
                        
                    if not data.get('items'):
                        logger.warning(f"Video not found: {video_id}")
                        return None
                        
                    item = data['items'][0]
                    snippet = item['snippet']
                    content_details = item['contentDetails']
                    statistics = item.get('statistics', {})
                    status = item.get('status', {})
                    
                    # Check if video is available
                    if status.get('privacyStatus') == 'private':
                        logger.warning(f"Video is private: {video_id}")
                        return None
                        
                    duration_seconds = self.parse_duration(content_details['duration'])
                    
                    return YouTubeVideoInfo(
                        video_id=video_id,
                        title=snippet['title'],
                        description=snippet.get('description', ''),
                        duration=content_details['duration'],
                        duration_seconds=duration_seconds,
                        channel_title=snippet['channelTitle'],
                        published_at=snippet['publishedAt'],
                        view_count=int(statistics.get('viewCount', 0)),
                        like_count=int(statistics.get('likeCount', 0)) if statistics.get('likeCount') else None,
                        thumbnail_url=snippet['thumbnails']['high']['url'],
                        is_live=snippet.get('liveBroadcastContent') == 'live',
                        is_private=status.get('privacyStatus') == 'private'
                    )
                    
        except Exception as e:
            logger.error(f"Error fetching YouTube video info: {e}")
            return None
    
    async def validate_video_url(self, url: str) -> Dict[str, Any]:
        """Validate YouTube URL and return video information"""
        video_id = self.extract_video_id(url)
        if not video_id:
            return {
                'valid': False,
                'error': 'Invalid YouTube URL format'
            }
            
        video_info = await self.get_video_info(video_id)
        if not video_info:
            return {
                'valid': False,
                'error': 'Video not found, private, or API error'
            }
            
        return {
            'valid': True,
            'video_info': video_info,
            'metadata': {
                'title': video_info.title,
                'duration': video_info.duration_seconds,
                'uploader': video_info.channel_title,
                'view_count': video_info.view_count,
                'thumbnail': video_info.thumbnail_url
            }
        }

# Global instance
youtube_api = YouTubeAPI()

async def get_youtube_metadata_via_api(url: str) -> Optional[Dict[str, Any]]:
    """Get YouTube metadata using API as fallback"""
    result = await youtube_api.validate_video_url(url)
    if result['valid']:
        return result['metadata']
    return None
