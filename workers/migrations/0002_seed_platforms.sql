-- Migration: 0002_seed_platforms
-- Description: Insert default supported platforms
-- Created: 2024-01-01

-- 插入默认支持的平台数据
INSERT OR IGNORE INTO platforms (name, domain, supported_formats, max_duration, is_active, config) VALUES
('YouTube', 'youtube.com', '["mp3", "mp4"]', 7200, 1, '{"extractor": "youtube", "quality_options": {"mp3": ["128", "192", "320"], "mp4": ["360", "720", "1080"]}}'),
('YouTube Shorts', 'youtube.com', '["mp3", "mp4"]', 300, 1, '{"extractor": "youtube", "quality_options": {"mp3": ["128", "192", "320"], "mp4": ["360", "720", "1080"]}}'),
('TikTok', 'tiktok.com', '["mp3", "mp4"]', 600, 1, '{"extractor": "tiktok", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('X (Twitter)', 'x.com', '["mp3", "mp4"]', 1200, 1, '{"extractor": "twitter", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Twitter', 'twitter.com', '["mp3", "mp4"]', 1200, 1, '{"extractor": "twitter", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Facebook', 'facebook.com', '["mp3", "mp4"]', 3600, 1, '{"extractor": "facebook", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}'),
('Instagram', 'instagram.com', '["mp3", "mp4"]', 900, 1, '{"extractor": "instagram", "quality_options": {"mp3": ["128", "192"], "mp4": ["360", "720"]}}');