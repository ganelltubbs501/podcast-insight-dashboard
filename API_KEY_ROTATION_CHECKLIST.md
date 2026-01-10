# 🔑 API Key Rotation Checklist

**Date Started:** January 10, 2026
**Status:** 🔴 IN PROGRESS

---

## ⚠️ CRITICAL: Your API keys are exposed in git history and must be rotated NOW

---

## Step 1: Revoke Gemini API Key ⏱️ 2 minutes

### Current Exposed Key:
```
AIzaSyDZ4ikQ7MMOMiBLa1qtU574OfS1xUIGqcg
```

### Actions:

1. **Open Gemini AI Studio:**
   - Go to: https://aistudio.google.com/app/apikey
   - Log in with your Google account

2. **Find the exposed key:**
   - Look for key starting with `AIzaSyDZ4ikQ...`
   - Click the **trash/delete icon** next to it
   - Confirm deletion

3. **Create new API key:**
   - Click **"Create API Key"** button
   - Select your Google Cloud project (or create new one)
   - Copy the new key immediately (you won't see it again!)

4. **Save new key to server/.env:**
   ```bash
   # Open server/.env in your editor
   # Replace the old key with your new key:
   GEMINI_API_KEY=your_new_key_here
   ```

5. **Verify the file is NOT tracked by git:**
   ```bash
   git status
   # server/.env should NOT appear in the list
   ```

### ✅ Checklist:
- [ ] Opened https://aistudio.google.com/app/apikey
- [ ] Deleted old key `AIzaSyDZ4ikQ...`
- [ ] Created new API key
- [ ] Copied new key
- [ ] Updated `server/.env` with new key
- [ ] Verified `server/.env` not in git status

---

## Step 2: Reset Supabase Keys ⏱️ 3 minutes

### Current Exposed Keys:
- **Project URL:** `https://rvtytagkpridbsifnimf.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (exposed)

### Actions:

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com/project/rvtytagkpridbsifnimf/settings/api
   - Log in to your Supabase account

2. **Reset the anon/public key:**
   - Find the section "Project API keys"
   - Look for "anon" / "public" key
   - Click **"Reset"** or **"Regenerate"** button
   - Confirm the reset
   - **Copy the NEW anon key immediately**

3. **Update frontend .env.local:**
   ```bash
   # Open .env.local in your editor
   # Replace with new keys:
   VITE_SUPABASE_URL=https://rvtytagkpridbsifnimf.supabase.co
   VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
   VITE_API_BASE_URL=http://localhost:8080
   ```

4. **Get Service Role Key (for backend):**
   - In same Supabase dashboard page
   - Find "service_role" key (should already exist)
   - Click "Reveal" to show it
   - Copy it

5. **Update backend server/.env:**
   ```bash
   # Add to server/.env:
   SUPABASE_URL=https://rvtytagkpridbsifnimf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_ANON_KEY=your_new_anon_key_here
   ```

6. **Verify files are NOT tracked by git:**
   ```bash
   git status
   # .env.local and server/.env should NOT appear
   ```

### ✅ Checklist:
- [ ] Opened Supabase dashboard
- [ ] Reset anon/public key
- [ ] Copied new anon key
- [ ] Updated `.env.local` with new anon key
- [ ] Copied service_role key
- [ ] Updated `server/.env` with service_role key
- [ ] Verified `.env.local` not in git status
- [ ] Verified `server/.env` not in git status

---

## Step 3: Update Production Environment Variables ⏱️ 5 minutes

**If you're deploying to production (Vercel, Railway, Render, etc.):**

### For Vercel:
```bash
# In Vercel dashboard for your project:
# Settings → Environment Variables → Add

# Frontend variables:
VITE_SUPABASE_URL=https://rvtytagkpridbsifnimf.supabase.co
VITE_SUPABASE_ANON_KEY=<your_new_anon_key>
VITE_API_BASE_URL=<your_production_backend_url>

# Backend variables (if separate deployment):
GEMINI_API_KEY=<your_new_gemini_key>
SUPABASE_URL=https://rvtytagkpridbsifnimf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_ANON_KEY=<your_new_anon_key>
PORT=8080
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### For Railway:
```bash
# In Railway dashboard:
# Your Project → Variables tab

# Add same variables as above
```

### For Render:
```bash
# In Render dashboard:
# Your Web Service → Environment → Add Environment Variable

# Add same variables as above
```

### ✅ Checklist:
- [ ] Identified hosting platform (Vercel/Railway/Render/Other)
- [ ] Added all frontend env variables
- [ ] Added all backend env variables
- [ ] Redeployed application (if already deployed)
- [ ] Tested production deployment works

---

## Step 4: Verify Keys Are Working ⏱️ 5 minutes

### Test Locally:

1. **Stop any running servers**
   ```bash
   # Press Ctrl+C in both terminal windows
   ```

2. **Start backend with new keys:**
   ```bash
   cd server
   npm run dev

   # You should see:
   # ✅ Server running on port 8080
   # No errors about missing API keys
   ```

3. **Start frontend in new terminal:**
   ```bash
   npm run dev

   # You should see:
   # ➜  Local: http://localhost:3000/
   ```

4. **Test the application:**
   - Open http://localhost:3000 in browser
   - Log in to your account
   - Go to "New Analysis" page
   - Try analyzing a sample transcript
   - **Success indicators:**
     - No console errors about API keys
     - Analysis completes successfully
     - Results page loads with data

5. **Check for errors:**
   ```bash
   # In browser DevTools Console (F12):
   # Should see NO errors about:
   # - "GEMINI_API_KEY"
   # - "SUPABASE_URL"
   # - "401 Unauthorized" (unless not logged in)
   ```

### ✅ Checklist:
- [ ] Stopped old servers
- [ ] Started backend with new keys (no errors)
- [ ] Started frontend (no errors)
- [ ] Logged in successfully
- [ ] Analyzed a test transcript
- [ ] Results displayed correctly
- [ ] No API key errors in console
- [ ] No authentication errors (401)

---

## Step 5: Verify Old Keys Are Revoked ⏱️ 2 minutes

### Test that old keys DON'T work:

1. **Create a test request with OLD Gemini key:**
   ```bash
   # Try using the OLD exposed key
   curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyDZ4ikQ7MMOMiBLa1qtU574OfS1xUIGqcg" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}'

   # Expected: Error response (API key invalid/revoked)
   # If this WORKS, the key wasn't revoked! Go back to Step 1
   ```

2. **Verify old Supabase key doesn't work:**
   - Try logging in with old credentials from another browser
   - Should fail if keys rotated correctly

### ✅ Checklist:
- [ ] Old Gemini key returns error when tested
- [ ] Application works with NEW keys
- [ ] All old credentials are confirmed revoked

---

## Step 6: Document New Keys ⏱️ 1 minute

**IMPORTANT: Store new keys in a secure password manager!**

### Recommended Password Managers:
- 1Password
- Bitwarden
- LastPass
- Dashlane

### What to save:
```
Service: Gemini AI
Key: <your_new_gemini_key>
Project: LoquiHQ Podcast Dashboard
Date Created: January 10, 2026
Environment: Development & Production

Service: Supabase
Project: LoquiHQ (rvtytagkpridbsifnimf)
Anon Key: <your_new_anon_key>
Service Role Key: <your_service_role_key>
Date Created: January 10, 2026
Environment: Development & Production
```

### ✅ Checklist:
- [ ] Saved new Gemini key in password manager
- [ ] Saved new Supabase keys in password manager
- [ ] Added notes about when keys were created
- [ ] Marked old keys as "REVOKED - DO NOT USE"

---

## Step 7: Final Security Verification ⏱️ 3 minutes

### Double-check .gitignore is working:

```bash
# Run these commands in your project root:

# 1. Check git status (should be clean of .env files)
git status

# 2. Verify .gitignore includes .env files
cat .gitignore | grep "\.env"

# 3. Confirm .env files are NOT tracked
git ls-files | grep "\.env"
# Should return NOTHING (or only .env.example)
```

### Verify local files have new keys:

```bash
# Check backend has new key
cat server/.env | grep GEMINI_API_KEY
# Should show: GEMINI_API_KEY=your_new_key...

# Check frontend has new key
cat .env.local | grep VITE_SUPABASE_ANON_KEY
# Should show: VITE_SUPABASE_ANON_KEY=your_new_key...
```

### ✅ Checklist:
- [ ] `git status` shows no .env files
- [ ] `.gitignore` contains `.env` patterns
- [ ] `git ls-files` doesn't list .env files
- [ ] `server/.env` has NEW Gemini key
- [ ] `.env.local` has NEW Supabase keys

---

## 🎉 Completion Checklist

### All Steps Complete:
- [ ] ✅ Step 1: Gemini API key revoked and rotated
- [ ] ✅ Step 2: Supabase keys reset and updated
- [ ] ✅ Step 3: Production env variables updated (if applicable)
- [ ] ✅ Step 4: New keys verified working locally
- [ ] ✅ Step 5: Old keys confirmed revoked
- [ ] ✅ Step 6: New keys saved in password manager
- [ ] ✅ Step 7: Git security verified

### Final Verification:
- [ ] Application runs successfully with new keys
- [ ] No API key errors in console
- [ ] Authentication works (can log in and analyze)
- [ ] Old keys are revoked and don't work
- [ ] New keys are NOT in git repository
- [ ] New keys saved securely in password manager

---

## 🚨 If You Encounter Issues

### "API key invalid" error:
- Double-check you copied the ENTIRE key (they're long!)
- Ensure no extra spaces before/after the key
- Verify you're using the key in the correct .env file
- Restart the server after changing .env

### "Cannot connect to Supabase" error:
- Verify VITE_SUPABASE_URL is correct
- Check anon key was copied completely
- Clear browser cache and reload
- Check browser console for specific error

### "Authentication required" error:
- This is expected if not logged in!
- Log in to your account first
- Check that auth tokens are being sent (DevTools → Network → Headers)

### Old key still works:
- You may have created a new key instead of revoking the old one
- Go back to Gemini console and DELETE the old key
- Don't just create new ones, must delete exposed key!

---

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Search the error in the documentation
3. Review SECURITY_FIX_GUIDE.md
4. Check SECURITY_FIXES_COMPLETED.md

**Remember: Never commit .env files to git!**

---

**Estimated Total Time:** 15-20 minutes
**Difficulty:** Easy (just follow the steps!)
**Priority:** 🔴 CRITICAL - Do this NOW before any other work

---

Last Updated: January 10, 2026
