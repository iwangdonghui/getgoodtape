-- Test script to verify database schema
-- Run with: wrangler d1 execute getgoodtape-dev --file=test-schema.sql --env development

-- Test 1: Insert a test conversion job
INSERT INTO conversion_jobs (
    id, url, platform, format, quality, status, progress
) VALUES (
    'test-job-1', 
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
    'youtube', 
    'mp3', 
    '192', 
    'queued', 
    0
);

-- Test 2: Query the job
SELECT * FROM conversion_jobs WHERE id = 'test-job-1';

-- Test 3: Update the job
UPDATE conversion_jobs 
SET status = 'processing', progress = 50, updated_at = strftime('%s', 'now')
WHERE id = 'test-job-1';

-- Test 4: Query platforms
SELECT name, domain, supported_formats FROM platforms WHERE is_active = 1;

-- Test 5: Insert usage stats
INSERT OR REPLACE INTO usage_stats (
    date, platform, format, total_conversions, successful_conversions, total_duration
) VALUES (
    '2024-01-01', 'youtube', 'mp3', 10, 9, 1800
);

-- Test 6: Query usage stats
SELECT * FROM usage_stats WHERE date = '2024-01-01';

-- Test 7: Clean up test data
DELETE FROM conversion_jobs WHERE id = 'test-job-1';
DELETE FROM usage_stats WHERE date = '2024-01-01' AND platform = 'youtube' AND format = 'mp3';

-- Test 8: Verify cleanup
SELECT COUNT(*) as remaining_test_jobs FROM conversion_jobs WHERE id LIKE 'test-%';
SELECT COUNT(*) as remaining_test_stats FROM usage_stats WHERE date = '2024-01-01';

-- Test 9: Check indexes exist
SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';

-- Test 10: Verify constraints work (this should fail)
-- INSERT INTO conversion_jobs (id, url, platform, format, quality, status) 
-- VALUES ('test-invalid', 'test-url', 'test-platform', 'invalid-format', 'test-quality', 'invalid-status');