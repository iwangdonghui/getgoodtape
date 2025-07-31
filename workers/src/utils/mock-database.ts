// Mock database for local development when D1 is not available
import { ConversionJob, PlatformConfig } from '../types';

export class MockDatabase {
  private jobs: Map<string, ConversionJob> = new Map();
  private platforms: PlatformConfig[] = [
    {
      id: 1,
      name: 'YouTube',
      domain: 'youtube.com',
      supported_formats: JSON.stringify(['mp3', 'mp4']),
      max_duration: 7200,
      is_active: 1,
      config: JSON.stringify({
        extractor: 'youtube',
        quality_options: {
          mp3: ['128', '192', '320'],
          mp4: ['360', '720', '1080'],
        },
      }),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    },
    {
      id: 2,
      name: 'X (Twitter)',
      domain: 'x.com',
      supported_formats: JSON.stringify(['mp3', 'mp4']),
      max_duration: 1200,
      is_active: 1,
      config: JSON.stringify({
        extractor: 'twitter',
        quality_options: {
          mp3: ['128', '192'],
          mp4: ['360', '720'],
        },
      }),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    },
    {
      id: 2,
      name: 'X (Twitter)',
      domain: 'x.com',
      supported_formats: JSON.stringify(['mp3', 'mp4']),
      max_duration: 1200,
      is_active: 1,
      config: JSON.stringify({
        extractor: 'twitter',
        quality_options: {
          mp3: ['128', '192'],
          mp4: ['360', '720'],
        },
      }),
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    },
  ];

  async prepare(query: string) {
    return {
      bind: (...params: unknown[]) => ({
        all: async () => {
          if (query.includes('SELECT * FROM platforms')) {
            return { results: this.platforms };
          }
          if (query.includes('SELECT * FROM conversion_jobs WHERE id = ?')) {
            const jobId = params[0];
            const job = this.jobs.get(jobId);
            return { results: job ? [job] : [] };
          }
          return { results: [] };
        },
        first: async () => {
          if (query.includes('SELECT * FROM conversion_jobs WHERE id = ?')) {
            const jobId = params[0];
            return this.jobs.get(jobId) || null;
          }
          return null;
        },
        run: async () => {
          if (query.includes('INSERT INTO conversion_jobs')) {
            const jobId = params[0];
            const job = {
              id: jobId,
              url: params[1],
              platform: params[2],
              format: params[3],
              quality: params[4],
              status: 'queued',
              progress: 0,
              download_url: null,
              file_path: null,
              metadata: null,
              error_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
            };
            this.jobs.set(jobId, job);
            return { success: true };
          }
          if (query.includes('UPDATE conversion_jobs')) {
            const jobId = params[params.length - 1]; // Last parameter is usually the ID
            const job = this.jobs.get(jobId);
            if (job) {
              if (query.includes('status = ?')) {
                job.status = params[0];
                job.updated_at = new Date().toISOString();
              }
              if (query.includes('progress = ?')) {
                job.progress = params[0];
                job.updated_at = new Date().toISOString();
              }
              this.jobs.set(jobId, job);
            }
            return { success: true };
          }
          return { success: true };
        },
      }),
    };
  }

  // Direct methods for easier access
  async getJob(jobId: string) {
    return this.jobs.get(jobId) || null;
  }

  async createJob(
    jobId: string,
    url: string,
    platform: string,
    format: 'mp3' | 'mp4',
    quality: string
  ) {
    const job = {
      id: jobId,
      url,
      platform,
      format,
      quality,
      status: 'queued',
      progress: 0,
      download_url: null,
      file_path: null,
      metadata: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  async updateJob(jobId: string, updates: Partial<ConversionJob>) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates, { updated_at: new Date().toISOString() });
      this.jobs.set(jobId, job);
    }
    return job;
  }

  async getPlatforms() {
    return this.platforms;
  }
}

// Global instance for persistence across requests
let globalMockDb: MockDatabase | null = null;

export function getGlobalMockDatabase(): MockDatabase {
  if (!globalMockDb) {
    globalMockDb = new MockDatabase();
  }
  return globalMockDb;
}
