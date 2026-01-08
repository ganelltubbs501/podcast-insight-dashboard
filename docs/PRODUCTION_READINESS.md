# Production Readiness Checklist

This document outlines all steps needed to prepare LoquiHQ for beta testing and production deployment.

---

## 🎯 Phase 1: Infrastructure & Build Setup (Critical)

### 1. Switch to Production Tailwind CSS
**Current:** Using CDN (not suitable for production)
**Target:** PostCSS setup with proper purging

**Steps:**
```bash
# Install Tailwind as dev dependency
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind config
npx tailwindcss init -p

# Create tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF2D8D',
        secondary: '#5B2EFF',
        success: '#22C55E',
        error: '#EF4444',
        textPrimary: '#FFFFFF',
        textBody: '#E6E6F0',
        textSecondary: '#B9B9CC',
        textMuted: '#8B8BA6',
        link: '#FF2D8D',
        linkHover: '#E60074',
        gray: {
          50: '#0B0B10',
          100: '#11111A',
          200: '#1A1A26',
          300: '#242438',
          400: '#3A3A55',
          500: '#5B5B78',
          600: '#8B8BA6',
          700: '#B9B9CC',
          800: '#E6E6F0',
          900: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
EOF

# Create src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import your custom CSS from index.html here */
@layer base {
  :root {
    --color-primary: #FF2D8D;
    --color-secondary: #5B2EFF;
    --text-primary: #FFFFFF;
    --text-body: #E6E6F0;
    --text-secondary: #B9B9CC;
    --text-muted: #8B8BA6;
    --theme-meta: #0D0616;
  }

  .light {
    --text-primary: #0D0616;
    --text-body: #1E1E33;
    --text-secondary: #55556F;
    --text-muted: #7B7B94;
    --theme-meta: #5B2EFF;
  }

  html.light body {
    background-color: #FFFFFF;
    color: #1E1E33;
  }
}
EOF

# Update index.tsx to import CSS
# Add: import './index.css'
```

**Remove from index.html:**
- `<script src="https://cdn.tailwindcss.com"></script>`
- Inline Tailwind config
- All custom CSS (move to src/index.css)

**Benefit:** 90% smaller CSS bundle, faster load times, no CDN dependency

---

### 2. Environment Variables Management
**Current:** .env files in root/server
**Target:** Proper staging/production configs

**Create `.env.example` files:**
```bash
# Root .env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:8080

# Server .env.example
GEMINI_API_KEY=your_gemini_key
PORT=8080
GEMINI_MODEL=gemini-2.5-flash
NODE_ENV=production

# Optional APIs
YOUTUBE_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

**Production checklist:**
- [ ] Create separate `.env.production` files
- [ ] Never commit actual `.env` files (ensure in .gitignore)
- [ ] Use environment variable management in hosting (Vercel/Railway/Render)
- [ ] Rotate all API keys before launch
- [ ] Use different Supabase project for production

---

### 3. TypeScript Strictness
**Current:** May have `any` types and loose configs
**Target:** Strict TypeScript

**Add to tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Fix all type errors:**
```bash
npm run type-check
```

---

## 🛡️ Phase 2: Security Hardening (Critical)

### 1. API Key Protection
**Issues:**
- [ ] Gemini API key is server-side only (✅ already secure)
- [ ] Supabase anon key is public (this is fine, RLS protects data)
- [ ] Check for any exposed secrets in code

**Action:**
```bash
# Scan for accidentally committed secrets
git log --all --full-history -- "**/*.env"

# Use git-secrets to prevent future leaks
git secrets --install
git secrets --register-aws
```

---

### 2. Content Security Policy (CSP)
**Add to index.html `<head>`:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://esm.sh;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
">
```

---

### 3. Rate Limiting
**Backend needs rate limiting to prevent abuse:**

```bash
cd server
npm install express-rate-limit
```

**Add to server/src/index.ts:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limit for AI analysis
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 analyses per hour
  message: 'Analysis quota exceeded. Please wait before analyzing more content.'
});

app.post('/api/analyze', analysisLimiter, ...);
```

---

### 4. Input Validation
**Add validation library:**
```bash
cd server
npm install zod
```

**Example validation:**
```typescript
import { z } from 'zod';

const analyzeSchema = z.object({
  content: z.string().min(100).max(50000),
  title: z.string().min(1).max(200),
});

app.post('/api/analyze', async (req, res) => {
  try {
    const validated = analyzeSchema.parse(req.body);
    // Proceed with validated data
  } catch (e) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

---

## 📊 Phase 3: Performance Optimization

### 1. Code Splitting & Lazy Loading
**Split large pages:**
```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/results/:id" element={<ResultsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Suspense>
  );
}
```

---

### 2. Image Optimization
**Add to vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { quality: 80 },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
```

---

### 3. Caching Strategy
**Add service worker caching:**
```typescript
// service-worker.ts
const CACHE_NAME = 'podcast-insight-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 🧪 Phase 4: Testing & Quality Assurance

### 1. Error Tracking
**Add Sentry for error monitoring:**
```bash
npm install @sentry/react @sentry/vite-plugin
```

```typescript
// index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

### 2. Analytics
**Add privacy-friendly analytics:**
```bash
npm install @vercel/analytics
# or use Plausible/Fathom for privacy-first analytics
```

```typescript
// index.tsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

---

### 3. End-to-End Testing
**Optional but recommended:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Create tests/e2e/analysis.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

test('can analyze podcast transcript', async ({ page }) => {
  await page.goto('http://localhost:3000/new');
  await page.fill('[name="title"]', 'Test Episode');
  await page.fill('[name="content"]', 'Sample transcript...');
  await page.click('button:has-text("Analyze")');

  await expect(page.locator('text=Key Takeaways')).toBeVisible({ timeout: 60000 });
});
```

---

## 🚀 Phase 5: Deployment Setup

### 1. Database Migrations
**Ensure all Supabase migrations are applied:**

```bash
# Check supabase/migrations/ directory
ls -la supabase/migrations/

# Should have:
# 001_transcripts.sql
# 002_*.sql (if any)
# 003_scheduled_posts.sql
```

**Apply migrations in production Supabase:**
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order
3. Verify tables exist with `\dt` in SQL editor

---

### 2. Frontend Hosting Options

#### **Option A: Vercel (Recommended)**
```bash
npm install -g vercel
vercel login
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_API_BASE_URL (your backend URL)
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### **Option B: Netlify**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### 3. Backend Hosting Options

#### **Option A: Railway.app (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init

# Link to project
railway link

# Deploy
cd server
railway up
```

**Dockerfile (create in server/):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

#### **Option B: Render.com**
1. Connect GitHub repo
2. Select "Web Service"
3. Build command: `cd server && npm install && npm run build`
4. Start command: `cd server && npm start`
5. Add environment variables

#### **Option C: AWS Lambda (Serverless)**
Convert Express app to Lambda function using `serverless-http`

---

### 4. Custom Domain Setup
**After deployment:**
1. Buy domain (Namecheap, Google Domains, etc.)
2. Add to Vercel/Netlify:
   - Frontend: `app.yourdomain.com`
   - Backend: `api.yourdomain.com`
3. Update `VITE_API_BASE_URL` to production URL
4. Enable SSL (automatic on Vercel/Netlify)

---

## 📋 Phase 6: Documentation & Beta Prep

### 1. User Documentation
**Create docs/USER_GUIDE.md:**
- How to sign up
- How to analyze a transcript
- How to schedule posts
- How to track metrics
- Pricing (if applicable)

---

### 2. API Documentation
**If exposing API to users:**
- Document webhook endpoints
- API key generation process
- Rate limits
- Example requests/responses

---

### 3. Beta Testing Checklist
- [ ] Invite 10-20 beta testers
- [ ] Create feedback form (Google Forms / Typeform)
- [ ] Set up support email (support@yourdomain.com)
- [ ] Create Discord/Slack community for testers
- [ ] Prepare onboarding email sequence
- [ ] Set analytics goals (DAU, retention, feature usage)

---

## 🔍 Phase 7: Monitoring & Maintenance

### 1. Uptime Monitoring
**Free options:**
- UptimeRobot (50 monitors free)
- Better Uptime
- Pingdom

**Monitor:**
- Frontend URL
- Backend health endpoint (`/health`)
- Supabase connection

---

### 2. Performance Monitoring
**Add to server/src/index.ts:**
```typescript
app.get('/health', async (req, res) => {
  try {
    // Check DB connection
    const { error } = await supabase.from('transcripts').select('id').limit(1);
    if (error) throw error;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (e) {
    res.status(503).json({ status: 'unhealthy', error: e.message });
  }
});
```

---

### 3. Log Aggregation
**Options:**
- Papertrail (free tier)
- Logtail
- CloudWatch (if on AWS)

**Add structured logging:**
```bash
npm install pino pino-pretty
```

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request received');
  next();
});
```

---

## ✅ Pre-Launch Checklist

### Must-Have Before Beta
- [ ] Tailwind switched to PostCSS
- [ ] All environment variables in hosting platform
- [ ] Supabase production database with migrations
- [ ] Rate limiting on backend
- [ ] Error tracking (Sentry) enabled
- [ ] Analytics enabled
- [ ] Health check endpoint
- [ ] Custom domain with SSL
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] GDPR compliance (if EU users)
  - Cookie consent
  - Data export/deletion
  - Privacy policy updates

### Nice-to-Have Before Beta
- [ ] E2E tests for critical flows
- [ ] Automated CI/CD pipeline
- [ ] Staging environment
- [ ] Backup strategy for Supabase
- [ ] Email notifications setup (SendGrid/Postmark)
- [ ] User onboarding tour
- [ ] Help documentation
- [ ] Video walkthrough

### Post-Beta / Before Production
- [ ] Load testing (can handle 100 concurrent users?)
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Browser compatibility testing
- [ ] Mobile responsive testing
- [ ] SEO optimization
- [ ] Social media preview cards
- [ ] Customer support system (Intercom/Crisp)

---

## 💰 Cost Estimation

### Free Tier (Good for Beta)
- **Hosting:** Vercel/Netlify free tier (100GB bandwidth)
- **Backend:** Railway $5/month or Render free tier
- **Database:** Supabase free tier (500MB, 2GB bandwidth)
- **Domain:** $12/year
- **Total:** ~$17/month

### Paid Tier (Production Ready)
- **Hosting:** Vercel Pro $20/month
- **Backend:** Railway Pro $20/month
- **Database:** Supabase Pro $25/month
- **Gemini API:** Pay-per-use (~$0.0001/request)
- **Monitoring:** Sentry Team $26/month
- **Domain:** $12/year
- **Total:** ~$92/month

---

## 🎯 Launch Timeline

### Week 1: Infrastructure
- Day 1-2: Switch to PostCSS Tailwind
- Day 3-4: Set up production environments
- Day 5: Deploy to staging

### Week 2: Security & Performance
- Day 1-2: Add rate limiting, CSP, validation
- Day 3-4: Implement error tracking, analytics
- Day 5: Performance testing

### Week 3: Testing & Polish
- Day 1-3: Beta tester recruitment & onboarding
- Day 4-5: Fix critical bugs from feedback

### Week 4: Public Launch
- Day 1: Final security audit
- Day 2-3: Marketing preparation
- Day 4: Soft launch
- Day 5: Public announcement

---

## 📞 Support & Resources

**If you get stuck:**
- Vercel Discord: https://vercel.com/discord
- Supabase Discord: https://discord.supabase.com
- Railway Discord: https://discord.gg/railway

**Recommended Reading:**
- [The 12-Factor App](https://12factor.net/)
- [Web.dev Best Practices](https://web.dev/learn/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Next immediate action:** Start with Phase 1, Step 1 (Switch to PostCSS Tailwind). Would you like me to help you implement this first?
