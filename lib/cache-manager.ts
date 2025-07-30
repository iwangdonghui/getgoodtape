// 缓存管理器 - 优化API请求和数据存储

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // 默认缓存时间 (毫秒)
  maxSize?: number; // 最大缓存条目数
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private defaultTTL: number;
  private maxSize: number;
  private storage: 'memory' | 'localStorage' | 'sessionStorage';

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 默认5分钟
    this.maxSize = options.maxSize || 100;
    this.storage = options.storage || 'memory';
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    if (this.storage === 'memory') {
      // 内存缓存
      if (this.memoryCache.size >= this.maxSize) {
        // 删除最旧的条目
        const oldestKey = this.memoryCache.keys().next().value;
        if (oldestKey) {
          this.memoryCache.delete(oldestKey);
        }
      }
      this.memoryCache.set(key, cacheItem);
    } else {
      // 浏览器存储
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        storageObj.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      } catch (error) {
        console.warn('Failed to set cache in browser storage:', error);
        // 降级到内存缓存
        this.memoryCache.set(key, cacheItem);
      }
    }
  }

  // 获取缓存
  get<T>(key: string): T | null {
    let cacheItem: CacheItem<T> | null = null;

    if (this.storage === 'memory') {
      cacheItem = this.memoryCache.get(key) || null;
    } else {
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        const cached = storageObj.getItem(`cache_${key}`);
        if (cached) {
          cacheItem = JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Failed to get cache from browser storage:', error);
        // 降级到内存缓存
        cacheItem = this.memoryCache.get(key) || null;
      }
    }

    if (!cacheItem) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cacheItem.timestamp > cacheItem.ttl) {
      this.delete(key);
      return null;
    }

    return cacheItem.data;
  }

  // 删除缓存
  delete(key: string): void {
    if (this.storage === 'memory') {
      this.memoryCache.delete(key);
    } else {
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        storageObj.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn('Failed to delete cache from browser storage:', error);
      }
    }
  }

  // 清空所有缓存
  clear(): void {
    if (this.storage === 'memory') {
      this.memoryCache.clear();
    } else {
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        const keys = Object.keys(storageObj).filter(key =>
          key.startsWith('cache_')
        );
        keys.forEach(key => storageObj.removeItem(key));
      } catch (error) {
        console.warn('Failed to clear cache from browser storage:', error);
      }
    }
  }

  // 获取缓存统计信息
  getStats(): { size: number; keys: string[] } {
    if (this.storage === 'memory') {
      return {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()),
      };
    } else {
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        const keys = Object.keys(storageObj)
          .filter(key => key.startsWith('cache_'))
          .map(key => key.replace('cache_', ''));
        return { size: keys.length, keys };
      } catch (error) {
        return { size: 0, keys: [] };
      }
    }
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();

    if (this.storage === 'memory') {
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((item, key) => {
        if (now - item.timestamp > item.ttl) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } else {
      try {
        const storageObj =
          this.storage === 'localStorage' ? localStorage : sessionStorage;
        const keys = Object.keys(storageObj).filter(key =>
          key.startsWith('cache_')
        );

        keys.forEach(key => {
          try {
            const item = JSON.parse(storageObj.getItem(key) || '{}');
            if (item.timestamp && now - item.timestamp > item.ttl) {
              storageObj.removeItem(key);
            }
          } catch (error) {
            // 删除损坏的缓存条目
            storageObj.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to cleanup cache:', error);
      }
    }
  }
}

// 创建不同用途的缓存实例
export const apiCache = new CacheManager({
  ttl: 5 * 60 * 1000, // API缓存5分钟
  maxSize: 50,
  storage: 'memory',
});

export const platformCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 平台信息缓存30分钟
  maxSize: 20,
  storage: 'localStorage',
});

export const userPrefsCache = new CacheManager({
  ttl: 24 * 60 * 60 * 1000, // 用户偏好缓存24小时
  maxSize: 10,
  storage: 'localStorage',
});

// 缓存装饰器函数
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  cacheManager: CacheManager,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);

    // 尝试从缓存获取
    const cached = cacheManager.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // 执行函数并缓存结果
    try {
      const result = await fn(...args);
      cacheManager.set(key, result, ttl);
      return result;
    } catch (error) {
      // 不缓存错误结果
      throw error;
    }
  };
}

// 自动清理过期缓存
if (typeof window !== 'undefined') {
  // 每10分钟清理一次过期缓存
  setInterval(
    () => {
      apiCache.cleanup();
      platformCache.cleanup();
      userPrefsCache.cleanup();
    },
    10 * 60 * 1000
  );

  // 页面卸载时清理内存缓存
  window.addEventListener('beforeunload', () => {
    apiCache.clear();
  });
}

export default CacheManager;
