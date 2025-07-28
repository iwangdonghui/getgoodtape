import { useState } from 'react';

interface ConversionErrorProps {
  error: string;
  canRetry: boolean;
  retryCount: number;
  maxRetries?: number;
  onRetry: () => void;
  onReset: () => void;
  jobId?: string | null;
}

export default function ConversionError({
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
        title: '网络连接错误',
        description: '无法连接到服务器，请检查您的网络连接',
        suggestions: [
          '检查您的网络连接是否正常',
          '尝试刷新页面',
          '如果问题持续，请稍后重试',
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
        title: 'URL链接错误',
        description: '提供的视频链接无效或无法访问',
        suggestions: [
          '确认视频链接是否正确',
          '检查视频是否为公开可访问',
          '尝试使用其他视频链接',
          '确保链接来自支持的平台',
        ],
      };
    }

    if (message.includes('timeout') || message.includes('超时')) {
      return {
        type: 'timeout',
        icon: '⏰',
        title: '处理超时',
        description: '转换过程耗时过长，已自动停止',
        suggestions: [
          '视频可能过长或过大',
          '尝试转换较短的视频',
          '选择较低的质量设置',
          '稍后重试，服务器可能正忙',
        ],
      };
    }

    if (message.includes('format') || message.includes('格式')) {
      return {
        type: 'format',
        icon: '📁',
        title: '格式不支持',
        description: '视频格式不受支持或转换失败',
        suggestions: [
          '尝试使用不同的视频源',
          '检查视频是否损坏',
          '尝试不同的输出格式',
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
        title: '服务限制',
        description: '已达到服务使用限制',
        suggestions: [
          '请稍后重试',
          '服务器可能正在维护',
          '联系支持团队获取帮助',
        ],
      };
    }

    // Default error type
    return {
      type: 'unknown',
      icon: '❌',
      title: '转换失败',
      description: '转换过程中发生未知错误',
      suggestions: [
        '请重试转换',
        '如果问题持续，请联系支持',
        '尝试使用不同的视频链接',
      ],
    };
  };

  const errorInfo = getErrorType(error);

  const getRetryButtonText = () => {
    if (retryCount >= maxRetries) {
      return '已达到最大重试次数';
    }
    return `重试 (${retryCount}/${maxRetries})`;
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
          <span className="font-medium text-red-800">错误详情:</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            {showDetails ? '隐藏详情' : '显示详情'}
          </button>
        </div>

        {showDetails ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-red-700 font-mono bg-red-50 p-2 rounded">
              {error}
            </p>
            {jobId && <p className="text-xs text-red-600">任务ID: {jobId}</p>}
            <p className="text-xs text-red-600">
              时间: {new Date().toLocaleString()}
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
          <span>重新开始</span>
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-3 text-deep-brown border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🏠</span>
          <span>返回首页</span>
        </button>
      </div>

      {/* Support Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-800 mb-2">🆘 需要帮助？</h5>
        <div className="text-sm text-blue-700 space-y-1">
          <p>如果问题持续存在，您可以：</p>
          <ul className="ml-4 space-y-1">
            <li>• 尝试使用不同的浏览器</li>
            <li>• 清除浏览器缓存和Cookie</li>
            <li>• 检查是否有浏览器扩展阻止了请求</li>
            <li>• 联系我们的技术支持团队</li>
          </ul>
        </div>
      </div>

      {/* Retry Progress */}
      {retryCount > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>重试进度</span>
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
}
