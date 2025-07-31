import { useState, useEffect } from 'react';

interface ConversionProgressProps {
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  jobId?: string | null;
  estimatedTimeRemaining?: number;
  currentStep?: string;
  error?: string | null;
  queuePosition?: number;
}

export default function ConversionProgress({
  status,
  progress,
  jobId,
  estimatedTimeRemaining,
  currentStep,
  error,
  queuePosition,
}: ConversionProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Ensure progress is a valid number
      const validProgress =
        typeof progress === 'number' && !isNaN(progress) ? progress : 0;
      console.log(
        `🎯 ConversionProgress: progress=${progress}, validProgress=${validProgress}, status=${status}`
      );
      setAnimatedProgress(validProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress, status]);

  const getStatusInfo = () => {
    switch (status) {
      case 'queued':
        return {
          label: 'Queued',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⏳',
          description:
            'Your conversion task has been added to the queue, please wait...',
        };
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: '⚡',
          description: currentStep || 'Converting your video...',
        };
      case 'completed':
        return {
          label: 'Conversion Complete',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✅',
          description:
            'Conversion completed successfully! You can download the file now.',
        };
      case 'failed':
        return {
          label: 'Conversion Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '❌',
          description:
            error || 'An error occurred during conversion, please try again.',
        };
      default:
        return {
          label: 'Preparing',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '⚪',
          description: 'Preparing to start conversion...',
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressSteps = () => {
    const steps = [
      { label: 'Validating', threshold: 10 },
      { label: 'Extracting', threshold: 30 },
      { label: 'Converting', threshold: 50 },
      { label: 'Processing', threshold: 80 },
      { label: 'Complete', threshold: 100 },
    ];

    return steps.map((step, index) => ({
      ...step,
      isActive: animatedProgress >= step.threshold,
      isCurrent:
        animatedProgress >= step.threshold &&
        (index === steps.length - 1 ||
          animatedProgress < steps[index + 1].threshold),
    }));
  };

  if (status === 'idle') return null;

  return (
    <div
      className={`mt-6 p-6 rounded-xl border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{statusInfo.icon}</span>
          <div>
            <h3 className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </h3>
            <p className="text-sm text-gray-600">{statusInfo.description}</p>
          </div>
        </div>

        {/* Progress Percentage */}
        <div className={`text-2xl font-bold ${statusInfo.color}`}>
          {Math.round(animatedProgress || 0)}%
        </div>
      </div>

      {/* Progress Bar */}
      {status !== 'failed' && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                status === 'completed'
                  ? 'bg-gradient-to-r from-green-400 to-green-600'
                  : 'bg-gradient-to-r from-warm-orange to-tape-gold'
              }`}
              style={{ width: `${animatedProgress || 0}%` }}
            >
              {/* Animated shine effect */}
              {status === 'processing' && (
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      {status === 'processing' && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            {getProgressSteps().map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    step.isActive
                      ? step.isCurrent
                        ? 'bg-warm-orange text-white animate-pulse'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.isActive ? (step.isCurrent ? '⚡' : '✓') : index + 1}
                </div>
                <span
                  className={`text-xs mt-1 transition-colors duration-300 ${
                    step.isActive
                      ? 'text-deep-brown font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          {jobId && (
            <span
              className="font-mono bg-gray-100 px-2 py-1 rounded"
              title={jobId}
            >
              ID: {jobId.slice(-8)}
            </span>
          )}
          {jobId && (
            <span className="text-xs text-gray-400">Full ID: {jobId}</span>
          )}
          {estimatedTimeRemaining &&
            estimatedTimeRemaining > 0 &&
            status === 'processing' && (
              <span className="flex items-center space-x-1">
                <span>⏱️</span>
                <span>
                  Estimated remaining: {formatTime(estimatedTimeRemaining)}
                </span>
              </span>
            )}
        </div>

        {/* Live indicator */}
        {status === 'processing' && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs">Live updates</span>
          </div>
        )}
      </div>

      {/* Queue Position (if queued) */}
      {status === 'queued' && (
        <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              Your position in queue
            </span>
            <span className="font-semibold text-yellow-800">
              #{queuePosition || 'Calculating...'}
            </span>
          </div>
          <div className="mt-2 text-xs text-yellow-700">
            {queuePosition && queuePosition <= 3
              ? 'Starting soon'
              : queuePosition && queuePosition <= 10
                ? 'Estimated wait time: 2-5 minutes'
                : 'Estimated wait time: 5-10 minutes'}
          </div>
        </div>
      )}
    </div>
  );
}
