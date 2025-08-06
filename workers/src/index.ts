import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { router } from './handlers/router';
import { ConversionService } from './utils/conversion-service';
import { QueueManager } from './utils/queue-manager';
import { getWebSocketManager } from './handlers/websocket';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: origin => {
      // Allow all localhost origins in development
      if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
        return origin;
      }
      // Allow production domains
      const allowedOrigins = [
        'https://getgoodtape.com',
        'https://www.getgoodtape.com',
      ];
      return allowedOrigins.includes(origin || '') ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT,
  });
});

// API routes
app.route('/api', router);

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
    },
    500
  );
});

// Queue processor for cron triggers
async function processQueue(env: Env): Promise<void> {
  console.log('Processing queue...');

  const queueManager = new QueueManager(env);
  const conversionService = new ConversionService(env);
  const wsManager = getWebSocketManager(env);

  // Set WebSocket manager for real-time updates
  conversionService.setWebSocketManager(wsManager);

  try {
    // Handle timeout jobs first
    await queueManager.handleTimeoutJobs();

    // Get capacity info
    const capacity = await queueManager.getCapacityInfo();
    console.log(
      `Queue capacity: ${capacity.availableSlots} available, ${capacity.queueLength} queued`
    );

    if (capacity.availableSlots > 0 && capacity.queueLength > 0) {
      // Get next jobs to process
      const jobs = await queueManager.getNextJobs(capacity.availableSlots);
      console.log(`Processing ${jobs.length} jobs`);

      // Process jobs concurrently
      const promises = jobs.map(async job => {
        try {
          console.log(`Starting job ${job.id}`);
          await conversionService.processConversion(job.id, {
            url: job.url,
            format: job.format as 'mp3' | 'mp4',
            quality: job.quality,
          });
          console.log(`Completed job ${job.id}`);
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
        }
      });

      await Promise.all(promises);
    }

    // Clean up old jobs
    await queueManager.cleanupOldJobs();

    // Clean up stale WebSocket connections
    wsManager.cleanupStaleConnections();
  } catch (error) {
    console.error('Queue processing error:', error);
  }
}

// Export the worker with scheduled event handler
export default {
  fetch: app.fetch,

  // Handle cron triggers
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(processQueue(env));
  },
};
