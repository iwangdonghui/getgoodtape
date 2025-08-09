# Job State Management System

This document describes the robust job state management system implemented to prevent race conditions, handle stuck jobs, and ensure reliable job processing.

## Overview

The job state management system consists of several components working together:

1. **JobStateManager** - Core state management with atomic operations
2. **JobManager** - Enhanced job management with state integration
3. **JobCleanupService** - Automated cleanup and recovery
4. **Admin API** - Monitoring and manual intervention endpoints

## Key Features

### 1. Race Condition Prevention

The system uses atomic database operations and distributed locking to prevent race conditions:

```typescript
// Acquire lock before processing
const lockResult = await jobManager.startProcessing(jobId);
if (!lockResult.success) {
  // Another instance is already processing this job
  return;
}

// Process with lock protection
const lockId = lockResult.lockId;
// ... perform processing ...

// Complete job and release lock
await jobManager.completeJob(
  jobId,
  downloadUrl,
  filePath,
  metadata,
  r2Key,
  expiresAt,
  lockId
);
```

### 2. Job Locking Mechanism

Jobs are locked using a distributed locking mechanism with KV storage:

- **Lock Acquisition**: Only one instance can acquire a lock for a job
- **Lock Expiration**: Locks automatically expire after 15 minutes
- **Lock Extension**: Long-running operations can extend locks
- **Lock Release**: Locks are released when jobs complete or fail

### 3. Stuck Job Detection and Recovery

The system automatically detects and recovers stuck jobs:

- **Detection**: Jobs with no updates for 10+ minutes are considered stuck
- **Recovery Actions**:
  - Jobs at 0% progress are reset to queued
  - Jobs with progress are marked as failed with helpful error messages
- **Lock Respect**: Jobs with active locks are not considered stuck

### 4. State Validation and Cleanup

Comprehensive validation ensures job state consistency:

- **Progress Validation**: Ensures progress values are between 0-100
- **Status Consistency**: Validates status transitions are logical
- **Data Integrity**: Checks for missing required fields
- **Automatic Fixes**: Corrects common inconsistencies

## Usage Examples

### Basic Job Processing

```typescript
import { JobManager } from './utils/job-manager';

const jobManager = new JobManager(env);

// Start processing with robust locking
const lockResult = await jobManager.startProcessing(jobId);
if (!lockResult.success) {
  console.log('Job already being processed');
  return;
}

const lockId = lockResult.lockId;

try {
  // Update progress safely
  await jobManager.updateProgress(jobId, 25);

  // Extend lock if needed for long operations
  await jobManager.extendJobLock(jobId, lockId, 10 * 60 * 1000); // 10 more minutes

  // Complete job
  await jobManager.completeJob(
    jobId,
    downloadUrl,
    filePath,
    metadata,
    r2Key,
    expiresAt,
    lockId
  );
} catch (error) {
  // Fail job and release lock
  await jobManager.failJob(jobId, error.message, lockId);
}
```

### Manual Job Recovery

```typescript
// Detect and recover stuck jobs
const recoveredCount = await jobManager.detectAndRecoverStuckJobs();
console.log(`Recovered ${recoveredCount} stuck jobs`);

// Validate specific job
const validation = await jobManager.validateJobState(jobId);
if (!validation.isValid) {
  console.log('Job has issues:', validation.issues);
}

// Force job state transition
await jobManager.transitionJobState(
  jobId,
  'processing',
  'failed',
  {
    error_message: 'Manually failed due to system maintenance',
  },
  'Admin intervention'
);
```

### Cleanup Service

```typescript
import { JobCleanupService } from './utils/job-cleanup-service';

const cleanupService = new JobCleanupService(env);

// Start automatic cleanup scheduler
cleanupService.startScheduler();

// Force immediate cleanup
const report = await cleanupService.forceCleanup();
console.log('Cleanup report:', report);
```

## Admin API Endpoints

The system provides admin endpoints for monitoring and manual intervention:

### GET /admin/job-management/stats

Get comprehensive job statistics:

```json
{
  "success": true,
  "data": {
    "totalJobs": 1250,
    "byStatus": {
      "queued": 15,
      "processing": 8,
      "completed": 1200,
      "failed": 27
    },
    "stuckJobs": 2,
    "lockedJobs": 5,
    "averageProcessingTime": 145,
    "oldestProcessingJob": {
      "id": "job_123",
      "age": 300,
      "progress": 75
    }
  }
}
```

### GET /admin/job-management/health

Get system health information:

```json
{
  "success": true,
  "data": {
    "database": { "status": "healthy", "totalJobs": 1250 },
    "cache": { "status": "healthy" },
    "storage": { "status": "healthy" },
    "cleanupStatus": {
      "running": false,
      "timeSinceLastCleanup": 180000
    }
  }
}
```

### POST /admin/job-management/cleanup

Force immediate cleanup:

```json
{
  "success": true,
  "data": {
    "timestamp": 1640995200000,
    "stuckJobsRecovered": 3,
    "expiredJobsDeleted": 15,
    "expiredLocksCleared": 2,
    "validationIssuesFixed": 1,
    "totalProcessingTime": 1250,
    "errors": []
  }
}
```

### POST /admin/job-management/force-fail

Manually fail a job:

```bash
curl -X POST /admin/job-management/force-fail \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "job_123", "reason": "Manual intervention required"}'
```

### POST /admin/job-management/force-reset

Reset a job to queued state:

```bash
curl -X POST /admin/job-management/force-reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "job_123", "reason": "Retry after system fix"}'
```

## Configuration

### Environment Variables

- `ADMIN_TOKEN` - Required for admin API access
- `ENVIRONMENT` - Set to 'development' for mock database usage

### Timeouts and Intervals

```typescript
// JobStateManager configuration
private readonly LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes
private readonly STUCK_JOB_THRESHOLD = 10 * 60 * 1000; // 10 minutes
private readonly MAX_PROCESSING_TIME = 30 * 60 * 1000; // 30 minutes

// JobCleanupService configuration
private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
private readonly MIN_CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Stuck Jobs**: Jobs with no progress for 10+ minutes
2. **Lock Contention**: High number of failed lock acquisitions
3. **Processing Time**: Average time jobs spend in processing state
4. **Cleanup Frequency**: How often cleanup runs and what it finds
5. **Validation Issues**: Frequency of job state inconsistencies

### Alert Conditions

- More than 5 stuck jobs detected
- More than 20 jobs in processing state
- Average processing time exceeds 10 minutes
- Cleanup finds more than 10 issues per run
- Database or cache health checks fail

## Best Practices

### For Developers

1. **Always Use Locking**: Use `startProcessing()` before job processing
2. **Handle Lock Failures**: Gracefully handle cases where locks can't be acquired
3. **Release Locks**: Always release locks in finally blocks or error handlers
4. **Extend Long Operations**: Extend locks for operations taking longer than 15 minutes
5. **Validate Before Processing**: Use `validateJobState()` for critical operations

### For Operations

1. **Monitor Regularly**: Check job statistics and health endpoints regularly
2. **Set Up Alerts**: Configure alerts for key metrics and error conditions
3. **Regular Cleanup**: Ensure cleanup service is running and effective
4. **Manual Intervention**: Use admin endpoints for stuck or problematic jobs
5. **Capacity Planning**: Monitor processing times and queue lengths

## Troubleshooting

### Common Issues

1. **Jobs Stuck in Processing**
   - Check if cleanup service is running
   - Look for expired locks in KV storage
   - Manually recover using admin API

2. **High Lock Contention**
   - Check for duplicate job processing attempts
   - Verify queue management is working correctly
   - Consider increasing lock timeout for long operations

3. **Validation Failures**
   - Check database schema consistency
   - Look for data corruption or migration issues
   - Use admin API to inspect specific jobs

4. **Cleanup Not Running**
   - Verify cleanup service is started
   - Check for errors in cleanup logs
   - Manually trigger cleanup via admin API

### Debug Commands

```bash
# Get job statistics
curl -H "Authorization: Bearer $ADMIN_TOKEN" /admin/job-management/stats

# Check system health
curl -H "Authorization: Bearer $ADMIN_TOKEN" /admin/job-management/health

# Validate specific job
curl -H "Authorization: Bearer $ADMIN_TOKEN" /admin/job-management/validate-job?jobId=job_123

# Force cleanup
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" /admin/job-management/cleanup

# Recover stuck jobs
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" /admin/job-management/recover-stuck
```

## Testing

The system includes comprehensive tests covering:

- Lock acquisition and release
- Race condition prevention
- State transition validation
- Stuck job detection and recovery
- Cleanup operations
- Integration scenarios

Run tests with:

```bash
npm test job-state-manager.test.ts
```

## Migration Guide

To migrate existing code to use the new job state management:

1. **Update Job Processing**:

   ```typescript
   // Old way
   await jobManager.updateJob(jobId, { status: 'processing' });

   // New way
   const lockResult = await jobManager.startProcessing(jobId);
   if (!lockResult.success) return;
   ```

2. **Update Job Completion**:

   ```typescript
   // Old way
   await jobManager.completeJob(jobId, downloadUrl, filePath);

   // New way
   await jobManager.completeJob(
     jobId,
     downloadUrl,
     filePath,
     metadata,
     r2Key,
     expiresAt,
     lockId
   );
   ```

3. **Add Cleanup Service**:

   ```typescript
   // In your worker initialization
   const cleanupService = new JobCleanupService(env);
   cleanupService.startScheduler();
   ```

4. **Add Admin Routes**:
   ```typescript
   // In your router
   import { createJobManagementRoutes } from './routes/admin/job-management';
   const jobManagementRoutes = createJobManagementRoutes(env);
   ```
