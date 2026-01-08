# Deployment Environment Variables Guide

This guide covers how to set environment variables for different deployment platforms.

## 📋 Table of Contents

- [Quick Reference](#quick-reference)
- [Vercel (Frontend)](#vercel-frontend)
- [Railway (Backend)](#railway-backend)
- [Render (Alternative Backend)](#render-alternative-backend)
- [Netlify (Alternative Frontend)](#netlify-alternative-frontend)
- [Docker Deployment](#docker-deployment)
- [Security Best Practices](#security-best-practices)

---

## Quick Reference

### Required Variables for Production

**Frontend (Vercel/Netlify):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_APP_ENV=production
```

**Backend (Railway/Render):**
```bash
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Vercel (Frontend)

### Step-by-Step Setup

1. **Navigate to your Vercel project settings**
   - Go to: `Settings` → `Environment Variables`

2. **Add required variables:**

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
   | `VITE_API_BASE_URL` | `https://your-backend.railway.app` | Production |
   | `VITE_API_BASE_URL` | `https://your-backend-staging.railway.app` | Preview |
   | `VITE_API_BASE_URL` | `http://localhost:8080` | Development |
   | `VITE_APP_ENV` | `production` | Production |
   | `VITE_APP_ENV` | `staging` | Preview |

3. **Optional variables for monitoring:**

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `VITE_SENTRY_DSN` | Your Sentry DSN | Production, Preview |
   | `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production |
   | `VITE_ENABLE_ANALYTICS` | `true` | Production |
   | `VITE_ENABLE_ERROR_TRACKING` | `true` | Production |

4. **Trigger redeploy** after adding variables

### CLI Method (Optional)

```bash
# Install Vercel CLI
npm i -g vercel

# Set variables via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_API_BASE_URL production
```

---

## Railway (Backend)

### Step-by-Step Setup

1. **Navigate to your Railway project**
   - Click on your service → `Variables` tab

2. **Add required variables:**

   ```env
   GEMINI_API_KEY=your-gemini-api-key
   NODE_ENV=production
   PORT=8080
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Add rate limiting (recommended):**

   ```env
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=50
   ```

4. **Optional monitoring:**

   ```env
   SENTRY_DSN=your-backend-sentry-dsn
   ```

5. **Optional external APIs:**

   ```env
   YOUTUBE_API_KEY=your-youtube-api-key
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   ```

6. **Service redeploys automatically** when variables are updated

### Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Link to project
railway link

# Add variables
railway variables set GEMINI_API_KEY=your-key
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Render (Alternative Backend)

### Dashboard Method

1. **Go to your Render service**
   - Click `Environment` in the sidebar

2. **Add environment variables:**

   ```env
   GEMINI_API_KEY=your-gemini-api-key
   NODE_ENV=production
   PORT=10000
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

   **Note:** Render uses port 10000 by default (not 8080)

3. **Click "Save Changes"**
   - Service will automatically redeploy

### render.yaml Method

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: loquihq-api
    runtime: node
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: GEMINI_API_KEY
        sync: false  # Set via dashboard for security
      - key: PORT
        value: 10000
      - key: ALLOWED_ORIGINS
        value: https://yourdomain.com
```

---

## Netlify (Alternative Frontend)

### Dashboard Method

1. **Go to Site Settings** → **Environment variables**

2. **Add variables** (same as Vercel):

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_BASE_URL=https://your-backend.railway.app
   VITE_APP_ENV=production
   ```

3. **Trigger redeploy** from Deploys tab

### netlify.toml Method

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Environment variables (non-sensitive only)
[context.production.environment]
  VITE_APP_ENV = "production"

[context.deploy-preview.environment]
  VITE_APP_ENV = "staging"
```

**Note:** Add sensitive keys (Supabase, API URLs) via Netlify dashboard, not `netlify.toml`

---

## Docker Deployment

### Using Environment Files

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build with build-time variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
        VITE_API_BASE_URL: http://backend:8080
    ports:
      - "3000:80"

  backend:
    build: .
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NODE_ENV=production
      - PORT=8080
      - ALLOWED_ORIGINS=http://localhost:3000
    ports:
      - "8080:8080"
    env_file:
      - .env.production
```

**Run with:**
```bash
docker-compose --env-file .env.production up
```

---

## Security Best Practices

### ✅ DO

1. **Use separate keys for production and staging**
   - Never use the same API keys across environments

2. **Rotate secrets regularly**
   ```bash
   # Every 90 days, generate new keys for:
   - Supabase anon keys
   - Gemini API keys
   - OAuth credentials
   ```

3. **Use secret management services**
   - Vercel: Built-in encrypted secrets
   - Railway: Environment variables are encrypted
   - AWS: Use AWS Secrets Manager
   - GCP: Use Secret Manager

4. **Restrict CORS to specific domains**
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com  # Not "*"
   ```

5. **Enable error tracking in production**
   ```env
   VITE_SENTRY_DSN=your-sentry-dsn
   SENTRY_DSN=your-backend-sentry-dsn
   ```

6. **Set NODE_ENV correctly**
   ```env
   NODE_ENV=production  # Enables optimizations and security features
   ```

### ❌ DON'T

1. **Never commit .env files to git**
   - Already configured in .gitignore

2. **Don't use development keys in production**
   - Use separate Supabase projects for dev/prod

3. **Don't expose backend directly**
   - Always proxy through your domain

4. **Don't hardcode secrets in code**
   - Use environment variables exclusively

5. **Don't share API keys publicly**
   - Revoke and regenerate if accidentally exposed

---

## Testing Environment Variables

### Frontend

```bash
# Check if variables are loaded
npm run dev

# In browser console:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

### Backend

```bash
# Check if variables are loaded
cd server
npm run dev

# Look for validation output:
# ✅ Backend environment variables validated
# ✅ Server running on port 8080
```

---

## Troubleshooting

### Frontend builds but shows blank page

**Cause:** Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`

**Fix:**
1. Check browser console for error
2. Verify variables in deployment platform
3. Ensure variables start with `VITE_` prefix
4. Redeploy after adding variables

### Backend crashes on startup

**Cause:** Missing `GEMINI_API_KEY`

**Fix:**
```bash
# Check backend logs for:
# ❌ Backend Environment Validation Failed: Missing required backend environment variables:
#   - GEMINI_API_KEY
```

Add the missing variable and redeploy.

### CORS errors

**Cause:** `ALLOWED_ORIGINS` doesn't include frontend domain

**Fix:**
```env
# Backend environment
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Rate limit errors

**Cause:** Too many requests hitting Gemini API

**Fix:**
```env
# Reduce max requests per window
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=30   # Lower from 100
```

---

## Platform-Specific Notes

### Vercel
- Automatically detects `VITE_` prefix
- Supports environment-specific variables (production/preview/development)
- Build environment variables are baked into the build

### Railway
- Automatically restarts service when variables change
- Supports private networking between services
- Use `${{PORT}}` for dynamic port assignment

### Render
- Uses port 10000 by default (not 8080)
- Supports secret files for sensitive data
- Free tier sleeps after inactivity

### Netlify
- Supports deploy previews with separate variables
- Build environment variables are frozen at build time
- Use Netlify Functions for backend (alternative to Railway)

---

## Next Steps

After setting environment variables:

1. ✅ Test deployment with staging environment
2. ✅ Set up error tracking (Sentry)
3. ✅ Configure analytics (Google Analytics)
4. ✅ Set up monitoring (Uptime checks)
5. ✅ Configure custom domain
6. ✅ Enable SSL/HTTPS
7. ✅ Set up CDN (Cloudflare)

See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for full deployment checklist.
