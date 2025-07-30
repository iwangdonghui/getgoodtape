'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-6xl font-bold text-red-500 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">出现错误</h2>
        <p className="text-gray-600 mb-8">
          抱歉，应用程序遇到了一个错误。请稍后重试。
        </p>
        <div className="space-y-4">
          <button
            onClick={reset}
            className="block w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            重试
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
