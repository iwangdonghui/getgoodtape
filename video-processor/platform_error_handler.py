"""
Platform-Specific Error Handling for Video Processor
Provides comprehensive error classification and recovery strategies
for different video platforms (YouTube, Twitter/X, TikTok, Instagram, etc.)
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class ErrorType(Enum):
    ACCESS_DENIED = "ACCESS_DENIED"
    VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND"
    VIDEO_TOO_LONG = "VIDEO_TOO_LONG"
    NETWORK_ERROR = "NETWORK_ERROR"
    CONVERSION_FAILED = "CONVERSION_FAILED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    SERVER_ERROR = "SERVER_ERROR"
    UNSUPPORTED_PLATFORM = "UNSUPPORTED_PLATFORM"

class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class PlatformErrorClassification:
    error_type: ErrorType
    platform: str
    severity: Severity
    retryable: bool
    max_retries: int
    backoff_strategy: str  # 'linear' or 'exponential'
    fallback_actions: List[str]
    user_message: str
    technical_message: str
    suggestion: Optional[str] = None
    alert_required: bool = False
    estimated_recovery_time: Optional[int] = None  # in seconds

@dataclass
class PlatformErrorPattern:
    platform: str
    patterns: List[re.Pattern]
    classification: PlatformErrorClassification

class PlatformErrorHandler:
    """Handles platform-specific error classification and recovery strategies"""
    
    # Platform-specific error patterns
    ERROR_PATTERNS = [
        # YouTube Error Patterns
        PlatformErrorPattern(
            platform='youtube',
            patterns=[
                re.compile(r'sign in to confirm', re.IGNORECASE),
                re.compile(r'this video is not available', re.IGNORECASE),
                re.compile(r'video unavailable', re.IGNORECASE),
                re.compile(r'private video', re.IGNORECASE),
                re.compile(r'members-only content', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.ACCESS_DENIED,
                platform='youtube',
                severity=Severity.HIGH,
                retryable=False,
                max_retries=0,
                backoff_strategy='linear',
                fallback_actions=[],
                user_message='This YouTube video requires sign-in or is private. Please use a public video.',
                technical_message='YouTube access denied - video requires authentication',
                suggestion='Try using a different public YouTube video, or use videos from other platforms like Twitter/X or TikTok.',
                alert_required=False,
                estimated_recovery_time=0
            )
        ),
        PlatformErrorPattern(
            platform='youtube',
            patterns=[
                re.compile(r'anti-bot', re.IGNORECASE),
                re.compile(r'bot detection', re.IGNORECASE),
                re.compile(r'too many requests', re.IGNORECASE),
                re.compile(r'rate limit', re.IGNORECASE),
                re.compile(r'temporarily restricted', re.IGNORECASE),
                re.compile(r'access from your location', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.ACCESS_DENIED,
                platform='youtube',
                severity=Severity.MEDIUM,
                retryable=True,
                max_retries=3,
                backoff_strategy='exponential',
                fallback_actions=['use_proxy', 'try_alternative_client', 'wait_and_retry'],
                user_message='YouTube has temporarily restricted access. Trying alternative methods...',
                technical_message='YouTube anti-bot detection triggered',
                suggestion='This is a temporary YouTube restriction. Try again in a few minutes, or use videos from other platforms.',
                alert_required=False,
                estimated_recovery_time=300  # 5 minutes
            )
        ),
        PlatformErrorPattern(
            platform='youtube',
            patterns=[
                re.compile(r'video too long', re.IGNORECASE),
                re.compile(r'duration exceeds', re.IGNORECASE),
                re.compile(r'maximum length', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.VIDEO_TOO_LONG,
                platform='youtube',
                severity=Severity.MEDIUM,
                retryable=False,
                max_retries=0,
                backoff_strategy='linear',
                fallback_actions=['suggest_shorter_video'],
                user_message='This video is too long for conversion. Please use a shorter video.',
                technical_message='Video duration exceeds maximum allowed length',
                suggestion='Try using videos shorter than 10 minutes, or use audio-only format (MP3) for longer videos.',
                alert_required=False
            )
        ),
        
        # Twitter/X Error Patterns
        PlatformErrorPattern(
            platform='twitter',
            patterns=[
                re.compile(r'tweet not found', re.IGNORECASE),
                re.compile(r'this tweet is unavailable', re.IGNORECASE),
                re.compile(r'protected tweets', re.IGNORECASE),
                re.compile(r'account suspended', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.VIDEO_NOT_FOUND,
                platform='twitter',
                severity=Severity.HIGH,
                retryable=False,
                max_retries=0,
                backoff_strategy='linear',
                fallback_actions=[],
                user_message='This tweet is not available or has been deleted.',
                technical_message='Twitter content not accessible',
                suggestion='Please check if the tweet exists and is public. Try using a different tweet.',
                alert_required=False
            )
        ),
        PlatformErrorPattern(
            platform='twitter',
            patterns=[
                re.compile(r'rate limit exceeded', re.IGNORECASE),
                re.compile(r'too many requests', re.IGNORECASE),
                re.compile(r'api limit', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.RATE_LIMIT_EXCEEDED,
                platform='twitter',
                severity=Severity.LOW,
                retryable=True,
                max_retries=5,
                backoff_strategy='exponential',
                fallback_actions=['wait_and_retry', 'use_alternative_api'],
                user_message='Twitter rate limit reached. Waiting before retry...',
                technical_message='Twitter API rate limit exceeded',
                suggestion='Please wait a moment and try again. Twitter limits how many requests we can make.',
                alert_required=False,
                estimated_recovery_time=900  # 15 minutes
            )
        ),
        
        # TikTok Error Patterns
        PlatformErrorPattern(
            platform='tiktok',
            patterns=[
                re.compile(r'video not available', re.IGNORECASE),
                re.compile(r'content not found', re.IGNORECASE),
                re.compile(r'private account', re.IGNORECASE),
                re.compile(r'region blocked', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.VIDEO_NOT_FOUND,
                platform='tiktok',
                severity=Severity.MEDIUM,
                retryable=True,
                max_retries=2,
                backoff_strategy='linear',
                fallback_actions=['try_alternative_region', 'use_proxy'],
                user_message='This TikTok video is not available. Trying alternative access methods...',
                technical_message='TikTok content access restricted',
                suggestion='The video might be region-restricted or from a private account. Try using a different TikTok video.',
                alert_required=False
            )
        ),
        
        # Instagram Error Patterns
        PlatformErrorPattern(
            platform='instagram',
            patterns=[
                re.compile(r'login required', re.IGNORECASE),
                re.compile(r'private account', re.IGNORECASE),
                re.compile(r'content not available', re.IGNORECASE),
                re.compile(r'post not found', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.ACCESS_DENIED,
                platform='instagram',
                severity=Severity.MEDIUM,
                retryable=True,
                max_retries=2,
                backoff_strategy='linear',
                fallback_actions=['try_alternative_method'],
                user_message='This Instagram content requires login or is private. Trying alternative methods...',
                technical_message='Instagram access restricted',
                suggestion='Make sure the Instagram post is public. Private posts cannot be converted.',
                alert_required=False
            )
        ),
        
        # Generic Network Errors
        PlatformErrorPattern(
            platform='generic',
            patterns=[
                re.compile(r'network error', re.IGNORECASE),
                re.compile(r'connection timeout', re.IGNORECASE),
                re.compile(r'connection refused', re.IGNORECASE),
                re.compile(r'dns resolution failed', re.IGNORECASE),
                re.compile(r'ssl error', re.IGNORECASE),
                re.compile(r'certificate error', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.NETWORK_ERROR,
                platform='generic',
                severity=Severity.MEDIUM,
                retryable=True,
                max_retries=3,
                backoff_strategy='exponential',
                fallback_actions=['retry_with_backoff', 'use_alternative_dns'],
                user_message='Network connection issue. Retrying with different settings...',
                technical_message='Network connectivity problem',
                suggestion='This appears to be a temporary network issue. Please try again in a moment.',
                alert_required=False,
                estimated_recovery_time=60
            )
        ),
        
        # Generic Conversion Errors
        PlatformErrorPattern(
            platform='generic',
            patterns=[
                re.compile(r'conversion failed', re.IGNORECASE),
                re.compile(r'encoding error', re.IGNORECASE),
                re.compile(r'ffmpeg error', re.IGNORECASE),
                re.compile(r'format not supported', re.IGNORECASE)
            ],
            classification=PlatformErrorClassification(
                error_type=ErrorType.CONVERSION_FAILED,
                platform='generic',
                severity=Severity.MEDIUM,
                retryable=True,
                max_retries=2,
                backoff_strategy='linear',
                fallback_actions=['try_different_format', 'reduce_quality'],
                user_message='Conversion failed. Trying with different settings...',
                technical_message='Video conversion process failed',
                suggestion='Try selecting a different quality or format option.',
                alert_required=False
            )
        )
    ]
    
    # Platform reliability scores (0-100)
    PLATFORM_RELIABILITY = {
        'youtube': 45,      # Lower due to restrictions
        'twitter': 85,      # High reliability
        'tiktok': 80,       # Good reliability
        'instagram': 75,    # Good reliability
        'facebook': 60,     # Medium reliability
        'vimeo': 90,        # Very high reliability
        'generic': 70       # Default medium-high
    }
    
    # Platforms currently experiencing issues
    DEGRADED_PLATFORMS = {'youtube'}  # YouTube frequently restricted
    
    @classmethod
    def detect_platform_from_url(cls, url: str) -> str:
        """Detect platform from URL"""
        url_lower = url.lower()
        
        if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
            return 'youtube'
        elif 'twitter.com' in url_lower or 'x.com' in url_lower:
            return 'twitter'
        elif 'tiktok.com' in url_lower:
            return 'tiktok'
        elif 'instagram.com' in url_lower:
            return 'instagram'
        elif 'facebook.com' in url_lower or 'fb.watch' in url_lower:
            return 'facebook'
        elif 'vimeo.com' in url_lower:
            return 'vimeo'
        elif 'dailymotion.com' in url_lower:
            return 'dailymotion'
        
        return 'generic'
    
    @classmethod
    def classify_error(cls, error_message: str, platform: str = None, url: str = None) -> PlatformErrorClassification:
        """Classify an error based on platform and error message"""
        detected_platform = platform or cls.detect_platform_from_url(url or '')
        
        # Find matching error pattern
        for pattern in cls.ERROR_PATTERNS:
            if pattern.platform == detected_platform or pattern.platform == 'generic':
                for regex in pattern.patterns:
                    if regex.search(error_message):
                        # Update platform in classification
                        classification = pattern.classification
                        classification.platform = detected_platform
                        return classification
        
        # Default classification for unknown errors
        return PlatformErrorClassification(
            error_type=ErrorType.SERVER_ERROR,
            platform=detected_platform,
            severity=Severity.MEDIUM,
            retryable=True,
            max_retries=2,
            backoff_strategy='linear',
            fallback_actions=['retry_with_backoff'],
            user_message='An unexpected error occurred. Retrying...',
            technical_message=f'Unclassified error: {error_message}',
            suggestion='Please try again. If the problem persists, try using a different video.',
            alert_required=False
        )
    
    @classmethod
    def get_recovery_suggestions(cls, platform: str, error_type: ErrorType) -> List[str]:
        """Get platform-specific recovery suggestions"""
        suggestions = []
        
        if platform == 'youtube':
            if error_type == ErrorType.ACCESS_DENIED:
                suggestions.extend([
                    'Try using a different YouTube video that is publicly accessible',
                    'Use videos from other platforms like Twitter/X, TikTok, or Instagram',
                    'Wait a few minutes and try again - YouTube restrictions are often temporary'
                ])
            elif error_type == ErrorType.VIDEO_TOO_LONG:
                suggestions.extend([
                    'Use videos shorter than 10 minutes',
                    'Try converting to MP3 format for longer videos',
                    'Look for shorter clips or highlights of the same content'
                ])
        elif platform == 'twitter':
            suggestions.extend([
                'Make sure the tweet is public and not from a protected account',
                'Check if the tweet contains video content',
                'Try using the direct video URL if available'
            ])
        elif platform == 'tiktok':
            suggestions.extend([
                'Ensure the TikTok video is from a public account',
                'Try using a different TikTok video',
                'Check if the video is available in your region'
            ])
        elif platform == 'instagram':
            suggestions.extend([
                'Make sure the Instagram post is public',
                'Try using Instagram Reels or IGTV links',
                'Verify the post contains video content'
            ])
        else:
            suggestions.extend([
                'Try again in a few minutes',
                'Check your internet connection',
                'Use a different video URL'
            ])
        
        return suggestions
    
    @classmethod
    def get_user_friendly_message(cls, classification: PlatformErrorClassification, include_recovery_time: bool = True) -> str:
        """Get platform-specific user-friendly error message"""
        message = classification.user_message
        
        if include_recovery_time and classification.estimated_recovery_time:
            minutes = (classification.estimated_recovery_time + 59) // 60  # Round up
            message += f" (Estimated recovery time: {minutes} minute{'s' if minutes > 1 else ''})"
        
        if classification.suggestion:
            message += f"\n\nSuggestion: {classification.suggestion}"
        
        return message
    
    @classmethod
    def should_use_fallback(cls, classification: PlatformErrorClassification) -> bool:
        """Determine if error should trigger fallback strategy"""
        return classification.retryable and len(classification.fallback_actions) > 0
    
    @classmethod
    def get_platform_reliability_score(cls, platform: str) -> int:
        """Get platform reliability score (0-100)"""
        return cls.PLATFORM_RELIABILITY.get(platform, 70)
    
    @classmethod
    def is_platform_degraded(cls, platform: str) -> bool:
        """Check if platform is currently experiencing known issues"""
        return platform in cls.DEGRADED_PLATFORMS
    
    @classmethod
    def log_error_classification(cls, classification: PlatformErrorClassification, url: str = None):
        """Log error classification for monitoring"""
        logger.info(f"Error classified: {classification.error_type.value} "
                   f"(platform: {classification.platform}, severity: {classification.severity.value})")
        
        if classification.alert_required:
            logger.error(f"ALERT REQUIRED: Critical error on platform {classification.platform}")
        
        if url:
            logger.debug(f"Error URL: {url}")
        
        logger.debug(f"Technical message: {classification.technical_message}")
        
        if classification.fallback_actions:
            logger.info(f"Available fallback actions: {', '.join(classification.fallback_actions)}")

def handle_platform_error(error_message: str, url: str = None, platform: str = None) -> Dict:
    """
    Main function to handle platform-specific errors
    Returns a dictionary with error classification and response data
    """
    try:
        # Classify the error
        classification = PlatformErrorHandler.classify_error(error_message, platform, url)
        
        # Log the classification
        PlatformErrorHandler.log_error_classification(classification, url)
        
        # Get recovery suggestions
        recovery_suggestions = PlatformErrorHandler.get_recovery_suggestions(
            classification.platform, classification.error_type
        )
        
        # Get user-friendly message
        user_message = PlatformErrorHandler.get_user_friendly_message(classification, True)
        
        # Get platform info
        reliability_score = PlatformErrorHandler.get_platform_reliability_score(classification.platform)
        is_degraded = PlatformErrorHandler.is_platform_degraded(classification.platform)
        should_fallback = PlatformErrorHandler.should_use_fallback(classification)
        
        return {
            'success': False,
            'error': user_message,
            'error_classification': {
                'type': classification.error_type.value,
                'platform': classification.platform,
                'severity': classification.severity.value,
                'retryable': classification.retryable,
                'max_retries': classification.max_retries,
                'backoff_strategy': classification.backoff_strategy,
                'fallback_actions': classification.fallback_actions,
                'technical_message': classification.technical_message,
                'suggestion': classification.suggestion,
                'estimated_recovery_time': classification.estimated_recovery_time,
                'alert_required': classification.alert_required
            },
            'platform_info': {
                'reliability_score': reliability_score,
                'is_degraded': is_degraded,
                'should_use_fallback': should_fallback
            },
            'recovery_suggestions': recovery_suggestions
        }
        
    except Exception as e:
        logger.error(f"Error in platform error handler: {e}")
        return {
            'success': False,
            'error': 'An unexpected error occurred while processing your request.',
            'error_classification': {
                'type': ErrorType.SERVER_ERROR.value,
                'platform': 'generic',
                'severity': Severity.MEDIUM.value,
                'retryable': True,
                'max_retries': 2
            },
            'recovery_suggestions': ['Please try again in a few minutes']
        }