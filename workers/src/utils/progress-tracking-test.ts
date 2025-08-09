/**
 * Progress Tracking System Test
 * Tests the core progress tracking functionality to ensure jobs don't get stuck at 0%
 */

import { ConversionService } from './conversion-service';
import { JobManager } from './job-manager';
import { DatabaseManager } from './database';
import { Env } from '../types';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class ProgressTrackingTest {
  private env: Env;
  private conversionService: ConversionService;
  private jobManager: JobManager;
  private dbManager: DatabaseManager;

  constructor(env: Env) {
    this.env = env;
    this.conversionService = new ConversionService(env);
    this.jobManager = new JobManager(env);
    this.dbManager = new DatabaseManager(env);
  }

  /**
   * Run comprehensive progress tracking tests
   */
  async runTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('🧪 Starting Progress Tracking System Tests...');

    // Test 1: Basic progress update functionality
    results.push(await this.testBasicProgressUpdate());

    // Test 2: Progress update atomicity
    results.push(await this.testProgressUpdateAtomicity());

    // Test 3: WebSocket notification system
    results.push(await this.testWebSocketNotifications());

    // Test 4: Stuck job detection and recovery
    results.push(await this.testStuckJobRecovery());

    // Test 5: Database persistence verification
    results.push(await this.testDatabasePersistence());

    // Test 6: Error handling during progress updates
    results.push(await this.testProgressUpdateErrorHandling());

    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log(`🧪 Progress Tracking Tests Complete: ${passedTests}/${totalTests} passed`);

    return results;
  }

  /**
   * Test 1: Basic progress update functionality
   */
  private async testBasicProgressUpdate(): Promise<TestResult> {
    try {
      console.log('🧪 Test 1: Basic progress update functionality');

      // Create a test job
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/video',
        'test',
        'mp3',
        'high'
      );

      // Test progress updates from 0 to 100
      const progressSteps = [10, 25, 50, 75, 90, 100];
      
      for (const progress of progressSteps) {
        await this.jobManager.updateProgress(jobId, progress);
        
        // Verify the update was persisted
        const job = await this.jobManager.getJob(jobId);
        if (!job || job.progress !== progress) {
          return {
            success: false,
            message: `Progress update failed at ${progress}%`,
            details: { expected: progress, actual: job?.progress }
          };
        }
        
        // Small delay to simulate real processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        success: true,
        message: 'Basic progress update functionality works correctly'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Basic progress update test failed',
        details: error
      };
    }
  }

  /**
   * Test 2: Progress update atomicity
   */
  private async testProgressUpdateAtomicity(): Promise<TestResult> {
    try {
      console.log('🧪 Test 2: Progress update atomicity');

      // Create a test job
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/atomic-test',
        'test',
        'mp4',
        'medium'
      );

      // Start processing to lock the job
      const lockAcquired = await this.jobManager.startProcessing(jobId);
      if (!lockAcquired) {
        return {
          success: false,
          message: 'Failed to acquire job lock for atomicity test'
        };
      }

      // Simulate concurrent progress updates
      const concurrentUpdates = [30, 35, 40, 45, 50];
      const updatePromises = concurrentUpdates.map(progress => 
        this.jobManager.updateProgress(jobId, progress)
      );

      await Promise.all(updatePromises);

      // Verify final state is consistent
      const job = await this.jobManager.getJob(jobId);
      if (!job) {
        return {
          success: false,
          message: 'Job not found after concurrent updates'
        };
      }

      // Progress should be one of the update values (atomicity preserved)
      const isValidProgress = concurrentUpdates.includes(job.progress);
      
      return {
        success: isValidProgress,
        message: isValidProgress 
          ? 'Progress update atomicity maintained'
          : 'Progress update atomicity violated',
        details: { finalProgress: job.progress, expectedValues: concurrentUpdates }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Progress update atomicity test failed',
        details: error
      };
    }
  }

  /**
   * Test 3: WebSocket notification system
   */
  private async testWebSocketNotifications(): Promise<TestResult> {
    try {
      console.log('🧪 Test 3: WebSocket notification system');

      // Create a mock WebSocket manager
      let notificationReceived = false;
      let lastProgress = 0;

      const mockWsManager = {
        sendProgressUpdate: (jobId: string, progress: number, status: string, additionalData?: any) => {
          notificationReceived = true;
          lastProgress = progress;
          console.log(`📤 Mock WebSocket: Progress ${progress}% for job ${jobId}`);
        }
      };

      // Set the mock WebSocket manager
      this.conversionService.setWebSocketManager(mockWsManager);

      // Create a test job
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/websocket-test',
        'test',
        'mp3',
        'high'
      );

      // Trigger a progress update through the conversion service
      await (this.conversionService as any).updateProgressWithNotification(
        jobId, 
        60, 
        'processing', 
        { currentStep: 'Testing WebSocket notifications' }
      );

      return {
        success: notificationReceived && lastProgress === 60,
        message: notificationReceived 
          ? 'WebSocket notifications working correctly'
          : 'WebSocket notifications not received',
        details: { notificationReceived, lastProgress }
      };

    } catch (error) {
      return {
        success: false,
        message: 'WebSocket notification test failed',
        details: error
      };
    }
  }

  /**
   * Test 4: Stuck job detection and recovery
   */
  private async testStuckJobRecovery(): Promise<TestResult> {
    try {
      console.log('🧪 Test 4: Stuck job detection and recovery');

      // Create a test job and simulate it getting stuck
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/stuck-test',
        'test',
        'mp4',
        'high'
      );

      // Start processing and set progress to simulate a stuck job
      await this.jobManager.startProcessing(jobId);
      await this.jobManager.updateProgress(jobId, 25);

      // Manually set the updated_at timestamp to simulate a stuck job
      const oldTimestamp = Date.now() - (15 * 60 * 1000); // 15 minutes ago
      await this.dbManager.updateConversionJob(jobId, {
        updated_at: oldTimestamp
      });

      // Run stuck job detection
      const recoveredCount = await this.jobManager.detectAndRecoverStuckJobs();

      // Verify the job was recovered
      const job = await this.jobManager.getJob(jobId);
      const wasRecovered = job && (job.status === 'failed' || job.status === 'queued');

      return {
        success: recoveredCount > 0 && Boolean(wasRecovered),
        message: wasRecovered 
          ? 'Stuck job detection and recovery working correctly'
          : 'Stuck job was not recovered',
        details: { recoveredCount, jobStatus: job?.status }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Stuck job recovery test failed',
        details: error
      };
    }
  }

  /**
   * Test 5: Database persistence verification
   */
  private async testDatabasePersistence(): Promise<TestResult> {
    try {
      console.log('🧪 Test 5: Database persistence verification');

      // Create a test job
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/persistence-test',
        'test',
        'mp3',
        'medium'
      );

      // Update progress multiple times
      const progressUpdates = [15, 30, 45, 60, 75, 90];
      
      for (const progress of progressUpdates) {
        await this.jobManager.updateProgress(jobId, progress);
        
        // Verify persistence by reading from database directly
        const job = await this.dbManager.getConversionJob(jobId);
        if (!job || job.progress !== progress) {
          return {
            success: false,
            message: `Database persistence failed at ${progress}%`,
            details: { expected: progress, actual: job?.progress }
          };
        }
      }

      return {
        success: true,
        message: 'Database persistence working correctly'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Database persistence test failed',
        details: error
      };
    }
  }

  /**
   * Test 6: Error handling during progress updates
   */
  private async testProgressUpdateErrorHandling(): Promise<TestResult> {
    try {
      console.log('🧪 Test 6: Error handling during progress updates');

      // Create a test job
      const jobId = await this.jobManager.createJob(
        'https://test.example.com/error-handling-test',
        'test',
        'mp4',
        'low'
      );

      // Test invalid progress values
      const invalidProgressValues = [-10, 150, NaN, Infinity];
      
      for (const invalidProgress of invalidProgressValues) {
        try {
          await this.jobManager.updateProgress(jobId, invalidProgress);
          
          // Verify the progress was clamped to valid range
          const job = await this.jobManager.getJob(jobId);
          if (!job) {
            return {
              success: false,
              message: 'Job not found after invalid progress update'
            };
          }
          
          // Progress should be clamped between 0 and 100
          if (job.progress < 0 || job.progress > 100) {
            return {
              success: false,
              message: `Invalid progress not handled correctly: ${job.progress}`,
              details: { invalidInput: invalidProgress, result: job.progress }
            };
          }
          
        } catch (error) {
          // Some errors are expected for invalid inputs
          console.log(`Expected error for invalid progress ${invalidProgress}:`, error);
        }
      }

      return {
        success: true,
        message: 'Error handling during progress updates working correctly'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Progress update error handling test failed',
        details: error
      };
    }
  }

  /**
   * Generate test report
   */
  generateReport(results: TestResult[]): string {
    const passedTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    let report = '\n🧪 Progress Tracking System Test Report\n';
    report += '='.repeat(50) + '\n\n';
    
    report += `✅ Passed: ${passedTests.length}\n`;
    report += `❌ Failed: ${failedTests.length}\n`;
    report += `📊 Total: ${results.length}\n\n`;
    
    if (failedTests.length > 0) {
      report += '❌ Failed Tests:\n';
      failedTests.forEach((test, index) => {
        report += `${index + 1}. ${test.message}\n`;
        if (test.details) {
          report += `   Details: ${JSON.stringify(test.details, null, 2)}\n`;
        }
      });
      report += '\n';
    }
    
    report += '✅ Passed Tests:\n';
    passedTests.forEach((test, index) => {
      report += `${index + 1}. ${test.message}\n`;
    });
    
    return report;
  }
}

/**
 * Run progress tracking tests
 */
export async function runProgressTrackingTests(env: Env): Promise<void> {
  const tester = new ProgressTrackingTest(env);
  const results = await tester.runTests();
  const report = tester.generateReport(results);
  
  console.log(report);
  
  // Return success/failure status
  const allPassed = results.every(r => r.success);
  if (!allPassed) {
    throw new Error('Some progress tracking tests failed');
  }
}