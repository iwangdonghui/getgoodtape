'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggle = memo(function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // 应用主题到DOM
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // 更新meta标签的主题色
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const isDarkMode = root.classList.contains('dark');
      metaThemeColor.setAttribute(
        'content',
        isDarkMode ? '#1E1E1E' : '#4F46E5'
      );
    }
  };

  // 初始化
  useEffect(() => {
    setMounted(true);

    // 读取保存的主题
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }, []);

  // 主题变化时应用
  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  // 切换主题
  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // 获取图标
  const getIcon = () => {
    if (theme === 'light') {
      return <Sun className="h-4 w-4" />;
    } else if (theme === 'dark') {
      return <Moon className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  // 获取标签
  const getLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  // 显示占位符直到客户端挂载
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">System</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      title={`Switch theme: ${getLabel()}`}
    >
      {getIcon()}
      <span className="hidden sm:inline ml-2">{getLabel()}</span>
    </Button>
  );
});

export default ThemeToggle;
