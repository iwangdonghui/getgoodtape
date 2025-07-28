import { Env } from '../types';
import { StorageManager } from './storage';
import { QueueManager } from './queue-manager';

export interface CleanupConfig {
  maxFileAge: number; // in milliseconds
  maxStorageSize: number; // in bytes
  cleanupInterval: number; // in milliseconds
  batchSize: number;
}

export interface CleanupStats {
  filesDeleted: number;
  bytesFreed: number;
  jobsExpired: number;
  lastCleanup: number;
  nextCleanup: number;
}

export class FileCleanupService {
  private env: Env;
  private storage: StorageManager;
  private queueManager: QueueManager;
  private config: CleanupConfig;
  private isRunning: boolean = false;
  private cleanupTimer?: number;
  private stats: CleanupStats;

  constructor(env: Env, config: Partial<CleanupConfig> = {}) {
    this.env = env;
    this.storage = new StorageManager(env);
    this.queueManager = new QueueManager(env);

    this.config = {
      maxFileAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
      cleanupInterval: 6 * 60 * 60 * 1000, // 6 hours
      batchSize: 100,
      ...config,
    };

    this.stats = {
      filesDeleted: 0,
      bytesFreed: 0,
      jobsExpired: 0,
      lastCleanup: 0,
      nextCleanup: Date.now() + this.config.cleanupInterval,
    };
  }

  /**
   * Start the cleanup service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('File cleanup service is already running');
      return;
    }

    console.log('Starting file cleanup service...');
    this.isRunning = true;

    // Run initial cleanup
    await this.performCleanup();

    // Schedule periodic cleanup
    this.scheduleNextCleanup();
  }

  /**
   * Stop the cleanup service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('File cleanup service is not running');
      return;
    }

    console.log('Stopping file cleanup service...');
    this.isRunning = false;

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Perform manual cleanup
   */
  async performCleanup(): Promise<CleanupStats> {
    const startTime = Date.now();
    console.log('Starting file cleanup...');

    try {
      // Clean up expired jobs first
      const expiredJobs = await this.queueManager.cleanupOldJobs(
        this.config.maxFileAge / (60 * 60 * 1000) // Convert to hours
      );

      // Clean up old files
      const deletedFiles = await this.storage.cleanupOldFiles(
        this.config.maxFileAge
      );

      // Update stats
      this.stats.jobsExpired += expiredJobs;
      this.stats.filesDeleted += deletedFiles;
      this.stats.lastCleanup = startTime;
      this.stats.nextCleanup = startTime + this.config.cleanupInterval;

      const duration = Date.now() - startTime;
      console.log(
        `Cleanup completed in ${duration}ms: ${expiredJobs} jobs expired, ${deletedFiles} files deleted`
      );

      return this.getStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Clean up files by size limit
   */
  async cleanupBySize(): Promise<number> {
    if (!this.env.STORAGE) {
      console.warn('R2 storage not available for size-based cleanup');
      return 0;
    }

    try {
      const files = await this.storage.listFiles();
      let totalSize = 0;
      const fileInfos: Array<{ key: string; size: number; uploaded: Date }> =
        [];

      // Get file metadata
      for (const key of files) {
        const fileName = key.replace('conversions/', '');
        const metadata = await this.storage.getFileMetadata(fileName);
        if (metadata) {
          fileInfos.push({
            key,
            size: metadata.size as number,
            uploaded: new Date(metadata.lastModified as string),
          });
          totalSize += metadata.size as number;
        }
      }

      if (totalSize <= this.config.maxStorageSize) {
        console.log(`Storage size (${totalSize} bytes) is within limit`);
        return 0;
      }

      // Sort by upload date (oldest first)
      fileInfos.sort((a, b) => a.uploaded.getTime() - b.uploaded.getTime());

      let deletedCount = 0;
      let freedBytes = 0;

      // Delete oldest files until we're under the size limit
      for (const fileInfo of fileInfos) {
        if (totalSize - freedBytes <= this.config.maxStorageSize) {
          break;
        }

        const fileName = fileInfo.key.replace('conversions/', '');
        const deleted = await this.storage.deleteFile(fileName);

        if (deleted) {
          deletedCount++;
          freedBytes += fileInfo.size;
          console.log(`Deleted ${fileName} (${fileInfo.size} bytes)`);
        }
      }

      this.stats.filesDeleted += deletedCount;
      this.stats.bytesFreed += freedBytes;

      console.log(
        `Size-based cleanup: deleted ${deletedCount} files, freed ${freedBytes} bytes`
      );
      return deletedCount;
    } catch (error) {
      console.error('Error during size-based cleanup:', error);
      return 0;
    }
  }

  /**
   * Clean up orphaned files (files without corresponding jobs)
   */
  async cleanupOrphanedFiles(): Promise<number> {
    if (!this.env.STORAGE || !this.env.DB) {
      console.warn(
        'Storage or database not available for orphaned file cleanup'
      );
      return 0;
    }

    try {
      const files = await this.storage.listFiles();
      let deletedCount = 0;

      for (const key of files) {
        const fileName = key.replace('conversions/', '');

        // Check if there's a corresponding job
        const job = await this.env.DB.prepare(
          `
          SELECT id FROM conversion_jobs 
          WHERE file_path LIKE ? OR download_url LIKE ?
        `
        )
          .bind(`%${fileName}%`, `%${fileName}%`)
          .first();

        if (!job) {
          // No corresponding job found, delete the file
          const deleted = await this.storage.deleteFile(fileName);
          if (deleted) {
            deletedCount++;
            console.log(`Deleted orphaned file: ${fileName}`);
          }
        }
      }

      this.stats.filesDeleted += deletedCount;
      console.log(`Orphaned file cleanup: deleted ${deletedCount} files`);
      return deletedCount;
    } catch (error) {
      console.error('Error during orphaned file cleanup:', error);
      return 0;
    }
  }

  /**
   * Schedule the next cleanup
   */
  private scheduleNextCleanup(): void {
    if (!this.isRunning) return;

    this.cleanupTimer = setTimeout(() => {
      this.performCleanup()
        .catch(error => {
          console.error('Error in scheduled cleanup:', error);
        })
        .finally(() => {
          this.scheduleNextCleanup();
        });
    }, this.config.cleanupInterval) as unknown as number;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    if (!this.env.STORAGE) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }

    try {
      const files = await this.storage.listFiles();
      let totalSize = 0;
      let oldestFile: Date | null = null;
      let newestFile: Date | null = null;

      for (const key of files) {
        const fileName = key.replace('conversions/', '');
        const metadata = await this.storage.getFileMetadata(fileName);

        if (metadata) {
          totalSize += metadata.size as number;
          const uploadDate = new Date(metadata.lastModified as string);

          if (!oldestFile || uploadDate < oldestFile) {
            oldestFile = uploadDate;
          }
          if (!newestFile || uploadDate > newestFile) {
            newestFile = uploadDate;
          }
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }
  }
}
