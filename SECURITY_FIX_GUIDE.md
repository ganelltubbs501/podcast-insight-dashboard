# 🔐 Security Fix Implementation Guide

## STEP 1: REVOKE EXPOSED API KEYS (DO THIS FIRST!)

### ⚠️ CRITICAL - Do Immediately

Your API keys are exposed in the git repository. Follow these steps NOW:

### A. Revoke Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Find the key: `AIzaSyDZ4ikQ7MMOMiBLa1qtU574OfS1xUIGqcg`
3. Click "Delete" or "Revoke"
4. Click "Create API Key" to generate a new one
5. **Save the new key** - we'll use it in Step 2

### B. Reset Supabase Credentials

1. Go to: https://app.supabase.com/project/rvtytagkpridbsifnimf/settings/api
2. Click "Reset" next to "anon public" key
3. Copy the new anon key
4. **Optional but recommended:** Create a new project for production

### C. Remove Exposed Files from Git History

```bash
# Remove .env files from git (already done in this branch)
git rm --cached .env.local server/.env 2>/dev/null || true

# Verify they're in .gitignore
cat .gitignore | grep "\.env"
```

### D. Update Environment Variables

**For Local Development:**
1. Update `.env.local` with new Supabase key (file already exists)
2. Update `server/.env` with new Gemini key (file already exists)
3. **NEVER commit these files again**

**For Production (when ready):**
- Use environment variables in your hosting platform (Vercel, Railway, etc.)
- Never store secrets in code or config files

---

## STEP 2: Implementation Progress

The following security fixes are being implemented in this branch:

- [x] Created security-hardening branch
- [ ] Installed Zod for validation
- [ ] Created authentication middleware
- [ ] Applied auth to all endpoints
- [ ] Created input validation schemas
- [ ] Fixed database user isolation
- [ ] Created oauth_tokens table
- [ ] Implemented token encryption
- [ ] Updated all queries to include user_id
- [ ] Enabled TypeScript strict mode
- [ ] Fixed all type errors
- [ ] Tested all fixes

---

## Notes

- This guide will be updated as we implement each fix
- All changes are being made in the `security-hardening` branch
- We'll test thoroughly before merging to main
