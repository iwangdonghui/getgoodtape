'use client';

import { useEffect, useState } from 'react';

interface ConversionProgressProps {
  status: 'validating' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  jobId?: string;
  estimatedTimeRemaining?: number;
  queuePosition?: number;
  currentStep?: string;
  isConnected?: boolean;
}

export default function ConversionProgressWebSocket({
  status,
  progress,
  jobId,
  estimatedTimeRemaining,
  queuePosition,
  currentStep,
  isConnected = false,
}: ConversionProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(progress);
  const [isAnimating, setIsAnimating] = useState(false);

  // Smooth progress animation
  useEffect(() => {
    if (progress !== displayProgress) {
      setIsAnimating(true);
      const startProgress = displayProgress;
      const targetProgress = progress;
      const duration = 500; // 500ms animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - ratio, 3);
        const currentProgress =
          startProgress + (targetProgress - startProgress) * easeOutCubic;

        setDisplayProgress(currentProgress);

        if (ratio < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [progress, displayProgress]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'validating':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'validating':
        return 'Validating...';
      case 'queued':
        return queuePosition ? `Queued (Position: ${queuePosition})` : 'Queued';
      case 'processing':
        return currentStep || 'Processing...';
      case 'completed':
        return 'Completed!';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border">
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Conversion Progress
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Real-time' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Job ID */}
      {jobId && (
        <div className="mb-3">
          <span className="text-xs text-gray-500">Job ID: </span>
          <span className="text-xs font-mono text-gray-700">{jobId}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {Math.round(displayProgress)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${getStatusColor()} ${
              isAnimating ? 'transition-all duration-500' : ''
            }`}
            style={{
              width: `${Math.min(displayProgress, 100)}%`,
              boxShadow:
                displayProgress > 0
                  ? '0 0 10px rgba(59, 130, 246, 0.5)'
                  : 'none',
            }}
          />
        </div>
      </div>

      {/* Current Step */}
      {currentStep && status === 'processing' && (
        <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Current step:</span> {currentStep}
          </p>
        </div>
      )}

      {/* Queue Information */}
      {status === 'queued' && queuePosition && (
        <div className="mb-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Queue position:</span> {queuePosition}
          </p>
          {estimatedTimeRemaining && (
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Estimated wait:</span>{' '}
              {formatTime(estimatedTimeRemaining)}
            </p>
          )}
        </div>
      )}

      {/* Processing Information */}
      {status === 'processing' && estimatedTimeRemaining && (
        <div className="mb-3 p-2 bg-green-50 rounded border-l-4 border-green-400">
          <p className="text-sm text-green-800">
            <span className="font-medium">Estimated time remaining:</span>{' '}
            {formatTime(estimatedTimeRemaining)}
          </p>
        </div>
      )}

      {/* Progress Stages */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              displayProgress >= 20
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            ✓ Metadata extracted
          </span>
          <span className="text-gray-400">20%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              displayProgress >= 40
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            ✓ Conversion started
          </span>
          <span className="text-gray-400">40%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              displayProgress >= 80
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            ✓ Processing completed
          </span>
          <span className="text-gray-400">80%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              displayProgress >= 95
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            ✓ File uploaded
          </span>
          <span className="text-gray-400">95%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              displayProgress >= 100
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            ✓ Ready for download
          </span>
          <span className="text-gray-400">100%</span>
        </div>
      </div>

      {/* Real-time indicator */}
      {isConnected && status === 'processing' && (
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Real-time updates active</span>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!isConnected && status === 'processing' && (
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span>Checking status...</span>
          </div>
        </div>
      )}
    </div>
  );
}
