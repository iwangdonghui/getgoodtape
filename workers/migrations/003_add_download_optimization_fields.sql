-- Migration 003: Add download optimization fields
-- This migration adds fields to support download flow optimization

-- Add download URL expiration tracking
ALTER TABLE conversion_jobs ADD COLUMN download_expires_at INTEGER;

-- Add R2 key for direct storage access
ALTER TABLE conversion_jobs ADD COLUMN r2_key TEXT;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_download_expires ON conversion_jobs(download_expires_at);
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_r2_key ON conversion_jobs(r2_key);

-- Update existing records to have default expiration (24 hours from now)
UPDATE conversion_jobs 
SET download_expires_at = strftime('%s', 'now', '+24 hours')
WHERE download_expires_at IS NULL AND download_url IS NOT NULL;
