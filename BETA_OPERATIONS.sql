-- Beta Operations SQL Queries
-- Run these queries in your Supabase SQL editor or database console

-- ===========================================
-- METRICS QUERIES
-- ===========================================

-- Count total users (active beta testers)
SELECT COUNT(*) as total_users
FROM profiles;

-- Count waitlist entries
SELECT COUNT(*) as waitlist_count
FROM waitlist;

-- Count connected podcasts
SELECT COUNT(*) as connected_podcasts
FROM podcasts;

-- Count analyses run today
SELECT COUNT(*) as analyses_today
FROM podcast_analyses
WHERE DATE(created_at) = CURRENT_DATE;

-- Count analyses run this week
SELECT COUNT(*) as analyses_this_week
FROM podcast_analyses
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE);

-- Count analyses run this month
SELECT COUNT(*) as analyses_this_month
FROM podcast_analyses
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- ===========================================
-- USER MANAGEMENT QUERIES
-- ===========================================

-- List all beta testers with their activity
SELECT
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    p.last_sign_in_at,
    COALESCE(podcast_count.count, 0) as podcast_count,
    COALESCE(analysis_count.count, 0) as analysis_count
FROM profiles p
LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM podcasts
    GROUP BY user_id
) podcast_count ON p.id = podcast_count.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM podcast_analyses
    GROUP BY user_id
) analysis_count ON p.id = analysis_count.user_id
ORDER BY p.created_at DESC;

-- Find inactive users (no sign in for 30+ days)
SELECT
    p.id,
    p.email,
    p.full_name,
    p.last_sign_in_at,
    DATE_PART('day', CURRENT_TIMESTAMP - p.last_sign_in_at) as days_since_sign_in
FROM profiles p
WHERE p.last_sign_in_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY p.last_sign_in_at ASC;

-- ===========================================
-- RESET PLAN - Remove a tester
-- ===========================================

-- WARNING: This will permanently delete all user data
-- Replace 'user-id-here' with the actual user ID

-- Step 1: Delete podcast analyses
DELETE FROM podcast_analyses
WHERE user_id = 'user-id-here';

-- Step 2: Get podcast ID for the user
-- (You'll need this for the next steps)
SELECT id as podcast_id FROM podcasts WHERE user_id = 'user-id-here';

-- Step 3: Delete monetization projections
DELETE FROM monetization_projections
WHERE podcast_id = (SELECT id FROM podcasts WHERE user_id = 'user-id-here');

-- Step 4: Delete metrics snapshots
DELETE FROM podcast_metrics_snapshots
WHERE podcast_id = (SELECT id FROM podcasts WHERE user_id = 'user-id-here');

-- Step 5: Delete podcast episodes
DELETE FROM podcast_episodes
WHERE podcast_id = (SELECT id FROM podcasts WHERE user_id = 'user-id-here');

-- Step 6: Delete scheduled posts
DELETE FROM scheduled_posts
WHERE user_id = 'user-id-here';

-- Step 7: Delete podcast connections
DELETE FROM podcast_connections
WHERE user_id = 'user-id-here';

-- Step 8: Delete podcasts
DELETE FROM podcasts
WHERE user_id = 'user-id-here';

-- Step 9: Delete the user account (requires admin privileges)
-- This must be done through the Supabase Admin API or dashboard
-- DELETE FROM auth.users WHERE id = 'user-id-here';

-- ===========================================
-- RE-INVITE PROCESS
-- ===========================================

-- Check if user exists before re-inviting
SELECT id, email, created_at
FROM profiles
WHERE email = 'user-email-here';

-- Log re-invite (you might want to create a re_invites table)
-- INSERT INTO re_invites (email, invited_by, invited_at)
-- VALUES ('user-email-here', 'admin-user-id', CURRENT_TIMESTAMP);

-- ===========================================
-- BETA CAPACITY MANAGEMENT
-- ===========================================

-- Check current beta capacity (assuming 50 user limit)
SELECT
    (SELECT COUNT(*) FROM profiles) as current_users,
    50 as beta_capacity,
    GREATEST(0, 50 - (SELECT COUNT(*) FROM profiles)) as remaining_slots;

-- Get signup trend over time
SELECT
    DATE(created_at) as signup_date,
    COUNT(*) as new_users
FROM profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- ===========================================
-- ACTIVITY MONITORING
-- ===========================================

-- Most active users (by analysis count)
SELECT
    p.email,
    COUNT(pa.id) as analysis_count,
    MAX(pa.created_at) as last_analysis
FROM profiles p
LEFT JOIN podcast_analyses pa ON p.id = pa.user_id
GROUP BY p.id, p.email
ORDER BY analysis_count DESC
LIMIT 10;

-- Recent user activity
SELECT
    p.email,
    pa.created_at as last_activity,
    pa.analysis_type,
    'analysis' as activity_type
FROM profiles p
JOIN podcast_analyses pa ON p.id = pa.user_id
WHERE pa.created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT
    p.email,
    p.last_sign_in_at as last_activity,
    'sign_in' as analysis_type,
    'sign_in' as activity_type
FROM profiles p
WHERE p.last_sign_in_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY last_activity DESC
LIMIT 20;

-- ===========================================
-- SYSTEM HEALTH CHECKS
-- ===========================================

-- Check for orphaned records
SELECT 'orphaned_analyses' as check_type, COUNT(*) as count
FROM podcast_analyses pa
LEFT JOIN profiles p ON pa.user_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 'orphaned_podcasts' as check_type, COUNT(*) as count
FROM podcasts p
LEFT JOIN profiles pr ON p.user_id = pr.id
WHERE pr.id IS NULL

UNION ALL

SELECT 'orphaned_connections' as check_type, COUNT(*) as count
FROM podcast_connections pc
LEFT JOIN profiles p ON pc.user_id = p.id
WHERE p.id IS NULL;

-- Database size and growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;