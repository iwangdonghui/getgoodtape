'use client';

import ThemeToggle from '../../components/ThemeToggle';

export default function TestThemePage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-dark-bg transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-deep-brown dark:text-dark-text mb-8 text-center">
            主题切换测试页面
          </h1>

          <div className="mobile-card mb-8">
            <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
              主题控制
            </h2>
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <p className="text-sm text-deep-brown/70 dark:text-dark-text-secondary mt-4 text-center">
              点击上方按钮切换主题模式
            </p>
          </div>

          <div className="mobile-card mb-8">
            <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
              颜色测试
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="bg-warm-orange dark:bg-dark-warm-orange text-white p-3 rounded">
                  主要橙色
                </div>
                <div className="bg-mint-green dark:bg-dark-mint-green text-deep-brown dark:text-dark-bg p-3 rounded">
                  薄荷绿
                </div>
                <div className="bg-tape-gold dark:bg-dark-tape-gold text-deep-brown dark:text-dark-bg p-3 rounded">
                  磁带金
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-deep-brown dark:bg-dark-text text-cream dark:text-dark-bg p-3 rounded">
                  深棕色
                </div>
                <div className="bg-cream dark:bg-dark-surface text-deep-brown dark:text-dark-text p-3 rounded border border-warm-orange/20 dark:border-dark-border">
                  背景色
                </div>
                <div className="bg-white/50 dark:bg-dark-surface-hover text-deep-brown dark:text-dark-text p-3 rounded border border-warm-orange/20 dark:border-dark-border">
                  表面色
                </div>
              </div>
            </div>
          </div>

          <div className="mobile-card">
            <h2 className="text-xl font-semibold text-deep-brown dark:text-dark-text mb-4">
              文本层次测试
            </h2>
            <div className="space-y-3">
              <p className="text-deep-brown dark:text-dark-text">
                主要文本 - 这是最重要的文本内容
              </p>
              <p className="text-deep-brown/80 dark:text-dark-text-secondary">
                次要文本 - 这是次要的文本内容
              </p>
              <p className="text-deep-brown/60 dark:text-dark-text-muted">
                弱化文本 - 这是辅助性的文本内容
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="mobile-link bg-warm-orange dark:bg-dark-warm-orange text-white px-6 py-3 rounded-lg hover:bg-warm-orange/90 dark:hover:bg-dark-warm-orange/90 transition-colors font-medium"
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
