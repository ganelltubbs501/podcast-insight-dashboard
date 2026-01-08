# Sentry Error Tracking Setup Guide

This guide covers how to set up Sentry error tracking for both frontend and backend applications.

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Testing Error Tracking](#testing-error-tracking)
- [Monitoring & Alerts](#monitoring--alerts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Sentry?

Sentry is a cloud-based error tracking and performance monitoring service that helps you:

- **Catch errors before users report them** - Get notified instantly when errors occur
- **Debug faster** - See full stack traces, breadcrumbs, and user context
- **Monitor performance** - Track slow API calls and rendering issues
- **Replay user sessions** - Watch what happened before an error occurred
- **Track releases** - Monitor error rates across deployments

### Features Implemented

**Frontend (React):**
- Browser error tracking
- Performance monitoring (React components, network calls)
- Session replay (replays sessions where errors occurred)
- User context tracking (associate errors with specific users)
- Breadcrumbs (user actions, console logs, network requests)
- Error boundary with custom fallback UI

**Backend (Node.js/Express):**
- Server error tracking
- Performance profiling
- Request tracing
- Rate limit monitoring
- Automatic error capture for unhandled exceptions
- User context support

### Pricing

Sentry offers a **generous free tier**:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replay sessions/month
- 1 user
- 30-day data retention

**Perfect for:**
- Side projects
- MVP development
- Small-scale production apps
- Testing and development

For production apps with higher traffic, paid plans start at $26/month.

---

## Getting Started

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io/signup/)
2. Sign up for a free account
3. Choose "Create a new project"
4. Select platform:
   - **Frontend**: Choose "React"
   - **Backend**: Choose "Node.js" or "Express"

### 2. Get Your DSN (Data Source Name)

After creating a project, you'll receive a DSN that looks like:

```
https://abc123def456@o123456.ingest.sentry.io/7891011
```

**You'll need TWO projects (recommended):**
- One for frontend (React)
- One for backend (Node.js)

This separates frontend and backend errors for clearer monitoring.

### 3. Add DSN to Environment Variables

**Frontend (.env):**
```bash
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_ENABLE_ERROR_TRACKING=true
```

**Backend (server/.env):**
```bash
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
NODE_ENV=production
```

**Important:** Use different DSNs for frontend and backend projects.

---

## Frontend Setup

### Environment Variables

Add to your `.env` file:

```bash
# Sentry Error Tracking (Frontend)
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_ENABLE_ERROR_TRACKING=true

# Optional: Environment identifier
VITE_APP_ENV=production  # or 'staging', 'development'
```

### Configuration Files

The frontend Sentry configuration is already set up in [src/utils/sentry.ts](../src/utils/sentry.ts).

**Key features:**
- Browser tracing for performance monitoring
- Session replay for error debugging
- Breadcrumbs tracking (console, DOM, fetch, history)
- PII filtering (removes sensitive headers)
- Environment-based sampling rates

**Sampling Rates:**
- **Production**: 10% of transactions, 10% of sessions, 100% of error sessions
- **Development**: 100% of everything (for testing)

### Integration Points

Sentry is integrated at these points:

**1. App Initialization ([App.tsx](../App.tsx#L15)):**
```typescript
import { initSentry } from './src/utils/sentry';

// Initialize on app load
initSentry();
```

**2. Error Boundary ([App.tsx](../App.tsx#L120)):**
```typescript
import { ErrorBoundary } from './src/utils/sentry';

<ErrorBoundary fallback={CustomErrorUI}>
  <App />
</ErrorBoundary>
```

**3. User Tracking ([App.tsx](../App.tsx#L45-L55)):**
```typescript
import { setUser as setSentryUser } from './src/utils/sentry';

// On login
setSentryUser({ id: user.id, email: user.email, name: user.name });

// On logout
setSentryUser(null);
```

### Custom Error Fallback UI

When an error occurs, users see:

```
⚠️
Something went wrong
An unexpected error occurred. Our team has been notified.

[Error Details] (expandable)

[Try Again] [Go Home]
```

This provides a friendly experience while errors are sent to Sentry in the background.

---

## Backend Setup

### Environment Variables

Add to `server/.env`:

```bash
# Sentry Error Tracking (Backend)
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
NODE_ENV=production

# Optional: Release tracking
npm_package_version=1.0.0
```

### Configuration Files

The backend Sentry configuration is in [server/src/utils/sentry.ts](../server/src/utils/sentry.ts).

**Key features:**
- Node.js profiling integration
- Express error handler middleware
- PII filtering (removes auth headers, cookies)
- Environment-based sampling rates
- Helper functions for manual error capture

**Sampling Rates:**
- **Production**: 10% of traces, 10% of profiles
- **Development**: 100% of everything

### Integration Points

**1. Server Initialization ([server/src/index.ts](../server/src/index.ts#L22)):**
```typescript
import { initSentry } from './utils/sentry.js';

// Initialize error tracking
initSentry();
```

**2. Express Error Handler ([server/src/index.ts](../server/src/index.ts#L402)):**
```typescript
import { errorHandler, captureException } from './utils/sentry.js';

// Sentry error handler - MUST be after all routes
app.use(errorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  captureException(err, {
    url: req.url,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

**3. Rate Limit Monitoring ([server/src/middleware/rateLimiter.ts](../server/src/middleware/rateLimiter.ts#L31-L39)):**
```typescript
import { captureMessage } from '../utils/sentry.js';

// Track rate limit violations
captureMessage(
  `Rate limit exceeded: ${req.ip} on ${req.path}`,
  'warning',
  { ip: req.ip, path: req.path, method: req.method }
);
```

### Ignored Errors

The backend ignores expected validation errors to reduce noise:

```typescript
ignoreErrors: [
  'Missing contentInput',
  'Missing type',
  'Missing context',
]
```

These are user input validation errors, not application bugs.

---

## Testing Error Tracking

### Frontend Testing

**1. Test Error Boundary:**

Add a test button to your app (remove in production):

```typescript
<button onClick={() => { throw new Error('Test Sentry Error!'); }}>
  Test Error
</button>
```

Click it - you should see:
- Custom error fallback UI
- Error appears in Sentry dashboard within seconds

**2. Test Manual Capture:**

```typescript
import { captureException } from './src/utils/sentry';

try {
  riskyOperation();
} catch (error) {
  captureException(error);
}
```

**3. Test User Context:**

Log in to your app, trigger an error - check Sentry dashboard to see user info attached.

**4. Test Breadcrumbs:**

Perform actions (click buttons, navigate pages), then trigger an error - check Sentry to see the breadcrumb trail.

### Backend Testing

**1. Test Unhandled Exception:**

Add to any endpoint:

```typescript
app.get('/api/test-error', (req, res) => {
  throw new Error('Test backend error!');
});
```

Visit `/api/test-error` - error should appear in Sentry.

**2. Test Manual Capture:**

```typescript
import { captureException } from './utils/sentry.js';

try {
  riskyOperation();
} catch (err) {
  captureException(err, { context: 'additional info' });
}
```

**3. Test Rate Limit Monitoring:**

Trigger rate limit by making many requests - check Sentry for:
- Warning: General rate limit exceeded
- Error: AI analysis rate limit exceeded

**4. Test with curl:**

```bash
# Trigger error endpoint
curl http://localhost:8080/api/test-error

# Check server logs for:
# "Unhandled error: Error: Test backend error!"

# Check Sentry dashboard for error
```

### Verify in Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Click your project
3. Navigate to "Issues"
4. You should see your test errors with:
   - Full stack traces
   - Breadcrumbs (frontend)
   - User context (if logged in)
   - Environment (production/development)
   - Request details (backend)

---

## Monitoring & Alerts

### Setting Up Alerts

**1. Create Alert Rule:**
- Go to Sentry → Alerts → Create Alert Rule
- Choose "Issues"
- Set conditions (e.g., "When an issue is first seen")

**2. Notification Channels:**
- Email (default)
- Slack (recommended for teams)
- Discord
- PagerDuty (for critical apps)

**3. Recommended Alerts:**

**New Issues:**
```
Alert me when a new issue is first seen
→ Email/Slack notification
```

**High Volume:**
```
Alert me when an issue is seen more than 50 times in 1 hour
→ Critical priority
```

**Regression:**
```
Alert me when a resolved issue re-appears
→ High priority
```

**Rate Limit Abuse:**
```
Alert me when "Rate limit exceeded" appears more than 10 times in 15 minutes
→ Investigation needed
```

### Dashboard Setup

**1. Create Custom Dashboard:**
- Sentry → Dashboards → Create Dashboard

**2. Recommended Widgets:**

```
📊 Error Rate Over Time (line chart)
📊 Top 10 Errors (table)
📊 Errors by Environment (pie chart)
📊 Errors by User (table)
📊 Performance: Slowest Transactions (table)
📊 Session Replays: Latest Errors (list)
```

**3. Performance Monitoring:**
- Transactions → Web Vitals
- Monitor: LCP, FID, CLS
- Set budgets (e.g., LCP < 2.5s)

---

## Best Practices

### ✅ DO

**1. Use separate projects for frontend and backend**
```
✓ loquihq-frontend (React)
✓ loquihq-backend (Node.js)
```

**2. Set environment correctly**
```typescript
environment: 'production' // or 'staging', 'development'
```

**3. Add user context**
```typescript
setSentryUser({ id: user.id, email: user.email });
```

**4. Use breadcrumbs for debugging**
```typescript
addBreadcrumb('User clicked submit', 'ui.click', 'info');
```

**5. Filter sensitive data**
```typescript
beforeSend(event) {
  delete event.request?.headers?.['authorization'];
  return event;
}
```

**6. Set release tracking**
```bash
SENTRY_RELEASE=v1.0.0
```

**7. Tag errors for organization**
```typescript
Sentry.setTag('feature', 'analysis');
Sentry.setTag('api', 'gemini');
```

**8. Monitor performance budgets**
```
Set alerts for slow API calls (>3s)
Set alerts for slow page loads (>5s)
```

### ❌ DON'T

**1. Don't send all events in production**
```typescript
// Bad: 100% sampling in production (expensive)
tracesSampleRate: 1.0

// Good: 10% sampling (sufficient for monitoring)
tracesSampleRate: 0.1
```

**2. Don't track PII without user consent**
```typescript
// Filter before sending
beforeSend(event) {
  delete event.request?.headers?.['cookie'];
  delete event.user?.ip_address; // If required by GDPR
  return event;
}
```

**3. Don't capture expected errors**
```typescript
// Bad: Sending validation errors
if (!email) {
  captureException(new Error('Missing email')); // ❌
  return res.status(400).json({ error: 'Missing email' });
}

// Good: Ignore validation errors
ignoreErrors: ['Missing email', 'Invalid input']
```

**4. Don't disable error tracking in staging**
```typescript
// Bad: No monitoring in staging
if (env !== 'production') return;

// Good: Monitor all environments
environment: env // 'production', 'staging', 'development'
```

**5. Don't expose DSN in client-side code**
```typescript
// Good: DSN from environment variable
dsn: import.meta.env.VITE_SENTRY_DSN

// Bad: Hardcoded DSN
dsn: 'https://abc123@sentry.io/123' // ❌
```

**6. Don't track errors without context**
```typescript
// Bad: Generic error
captureException(error);

// Good: Error with context
captureException(error, {
  tags: { feature: 'analysis' },
  extra: { transcriptId, userId }
});
```

---

## Troubleshooting

### Frontend Issues

**Problem: "Sentry error tracking is disabled"**

**Cause:** Missing or invalid `VITE_SENTRY_DSN`

**Fix:**
```bash
# Check .env file
cat .env | grep SENTRY

# Should show:
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_ENABLE_ERROR_TRACKING=true

# Restart dev server
npm run dev
```

---

**Problem: Errors not appearing in Sentry dashboard**

**Causes & Fixes:**

1. **Environment check:**
```typescript
// src/utils/sentry.ts
console.log('Sentry DSN:', import.meta.env.VITE_SENTRY_DSN); // Should not be undefined
console.log('Error tracking enabled:', import.meta.env.VITE_ENABLE_ERROR_TRACKING);
```

2. **Development mode filtering:**
```typescript
beforeSend(event) {
  // This blocks events in development
  if (env.app.isDevelopment && !env.features.errorTracking) {
    return null; // ← Check this isn't blocking
  }
  return event;
}
```

**Fix:** Set `VITE_ENABLE_ERROR_TRACKING=true` in development

3. **Adblockers:**
- Some adblockers block Sentry
- Test in incognito mode or disable adblocker

---

**Problem: Session replays not recording**

**Cause:** Replay sampling too low

**Fix:**
```typescript
// src/utils/sentry.ts
replaysSessionSampleRate: 0.1, // 10% of sessions
replaysOnErrorSampleRate: 1.0, // 100% of error sessions
```

**Note:** Increase `replaysSessionSampleRate` for more replays (uses more quota)

---

### Backend Issues

**Problem: "Sentry error tracking is disabled (no DSN configured)"**

**Cause:** Missing `SENTRY_DSN` in `server/.env`

**Fix:**
```bash
# Add to server/.env
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id

# Restart server
cd server
npm run dev
```

---

**Problem: Backend errors not captured**

**Cause:** Error handler middleware order

**Fix:** Ensure error handler is AFTER all routes:

```typescript
// ✅ CORRECT ORDER:
app.post('/api/analyze', ...);
app.post('/api/repurpose', ...);
// ... all other routes ...

app.use(errorHandler); // ← AFTER routes

// ❌ WRONG ORDER:
app.use(errorHandler); // ← BEFORE routes
app.post('/api/analyze', ...); // Won't be caught
```

---

**Problem: TypeScript errors about Sentry imports**

**Cause:** Using outdated Sentry v7 API with v8 package

**Fix:** Use correct v8 imports:

```typescript
// ✅ Correct (v8):
import { nodeProfilingIntegration } from '@sentry/profiling-node';
export const errorHandler = Sentry.expressErrorHandler();

// ❌ Wrong (v7):
import { ProfilingIntegration } from '@sentry/profiling-node';
export const errorHandler = Sentry.Handlers.errorHandler();
```

---

**Problem: Rate limit errors flooding Sentry**

**Cause:** Every rate limit triggers an error

**Fix:** Rate limits send warnings/errors (expected behavior), but you can filter:

```typescript
// server/src/utils/sentry.ts
ignoreErrors: [
  'Rate limit exceeded',
  'Too many requests',
]
```

Or adjust severity in rate limiter:

```typescript
// server/src/middleware/rateLimiter.ts
captureMessage('Rate limit', 'warning'); // Not 'error'
```

---

### Testing Issues

**Problem: Test errors not showing in Sentry**

**Checklist:**
1. ✅ DSN is set correctly
2. ✅ Error was actually thrown (check console)
3. ✅ Sentry is initialized before error
4. ✅ Not in development mode with tracking disabled
5. ✅ Wait 30-60 seconds for Sentry to process

**Debug:**
```typescript
// Add after initSentry()
console.log('Sentry initialized:', Sentry.isEnabled());
```

---

### Quota Issues

**Problem: "Quota exceeded" warning in Sentry**

**Cause:** Free tier limits reached:
- 5,000 errors/month
- 10,000 transactions/month
- 50 replay sessions/month

**Solutions:**

1. **Reduce sampling rates:**
```typescript
// Frontend
tracesSampleRate: 0.05, // Reduce from 0.1 to 0.05
replaysSessionSampleRate: 0.05, // Reduce from 0.1

// Backend
tracesSampleRate: 0.05, // Reduce from 0.1
```

2. **Filter noisy errors:**
```typescript
ignoreErrors: [
  'Network Error',
  'Failed to fetch',
  'AbortError',
]
```

3. **Upgrade plan:**
- $26/month for Team plan
- Higher quotas and more features

---

## Integration with Deployment

### Vercel (Frontend)

Add environment variables:

```bash
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_ENABLE_ERROR_TRACKING=true
VITE_APP_ENV=production
```

### Railway (Backend)

Add environment variables:

```bash
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
NODE_ENV=production
```

### Release Tracking

Track which deployment version caused errors:

**Vercel:**
```bash
VITE_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA
```

**Railway:**
```bash
SENTRY_RELEASE=$RAILWAY_GIT_COMMIT_SHA
```

Then in Sentry config:
```typescript
release: import.meta.env.VITE_SENTRY_RELEASE || 'development'
```

---

## Advanced Features

### Source Maps (for readable stack traces)

**Frontend (Vite):**
```typescript
// vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default {
  build: {
    sourcemap: true, // Generate source maps
  },
  plugins: [
    sentryVitePlugin({
      org: 'your-org',
      project: 'your-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
};
```

**Backend:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

### Performance Budgets

Set performance thresholds:

```typescript
// Frontend
Sentry.init({
  tracesSampleRate: 0.1,
  beforeSendTransaction(event) {
    // Drop transactions slower than 10s (likely anomalies)
    if (event.timestamp && event.start_timestamp) {
      const duration = event.timestamp - event.start_timestamp;
      if (duration > 10) return null;
    }
    return event;
  },
});
```

### Custom Instrumentation

Track custom operations:

```typescript
import { Sentry } from './src/utils/sentry';

// Measure function performance
const transaction = Sentry.startTransaction({
  name: 'analyzeTranscript',
  op: 'ai.analysis',
});

try {
  const result = await analyzeTranscript(content);
  transaction.setStatus('ok');
  return result;
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

---

## Cost Management

### Free Tier Optimization

To stay within the free tier (5,000 errors/month):

**1. Sample aggressively in production:**
```typescript
tracesSampleRate: 0.05, // Only 5% of transactions
replaysSessionSampleRate: 0.01, // Only 1% of sessions
```

**2. Filter noisy errors:**
```typescript
ignoreErrors: [
  /^Network Error$/,
  /^Failed to fetch$/,
  /^AbortError$/,
  /^NotAllowedError$/, // User denied permissions
]
```

**3. Set beforeSend filter:**
```typescript
beforeSend(event) {
  // Ignore errors from browser extensions
  if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
    frame => frame.filename?.includes('chrome-extension://')
  )) {
    return null;
  }
  return event;
}
```

**4. Monitor quota usage:**
- Sentry → Settings → Subscription
- Set up quota alerts (80% threshold)

### When to Upgrade

Consider upgrading to Team plan ($26/month) when:
- Hitting quota limits regularly
- Need more than 1 team member
- Want 90-day data retention (vs 30 days)
- Need advanced features (Slack integration, custom alerts)

---

## Next Steps

After setting up Sentry:

1. ✅ Test error tracking in development
2. ✅ Configure alerts (email/Slack)
3. ✅ Set up dashboard for monitoring
4. ✅ Add release tracking
5. ✅ Configure performance budgets
6. ✅ Train team on using Sentry dashboard
7. ✅ Document common errors and solutions
8. ✅ Set up on-call rotation for critical alerts

---

## Resources

- **Sentry Documentation**: [docs.sentry.io](https://docs.sentry.io)
- **React Integration**: [docs.sentry.io/platforms/javascript/guides/react](https://docs.sentry.io/platforms/javascript/guides/react/)
- **Node.js Integration**: [docs.sentry.io/platforms/node](https://docs.sentry.io/platforms/node/)
- **Error Tracking Best Practices**: [blog.sentry.io/error-tracking-best-practices](https://blog.sentry.io/category/best-practices/)
- **Performance Monitoring**: [docs.sentry.io/product/performance](https://docs.sentry.io/product/performance/)

---

## Support

For issues with this implementation:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Sentry logs in browser console / server logs
3. Verify environment variables are set correctly
4. Test with simple error (throw new Error('test'))
5. Check Sentry dashboard for quota/configuration issues

For Sentry-specific questions:
- Sentry Discord: [discord.gg/sentry](https://discord.gg/sentry)
- Sentry Support: [sentry.io/support](https://sentry.io/support/)
