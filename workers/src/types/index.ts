/**
 * Type definitions for GetGoodTape API
 */

// Database Models
export type ConversionStatus = 'queued' | 'processing' | 'completed' | 'failed';
export interface ConversionJob {
  id: string;
  url: string;
  platform: string;
  format: 'mp3' | 'mp4';
  quality: string;
  status: ConversionStatus;
  progress: number;
  file_path?: string;
  download_url?: string;
  download_expires_at?: number; // 🚀 NEW: Download URL expiration timestamp
  r2_key?: string; // 🚀 NEW: R2 storage key for direct access
  metadata?: string; // JSON string
  error_message?: string;
  created_at: number;
  updated_at: number;
  expires_at: number;
}

export interface PlatformConfig {
  id: number;
  name: string;
  domain: string;
  supported_formats: string; // JSON array string
  max_duration: number;
  is_active: number; // SQLite boolean (0 or 1)
  config?: string; // JSON string
  created_at: number;
  updated_at: number;
}

export interface UsageStats {
  id: number;
  date: string; // ISO date string (YYYY-MM-DD)
  platform: string;
  format: 'mp3' | 'mp4';
  total_conversions: number;
  successful_conversions: number;
  total_duration: number;
  created_at: number;
  updated_at: number;
}

// API Types

export interface ConvertRequest {
  url: string;
  format: 'mp3' | 'mp4';
  quality: string;
  platform?: string;
  // 🚀 NEW: File flow optimization fields
  upload_url?: string;
  upload_key?: string;
  content_type?: string;
}

export interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail?: string;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  description?: string;
  tags?: string[];
}

export interface ConvertResponse {
  jobId: string;
  status: ConversionStatus;
  progress: number;
  downloadUrl?: string;
  metadata?: VideoMetadata;
  error?: string;
}

export interface StatusResponse {
  jobId: string;
  status: ConversionStatus;
  progress: number;
  downloadUrl?: string;
  metadata?: VideoMetadata;
  error?: string;
}

export interface PlatformsResponse {
  platforms: Platform[];
}

export interface Platform {
  name: string;
  domain: string;
  supportedFormats: string[];
  maxDuration: number;
  icon: string;
  qualityOptions: {
    mp3?: string[];
    mp4?: string[];
  };
}

export interface ConversionResult {
  downloadUrl: string;
  filename: string;
  fileSize: number;
  format: string;
  quality: string;
  duration: number;
  expiresAt: string;
}

export enum ErrorType {
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  VIDEO_TOO_LONG = 'VIDEO_TOO_LONG',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  ACCESS_DENIED = 'ACCESS_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_WARNING = 'VALIDATION_WARNING',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: unknown;
  retryable: boolean;
}

// Cloudflare Environment Types
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  STORAGE: R2Bucket;

  // KV Cache
  CACHE: KVNamespace;
  VALIDATION_CACHE: KVNamespace;

  // Environment variables
  ENVIRONMENT: 'development' | 'production';
  PROCESSING_SERVICE_URL?: string;
  YOUTUBE_API_KEY?: string;
}
