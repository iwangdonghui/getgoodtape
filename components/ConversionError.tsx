import { useState, memo } from 'react';

interface ConversionErrorProps {
  error: string;
  canRetry: boolean;
  retryCount: number;
  maxRetries?: number;
  onRetry: () => void;
  onReset: () => void;
  jobId?: string | null;
}

const ConversionError = memo(function ConversionError({
  error,
  canRetry,
  retryCount,
  maxRetries = 3,
  onRetry,
  onReset,
  jobId,
}: ConversionErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorType = (errorMessage: string) => {
    const message = errorMessage.toLowerCase();

    if (message.includes('network') || message.includes('连接')) {
      return {
        type: 'network',
        icon: '🌐',
        title: 'Network Connection Error',
        description:
          'Unable to connect to server, please check your network connection',
        suggestions: [
          'Check if your network connection is working',
          'Try refreshing the page',
          'If the problem persists, please try again later',
        ],
      };
    }

    if (
      message.includes('url') ||
      message.includes('链接') ||
      message.includes('invalid')
    ) {
      return {
        type: 'url',
        icon: '🔗',
        title: 'URL Link Error',
        description: 'The provided video link is invalid or inaccessible',
        suggestions: [
          'Confirm the video link is correct',
          'Check if the video is publicly accessible',
          'Try using a different video link',
          'Make sure the link is from a supported platform',
        ],
      };
    }

    if (message.includes('timeout') || message.includes('超时')) {
      return {
        type: 'timeout',
        icon: '⏰',
        title: 'Processing Timeout',
        description:
          'Conversion process took too long and was automatically stopped',
        suggestions: [
          'Video might be too long or too large',
          'Try converting a shorter video',
          'Select lower quality settings',
          'Try again later, server might be busy',
        ],
      };
    }

    if (message.includes('format') || message.includes('格式')) {
      return {
        type: 'format',
        icon: '📁',
        title: 'Format Not Supported',
        description: 'Video format is not supported or conversion failed',
        suggestions: [
          'Try using a different video source',
          'Check if the video is corrupted',
          'Try a different output format',
        ],
      };
    }

    if (
      message.includes('quota') ||
      message.includes('limit') ||
      message.includes('限制')
    ) {
      return {
        type: 'quota',
        icon: '🚫',
        title: 'Service Limit',
        description: 'Service usage limit has been reached',
        suggestions: [
          'Please try again later',
          'Server might be under maintenance',
          'Contact support team for assistance',
        ],
      };
    }

    // Default error type
    return {
      type: 'unknown',
      icon: '❌',
      title: 'Conversion Failed',
      description: 'An unknown error occurred during conversion',
      suggestions: [
        'Please retry the conversion',
        'If the problem persists, contact support',
        'Try using a different video link',
      ],
    };
  };

  const errorInfo = getErrorType(error);

  const getRetryButtonText = () => {
    if (retryCount >= maxRetries) {
      return 'Max retries reached';
    }
    return `Retry (${retryCount}/${maxRetries})`;
  };

  return (
    <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6">
      {/* Error Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-2xl text-white">{errorInfo.icon}</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-800">{errorInfo.title}</h3>
          <p className="text-red-600">{errorInfo.description}</p>
        </div>
      </div>

      {/* Error Message */}
      <div className="mb-4 p-4 bg-red-100 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium text-red-800">Error Details:</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {showDetails ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-red-700 font-mono bg-red-50 p-2 rounded">
              {error}
            </p>
            {jobId && <p className="text-xs text-red-600">Job ID: {jobId}</p>}
            <p className="text-xs text-red-600">
              Time: {new Date().toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-red-700">
            {error.length > 100 ? `${error.substring(0, 100)}...` : error}
          </p>
        )}
      </div>

      {/* Suggestions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">💡 解决建议</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          {errorInfo.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canRetry && retryCount < maxRetries && (
          <button
            onClick={onRetry}
            className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <span>🔄</span>
            <span>{getRetryButtonText()}</span>
          </button>
        )}

        <button
          onClick={onReset}
          className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🔄</span>
          <span>Start Over</span>
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-3 text-neutral-text bg-white border border-neutral-border rounded-lg hover:bg-neutral-panel transition-colors flex items-center justify-center space-x-2 dark:text-dark-text dark:bg-dark-panel dark:border-dark-border dark:hover:bg-dark-panel-hover"
        >
          <span>🏠</span>
          <span>Back to Home</span>
        </button>
      </div>

      {/* Support Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-800 mb-2">🆘 Need Help?</h5>
        <div className="text-sm text-blue-700 space-y-1">
          <p>If the problem persists, you can:</p>
          <ul className="ml-4 space-y-1">
            <li>• Try using a different browser</li>
            <li>• Clear browser cache and cookies</li>
            <li>• Check if browser extensions are blocking requests</li>
            <li>• Contact our technical support team</li>
          </ul>
        </div>
      </div>

      {/* Retry Progress */}
      {retryCount > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Retry Progress</span>
            <span>
              {retryCount}/{maxRetries}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(retryCount / maxRetries) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default ConversionError;
