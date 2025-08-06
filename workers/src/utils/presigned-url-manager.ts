import { Env } from '../types';
import { AwsClient } from 'aws4fetch';

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  fields?: Record<string, string>;
  expiresIn: number;
}

export interface PresignedDownloadUrl {
  downloadUrl: string;
  key: string;
  expiresIn: number;
}

export class PresignedUrlManager {
  private env: Env;
  private awsClient: AwsClient | null = null;

  constructor(env: Env) {
    this.env = env;
    this.initializeAwsClient();
  }

  /**
   * Initialize AWS client for S3-compatible operations
   */
  private initializeAwsClient() {
    // For now, we'll use a mock implementation since we don't have R2 credentials in development
    // In production, this would use actual R2 credentials
    if (this.env.ENVIRONMENT === 'development') {
      console.log('🔧 Using mock AWS client for development');
      this.awsClient = null; // Will use mock implementation
    } else {
      // In production, initialize with actual R2 credentials
      // This would need to be configured with proper R2 API tokens
      this.awsClient = null; // TODO: Implement with real credentials
    }
  }

  /**
   * Generate presigned URL for uploading files directly to R2
   */
  async generateUploadUrl(
    fileName: string,
    contentType: string,
    _metadata?: Record<string, string>
  ): Promise<PresignedUploadUrl> {
    if (!this.env.STORAGE) {
      throw new Error('R2 storage not configured');
    }

    try {
      // Generate unique key for the file
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const key = `converted/${timestamp}_${randomSuffix}_${fileName}`;

      // Set expiration time (1 hour)
      const expiresIn = 3600; // 1 hour in seconds

      // For development, create a mock presigned URL
      // In production, this would use aws4fetch with proper R2 credentials
      let uploadUrl: string;

      if (this.env.ENVIRONMENT === 'development') {
        // Mock URL for development testing
        uploadUrl = `https://mock-r2-upload.example.com/${key}?expires=${expiresIn}&contentType=${encodeURIComponent(contentType)}`;
        console.log(`🔧 Generated mock presigned upload URL for: ${key}`);
      } else {
        // TODO: In production, use aws4fetch to generate real presigned URLs
        // For now, we'll return a placeholder that indicates the feature is not fully implemented
        uploadUrl = `https://production-r2-upload.example.com/${key}?expires=${expiresIn}`;
        console.log(`⚠️ Generated placeholder presigned upload URL for: ${key} (TODO: implement with aws4fetch)`);
      }

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      console.error('Failed to generate presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned URL for downloading files from R2
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<PresignedDownloadUrl> {
    if (!this.env.STORAGE) {
      throw new Error('R2 storage not configured');
    }

    try {
      // For development, create a mock presigned URL
      // In production, this would use aws4fetch with proper R2 credentials
      let downloadUrl: string;

      if (this.env.ENVIRONMENT === 'development') {
        // Mock URL for development testing
        downloadUrl = `https://mock-r2-download.example.com/${key}?expires=${expiresIn}`;
        console.log(`🔧 Generated mock presigned download URL for: ${key}`);
      } else {
        // TODO: In production, use aws4fetch to generate real presigned URLs
        // For now, we'll return a placeholder
        downloadUrl = `https://production-r2-download.example.com/${key}?expires=${expiresIn}`;
        console.log(`⚠️ Generated placeholder presigned download URL for: ${key} (TODO: implement with aws4fetch)`);
      }

      return {
        downloadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      console.error('Failed to generate presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Verify that a file exists in R2 storage
   */
  async verifyFileExists(key: string): Promise<boolean> {
    if (!this.env.STORAGE) {
      return false;
    }

    try {
      const object = await this.env.STORAGE.head(key);
      return object !== null;
    } catch (error) {
      console.error(`Failed to verify file existence for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get file metadata from R2
   */
  async getFileMetadata(key: string): Promise<Record<string, string> | null> {
    if (!this.env.STORAGE) {
      return null;
    }

    try {
      const object = await this.env.STORAGE.head(key);
      if (!object) {
        return null;
      }

      // Extract custom metadata
      const metadata: Record<string, string> = {};
      
      if (object.customMetadata) {
        for (const [key, value] of Object.entries(object.customMetadata)) {
          metadata[key] = value;
        }
      }

      // Add standard metadata
      metadata.size = object.size?.toString() || '0';
      metadata.lastModified = object.uploaded?.toISOString() || '';
      metadata.contentType = object.httpMetadata?.contentType || '';

      return metadata;
    } catch (error) {
      console.error(`Failed to get file metadata for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Generate filename with proper extension
   */
  generateFileName(title: string, format: string): string {
    // Clean title for filename
    const cleanTitle = title
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length

    const timestamp = Date.now();
    const extension = format.toLowerCase();
    
    return `${cleanTitle}_${timestamp}.${extension}`;
  }

  /**
   * Extract filename from R2 key
   */
  extractFilenameFromKey(key: string): string {
    const parts = key.split('/');
    const filename = parts[parts.length - 1];
    
    // Remove timestamp and random suffix if present
    const match = filename.match(/^\d+_[a-z0-9]+_(.+)$/);
    return match ? match[1] : filename;
  }

  /**
   * Clean up expired upload URLs (for monitoring)
   */
  async cleanupExpiredUploads(): Promise<number> {
    // This would typically be implemented with a database to track
    // pending uploads and clean them up after expiration
    // For now, we'll return 0 as a placeholder
    console.log('🧹 Cleanup expired uploads (placeholder)');
    return 0;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    recentUploads: number;
  }> {
    if (!this.env.STORAGE) {
      return { totalFiles: 0, totalSize: 0, recentUploads: 0 };
    }

    try {
      // List objects in the converted/ prefix
      const objects = await this.env.STORAGE.list({
        prefix: 'converted/',
        limit: 1000, // Adjust as needed
      });

      let totalSize = 0;
      let recentUploads = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const object of objects.objects) {
        totalSize += object.size || 0;
        
        if (object.uploaded && object.uploaded.getTime() > oneDayAgo) {
          recentUploads++;
        }
      }

      return {
        totalFiles: objects.objects.length,
        totalSize,
        recentUploads,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { totalFiles: 0, totalSize: 0, recentUploads: 0 };
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
