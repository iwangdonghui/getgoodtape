'use client';

import { useState } from 'react';
import { usePlatforms, useUrlValidation } from '../hooks/useQueries';
import { useCacheManagement } from '../hooks/useQueries';

export default function QueryDemo() {
  const [testUrl, setTestUrl] = useState(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
  const [showDemo, setShowDemo] = useState(false);

  // React Query hooks
  const {
    data: platforms,
    isLoading: platformsLoading,
    error: platformsError,
    refetch: refetchPlatforms,
  } = usePlatforms();

  const {
    data: urlValidation,
    isLoading: urlValidating,
    error: urlValidationError,
    refetch: revalidateUrl,
  } = useUrlValidation(testUrl, testUrl.length > 10);

  const { clearCache, invalidatePlatforms, invalidateUrlValidation } =
    useCacheManagement();

  if (!showDemo) {
    return (
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">
          🚀 React Query 集成演示
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          查看 React Query 的缓存、重试和实时更新功能
        </p>
        <button
          onClick={() => setShowDemo(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          显示演示
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-blue-800">🚀 React Query 集成演示</h3>
        <button
          onClick={() => setShowDemo(false)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          隐藏演示
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platforms Query Demo */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3">平台信息查询</h4>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span>状态:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  platformsLoading
                    ? 'bg-yellow-100 text-yellow-800'
                    : platformsError
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                }`}
              >
                {platformsLoading ? '加载中' : platformsError ? '错误' : '成功'}
              </span>
            </div>

            {platforms?.platforms && (
              <div className="text-sm text-gray-600">
                已缓存 {platforms.platforms.length} 个平台
              </div>
            )}

            {platformsError && (
              <div className="text-sm text-red-600">
                错误: {(platformsError as any)?.message || '未知错误'}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => refetchPlatforms()}
              disabled={platformsLoading}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              重新获取
            </button>
            <button
              onClick={invalidatePlatforms}
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
            >
              清除缓存
            </button>
          </div>
        </div>

        {/* URL Validation Query Demo */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3">URL 验证查询</h4>

          <div className="mb-3">
            <input
              type="text"
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="输入测试URL"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span>验证状态:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  urlValidating
                    ? 'bg-yellow-100 text-yellow-800'
                    : urlValidationError
                      ? 'bg-red-100 text-red-800'
                      : urlValidation?.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {urlValidating
                  ? '验证中'
                  : urlValidationError
                    ? '错误'
                    : urlValidation?.success
                      ? '有效'
                      : '无效'}
              </span>
            </div>

            {urlValidation?.platform && (
              <div className="text-sm text-gray-600">
                平台: {urlValidation.platform}
              </div>
            )}

            {urlValidationError && (
              <div className="text-sm text-red-600">
                错误: {(urlValidationError as any)?.message || '未知错误'}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => revalidateUrl()}
              disabled={urlValidating}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              重新验证
            </button>
            <button
              onClick={() => invalidateUrlValidation(testUrl)}
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
            >
              清除缓存
            </button>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">缓存管理</h4>
        <div className="flex space-x-2">
          <button
            onClick={clearCache}
            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
          >
            清除所有缓存
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          React Query 自动管理缓存、重试和后台更新
        </p>
      </div>

      {/* Features List */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-800 mb-3">✅ 已实现的功能</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• 智能缓存管理 (5-10分钟缓存时间)</li>
          <li>• 自动重试机制 (指数退避)</li>
          <li>• 后台数据更新</li>
          <li>• 网络状态感知</li>
          <li>• 乐观更新</li>
          <li>• 开发者工具集成</li>
          <li>• 错误边界处理</li>
          <li>• 离线支持</li>
        </ul>
      </div>
    </div>
  );
}
