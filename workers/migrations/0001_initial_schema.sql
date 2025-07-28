-- Migration: 0001_initial_schema
-- Description: Create initial database schema for GetGoodTape
-- Created: 2024-01-01

-- 转换任务表 (conversion_jobs)
CREATE TABLE IF NOT EXISTS conversion_jobs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    platform TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('mp3', 'mp4')),
    quality TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    file_path TEXT,
    download_url TEXT,
    metadata TEXT, -- JSON 字符串存储视频元数据
    error_message TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER DEFAULT (strftime('%s', 'now', '+24 hours'))
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status ON conversion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created_at ON conversion_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_expires_at ON conversion_jobs(expires_at);

-- 平台配置表 (platforms)
CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL UNIQUE,
    supported_formats TEXT NOT NULL, -- JSON 数组字符串
    max_duration INTEGER DEFAULT 7200, -- 最大时长（秒）
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    config TEXT, -- JSON 字符串存储平台特定配置
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 创建平台表索引
CREATE INDEX IF NOT EXISTS idx_platforms_domain ON platforms(domain);
CREATE INDEX IF NOT EXISTS idx_platforms_is_active ON platforms(is_active);

-- 使用统计表 (usage_stats)
CREATE TABLE IF NOT EXISTS usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- ISO 日期字符串
    platform TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('mp3', 'mp4')),
    total_conversions INTEGER DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(date, platform, format)
);

-- 创建统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_platform ON usage_stats(platform);