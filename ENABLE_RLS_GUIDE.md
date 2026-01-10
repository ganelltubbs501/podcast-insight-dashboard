# 🔒 Enable Row-Level Security (RLS) Guide

**Priority:** 🔴 CRITICAL - Required Before Production
**Estimated Time:** 5-10 minutes
**Difficulty:** Easy (copy-paste SQL)

---

## What is RLS?

Row-Level Security (RLS) is a **database-level security feature** that ensures users can ONLY access their own data, even if:
- Your application code has bugs
- Someone bypasses your API
- Raw SQL queries are run

**Think of it as:** A security guard at the database that checks every single query.

---

## Why You Need This

**Without RLS:**
- Users could potentially see other users' transcripts if there's a bug
- SQL injection could bypass application-level filters
- Direct database access would expose all data

**With RLS:**
- Database automatically filters ALL queries by user_id
- Even admins can't bypass it (unless using service_role key)
- Defense-in-depth: Application filters + Database filters

---

## How to Enable RLS

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase SQL Editor:**
   - Navigate to: https://app.supabase.com/project/rvtytagkpridbsifnimf/sql
   - Or: Supabase Dashboard → SQL Editor (left sidebar)

2. **Open the migration file:**
   - In your local project, open: `supabase/migrations/004_enable_rls_security.sql`
   - Copy the ENTIRE contents (Ctrl+A, Ctrl+C)

3. **Create new query:**
   - Click "New Query" button in SQL Editor
   - Paste the SQL migration
   - Give it a name: "Enable RLS Security"

4. **Run the migration:**
   - Click "Run" button (or Ctrl+Enter)
   - You should see success messages
   - Check "Results" tab for verification queries

5. **Verify RLS is enabled:**
   - You should see output showing `rowsecurity = true` for both tables
   - You should see 8 policies created (4 per table)

---

### Option 2: Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref rvtytagkpridbsifnimf

# Run migrations
supabase db push

# Or run specific migration
supabase db execute -f supabase/migrations/004_enable_rls_security.sql
```

---

## Verification Steps

### 1. Check RLS is Enabled

Run this query in Supabase SQL Editor:

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('transcripts', 'scheduled_posts');
```

**Expected Output:**
```
tablename         | rowsecurity
------------------+-------------
transcripts       | true
scheduled_posts   | true
```

If `rowsecurity` is `false`, RLS is NOT enabled!

---

### 2. Check Policies Exist

Run this query:

```sql
SELECT
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('transcripts', 'scheduled_posts')
ORDER BY tablename, policyname;
```

**Expected Output (8 policies):**
```
tablename         | policyname
------------------+--------------------------------------------------
transcripts       | Users can delete their own transcripts
transcripts       | Users can insert their own transcripts
transcripts       | Users can update their own transcripts
transcripts       | Users can view their own transcripts
scheduled_posts   | Users can delete their own scheduled posts
scheduled_posts   | Users can insert their own scheduled posts
scheduled_posts   | Users can update their own scheduled posts
scheduled_posts   | Users can view their own scheduled posts
```

---

### 3. Test RLS Works (Prevent Cross-User Access)

**Test 1: Can you see other users' data?**

```sql
-- Get your user ID
SELECT auth.uid();

-- Try to query with a different user_id (should return empty)
SELECT * FROM transcripts WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- This should return 0 rows even if transcripts exist for that user
```

**Test 2: Can you insert with wrong user_id?**

```sql
-- This should FAIL because auth.uid() doesn't match user_id
INSERT INTO transcripts (id, user_id, title, content)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Wrong user_id
  'Test',
  'Test content'
);

-- Expected error: "new row violates row-level security policy"
```

If this INSERT succeeds, RLS is NOT working correctly!

---

## Troubleshooting

### "Permission denied for table transcripts"

**Cause:** You're not authenticated or using wrong credentials.

**Fix:**
- Make sure you're logged in to Supabase dashboard
- Use anon key (not service_role) for testing RLS
- Service role key bypasses RLS (by design)

---

### "RLS is enabled but I can still see all data"

**Cause:** You're using the service_role key which bypasses RLS.

**Fix:**
- In your application, use anon key for client operations
- Service role should ONLY be used in backend with proper auth
- Check your frontend is using `VITE_SUPABASE_ANON_KEY`

---

### "INSERT fails with RLS policy violation"

**Cause:** user_id in INSERT doesn't match authenticated user.

**Fix:**
```typescript
// ❌ Wrong - user_id doesn't match auth.uid()
await supabase.from('transcripts').insert({
  user_id: 'some-other-user-id',
  title: 'Test'
});

// ✅ Correct - use authenticated user's ID
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('transcripts').insert({
  user_id: user.id,
  title: 'Test'
});
```

---

### "Queries are slow after enabling RLS"

**Cause:** Missing indexes on user_id column.

**Fix:**
```sql
-- Add index on user_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
```

---

## After Enabling RLS

### ✅ What to Test:

1. **Log in to your application**
   ```bash
   npm run dev
   # Go to http://localhost:3000
   # Log in with your account
   ```

2. **Create a new transcript**
   - Go to "New Analysis"
   - Analyze a sample transcript
   - Verify it saves successfully

3. **View your transcripts**
   - Go to Dashboard
   - You should see your transcripts
   - They should be ONLY yours

4. **Try to access another user's transcript** (if you have multiple users)
   - Copy another user's transcript ID
   - Try: `http://localhost:3000/results/<other-user-transcript-id>`
   - Should show "Transcript not found" or redirect

5. **Schedule a post**
   - Create scheduled content
   - Verify it saves
   - Check Content Calendar shows only your posts

---

## Security Impact

**Before RLS:**
```
User A requests transcripts
↓
App queries: SELECT * FROM transcripts WHERE user_id = 'user-a'
↓
If app has bug: Could return ALL transcripts
```

**After RLS:**
```
User A requests transcripts
↓
App queries: SELECT * FROM transcripts WHERE user_id = 'user-a'
↓
Database RLS: "Is auth.uid() == user_id?"
  ✅ If yes: Return data
  ❌ If no: Return empty (even if data exists)
↓
User A gets ONLY their data (guaranteed)
```

---

## Performance Notes

- **RLS policies are VERY fast** - they use indexes efficiently
- **No performance impact** if you already filter by user_id in queries
- **Adds security layer** without sacrificing speed
- **Scales well** even with millions of rows

---

## Checklist

Before marking as complete, verify:

- [ ] Ran migration SQL in Supabase SQL Editor
- [ ] Verified `rowsecurity = true` for both tables
- [ ] Verified 8 policies exist (4 per table)
- [ ] Tested: Can insert transcripts as authenticated user
- [ ] Tested: Can view own transcripts
- [ ] Tested: Cannot view other users' transcripts
- [ ] Tested: Cannot insert with wrong user_id
- [ ] Frontend application still works normally
- [ ] Created indexes on user_id columns (if slow)

---

## Next Steps

After enabling RLS:

1. ✅ RLS is now your database security layer
2. ✅ Application-level filters are your first layer
3. ✅ Together = Defense in depth

**Remaining security tasks:**
- Rotate exposed API keys (CRITICAL - user action)
- Implement OAuth token encryption (next priority)
- Enable TypeScript strict mode
- Add error boundaries

See: `SECURITY_FIXES_COMPLETED.md` for full status

---

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Best Practices](https://supabase.com/docs/guides/platform/security)

---

**Last Updated:** January 10, 2026
**Migration File:** `supabase/migrations/004_enable_rls_security.sql`
