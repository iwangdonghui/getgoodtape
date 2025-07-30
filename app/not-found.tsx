import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-orange-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          页面未找到
        </h2>
        <p className="text-gray-600 mb-8">抱歉，您访问的页面不存在。</p>
        <Link
          href="/"
          className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
