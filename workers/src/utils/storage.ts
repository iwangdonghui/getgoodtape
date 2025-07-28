import { Env } from '../types';

export class StorageManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    fileName: string,
    filePath: string,
    contentType: string
  ): Promise<string> {
    try {
      // For now, we'll simulate file upload since we can't directly access
      // the file system from the processing service in Workers
      // In a real implementation, the processing service would upload directly to R2
      // or return the file content for us to upload

      const key = `conversions/${fileName}`;

      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        // Return a simulated download URL for development
        return `https://storage.getgoodtape.com/${key}`;
      }

      // TODO: Implement actual R2 upload
      // const object = await this.env.STORAGE.put(key, fileContent, {
      //   httpMetadata: {
      //     contentType: this.getContentType(contentType),
      //   },
      // });

      console.log(
        `Simulated upload: ${fileName} from ${filePath} (${contentType})`
      );

      // Generate download URL
      const downloadUrl = await this.generateDownloadUrl(fileName);

      return downloadUrl;
    } catch (error) {
      console.error('Storage upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }

  /**
   * Upload file content directly to R2
   */
  async uploadFileContent(
    fileName: string,
    content: ArrayBuffer | Uint8Array | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      if (!this.env.STORAGE) {
        throw new Error('R2 storage not available');
      }

      const key = `conversions/${fileName}`;

      const object = await this.env.STORAGE.put(key, content, {
        httpMetadata: {
          contentType: this.getContentType(contentType),
          cacheControl: 'public, max-age=31536000', // 1 year
        },
        customMetadata: {
          uploadedAt: Date.now().toString(),
          ...metadata,
        },
      });

      if (!object) {
        throw new Error('Failed to upload file to R2');
      }

      const contentSize =
        content instanceof ArrayBuffer
          ? content.byteLength
          : content instanceof Uint8Array
            ? content.length
            : content.length;
      console.log(
        `Successfully uploaded ${fileName} to R2 (${contentSize} bytes)`
      );

      // Generate download URL
      return await this.generateDownloadUrl(fileName);
    } catch (error) {
      console.error('Storage upload content error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file content: ${errorMessage}`);
    }
  }

  /**
   * Get a file from R2 storage
   */
  async getFile(fileName: string): Promise<Response | null> {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return null;
      }

      const key = `conversions/${fileName}`;
      const object = await this.env.STORAGE.get(key);

      if (!object) {
        return null;
      }

      return new Response(object.body, {
        headers: {
          'Content-Type':
            object.httpMetadata?.contentType || 'application/octet-stream',
          'Content-Length': object.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  /**
   * Delete a file from R2 storage
   */
  async deleteFile(fileName: string): Promise<boolean> {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return false;
      }

      const key = `conversions/${fileName}`;
      await this.env.STORAGE.delete(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }

  /**
   * Generate a signed download URL
   */
  async generateDownloadUrl(
    fileName: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // For now, return a simple URL
    // In production, implement proper signed URLs with expiration
    const key = `conversions/${fileName}`;
    console.log(
      `Generated download URL for ${fileName}, expires in ${expiresIn}s`
    );
    return `https://storage.getgoodtape.com/${key}`;
  }

  /**
   * Get content type based on file format
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      wav: 'audio/wav',
      webm: 'video/webm',
    };

    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * List files in storage (for cleanup/monitoring)
   */
  async listFiles(prefix: string = 'conversions/'): Promise<string[]> {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return [];
      }

      const objects = await this.env.STORAGE.list({ prefix });
      return objects.objects.map(obj => obj.key);
    } catch (error) {
      console.error('Storage list error:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(
    fileName: string
  ): Promise<Record<string, unknown> | null> {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return null;
      }

      const key = `conversions/${fileName}`;
      const object = await this.env.STORAGE.head(key);

      if (!object) {
        return null;
      }

      return {
        size: object.size,
        lastModified: object.uploaded,
        contentType: object.httpMetadata?.contentType,
        etag: object.etag,
      };
    } catch (error) {
      console.error('Storage metadata error:', error);
      return null;
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      if (!this.env.STORAGE) {
        console.warn('R2 storage not available in development environment');
        return 0;
      }

      const objects = await this.env.STORAGE.list({ prefix: 'conversions/' });
      const now = Date.now();
      let deletedCount = 0;

      for (const object of objects.objects) {
        const uploadTime = new Date(object.uploaded).getTime();
        if (now - uploadTime > maxAge) {
          await this.env.STORAGE.delete(object.key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Storage cleanup error:', error);
      return 0;
    }
  }
}
