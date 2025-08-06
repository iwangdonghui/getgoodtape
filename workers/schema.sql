-- GetGoodTape Database Schema
-- This file contains the complete database schema for the video conversion service

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
    download_expires_at INTEGER, -- 下载URL过期时间戳
    r2_key TEXT, -- R2存储中的文件key
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
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_download_expires ON conversion_jobs(download_expires_at);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_r2_key ON conversion_jobs(r2_key);

-- 复合索引优化常见查询
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status_created ON conversion_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_url_hash ON conversion_jobs(url); -- 用于重复检测
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_platform_format ON conversion_jobs(platform, format);

-- 优化统计查询的索引
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status_updated ON conversion_jobs(status, updated_at);

-- 平台配置表 (platforms)
CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL UNIQUE,
    supported_formats TEXT NOT NULL, -- JSON 数组字符串，如 '["mp3", "mp4"]'
    max_duration INTEGER DEFAULT 7200, -- 最大时长（秒），默认2小时
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)), -- SQLite 使用 INTEGER 作为 BOOLEAN
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
    date TEXT NOT NULL, -- ISO 日期字符串，格式：YYYY-MM-DD
    platform TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('mp3', 'mp4')),
    total_conversions INTEGER DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- 总转换时长（秒）
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(date, platform, format) -- 确保每天每平台每格式只有一条记录
);

-- 创建统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_platform ON usage_stats(platform);

-- 插入默认支持的平台数据
INSERT OR IGNORE INTO platforms (name, domain, supported_formats, max_duration, is_active, config) VALUES
('YouTube', 'youtube.com', '["mp3", "mp4"]', 7200, 1, '{"extractor": "youtube", "quality_options": {"mp3": ["128", "192", "320"], "mp4": ["360", "720", "1080"]}}'),
('YouTube Shorts', 'youtube.com', '["mp3", "mp4"]', 300, 1, '{"extractor": "youtube", "quality_options": {"mp3": ["128", "192", "320"], "mp4": ["360", "720", "1080"]}}'),
('TikTok', 'tiktok.com', '["mp3", "mp4"]', 600, 1, '{"extractor": "tiktok", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('X (Twitter)', 'x.com', '["mp3", "mp4"]', 1200, 1, '{"extractor": "twitter", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Twitter', 'twitter.com', '["mp3", "mp4"]', 1200, 1, '{"extractor": "twitter", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Facebook', 'facebook.com', '["mp3", "mp4"]', 3600, 1, '{"extractor": "facebook", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Instagram', 'instagram.com', '["mp3", "mp4"]', 900, 1, '{"extractor": "instagram", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}');