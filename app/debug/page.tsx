'use client';

import ThemeToggle from '../../components/ThemeToggle';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-dark-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-deep-brown dark:text-dark-text mb-8">
          调试页面 - 主题切换测试
        </h1>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
            主题切换按钮测试
          </h2>

          <div className="flex items-center space-x-4 mb-4">
            <span className="text-deep-brown dark:text-dark-text">
              主题切换按钮：
            </span>
            <ThemeToggle />
          </div>

          <p className="text-sm text-deep-brown/70 dark:text-dark-text-muted">
            如果你能看到上面的按钮，说明ThemeToggle组件正常工作。
            点击按钮应该能切换主题。
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
            模拟Header布局
          </h2>

          <div className="bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-warm-orange/20 dark:border-dark-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-warm-orange rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <h1 className="text-lg font-bold text-deep-brown dark:text-dark-text">
                  GetGoodTape
                </h1>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <ThemeToggle />
                <button className="bg-warm-orange text-white px-4 py-2 rounded-lg text-sm">
                  Try Beta
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
            当前状态检查
          </h2>

          <div className="space-y-2 text-sm">
            <p className="text-deep-brown dark:text-dark-text">
              <strong>当前主题类：</strong>
              <span
                id="theme-class"
                className="ml-2 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              >
                检查中...
              </span>
            </p>
            <p className="text-deep-brown dark:text-dark-text">
              <strong>localStorage主题：</strong>
              <span
                id="stored-theme"
                className="ml-2 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              >
                检查中...
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/app"
            className="bg-warm-orange dark:bg-dark-warm-orange text-white px-6 py-3 rounded-lg hover:bg-warm-orange/90 dark:hover:bg-dark-warm-orange/90 transition-colors font-medium mr-4"
          >
            去应用页面
          </a>
          <a
            href="/"
            className="bg-mint-green dark:bg-dark-mint-green text-deep-brown dark:text-dark-bg px-6 py-3 rounded-lg hover:bg-mint-green/90 dark:hover:bg-dark-mint-green/90 transition-colors font-medium"
          >
            去首页
          </a>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          function updateStatus() {
            const themeClass = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const storedTheme = localStorage.getItem('theme') || 'none';

            document.getElementById('theme-class').textContent = themeClass;
            document.getElementById('stored-theme').textContent = storedTheme;
          }

          // 初始更新
          setTimeout(updateStatus, 100);

          // 监听变化
          const observer = new MutationObserver(updateStatus);
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
          });
        `,
        }}
      />
    </div>
  );
}
