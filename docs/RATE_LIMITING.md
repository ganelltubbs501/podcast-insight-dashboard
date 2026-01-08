# Rate Limiting Documentation

This document describes the rate limiting implementation for the LoquiHQ API.

## Overview

Rate limiting protects the API from abuse, ensures fair usage, and manages API costs (particularly for the expensive Gemini AI API). The implementation uses `express-rate-limit` with different limits for different endpoint types.

## Rate Limit Tiers

### 1. Health Check Endpoints
**Path:** `/health`
- **Limit:** 100 requests per minute
- **Window:** 1 minute
- **Purpose:** Allow frequent health checks without hitting limits

### 2. General API Endpoints
**Path:** `/api/*`
- **Limit:** 100 requests per 15 minutes (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Window:** 15 minutes (configurable via `RATE_LIMIT_WINDOW_MS`)
- **Purpose:** Protect general API endpoints from abuse

### 3. AI Analysis Endpoints
**Path:** `/api/analyze`
- **Development:** 50 requests per 15 minutes
- **Production:** 10 requests per 15 minutes
- **Window:** 15 minutes
- **Purpose:** Limit expensive AI API calls that consume credits
- **Why Strict:** Each analysis call costs money via Gemini API

### 4. Repurposing Endpoints
**Path:** `/api/repurpose`
- **Development:** 100 requests per 10 minutes
- **Production:** 20 requests per 10 minutes
- **Window:** 10 minutes
- **Purpose:** Moderate limit for content generation

## Response Headers

When rate limiting is active, the following headers are included in responses:

```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1609459200
```

### Header Descriptions:

- `RateLimit-Limit` - Maximum requests allowed in the current window
- `RateLimit-Remaining` - Requests remaining in the current window
- `RateLimit-Reset` - Unix timestamp when the rate limit resets
- `Retry-After` - Seconds until you can retry (only on 429 responses)

## Rate Limit Exceeded Response

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

### AI Analysis Example:
```json
{
  "error": "Analysis rate limit exceeded",
  "message": "You can only analyze 10 transcripts per 15 minutes. This limit helps manage API costs.",
  "retryAfter": 900,
  "tip": "Consider analyzing longer transcripts to maximize value per request."
}
```

### General API Example:
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 900
}
```

## Configuration

Rate limits are configurable via environment variables in `server/.env`:

```env
# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
NODE_ENV=production              # Enables stricter limits for AI endpoints
```

### Environment-Based Limits:

| Environment | Analysis Limit | Repurpose Limit | General Limit |
|-------------|----------------|-----------------|---------------|
| Development | 50/15min       | 100/10min       | 100/15min     |
| Production  | 10/15min       | 20/10min        | 100/15min     |

## How It Works

### 1. IP-Based Tracking
Rate limits are tracked per IP address. The middleware counts requests from each unique IP.

### 2. Proxy Support
The server is configured to trust proxy headers (`app.set('trust proxy', 1)`), which is essential for:
- Vercel
- Railway
- Render
- CloudFlare
- Any reverse proxy setup

Without this, all requests would appear to come from the proxy IP, not the actual client.

### 3. Sliding Window
The implementation uses a sliding window counter:
- Tracks timestamps of each request
- Removes expired requests from the window
- Counts remaining requests in the current window

## Client-Side Handling

### Recommended Implementation:

```typescript
async function analyzeTranscript(content: string) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentInput: content })
    });

    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = parseInt(response.headers.get('Retry-After') || '900');

      throw new Error(
        `${data.message}. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
      );
    }

    return await response.json();
  } catch (error) {
    // Handle rate limit errors
    console.error('Rate limit exceeded:', error);
    throw error;
  }
}
```

### Reading Rate Limit Headers:

```typescript
// Check remaining requests before making a call
const response = await fetch('/api/analyze', { method: 'POST', /* ... */ });

const remaining = parseInt(response.headers.get('RateLimit-Remaining') || '0');
const limit = parseInt(response.headers.get('RateLimit-Limit') || '0');

console.log(`Requests remaining: ${remaining}/${limit}`);

if (remaining < 3) {
  console.warn('Approaching rate limit!');
}
```

## Bypassing Rate Limits (Development Only)

For local development, you can create a custom limiter that bypasses certain IPs:

```typescript
// In server/src/middleware/rateLimiter.ts
import { createTrustedIpLimiter } from './middleware/rateLimiter.js';

// Trust localhost for development
const devLimiter = createTrustedIpLimiter(['127.0.0.1', '::1']);

// Apply to specific endpoints
app.post("/api/analyze", devLimiter, analyzeHandler);
```

**⚠️ Warning:** Never use trusted IP bypass in production!

## Monitoring Rate Limits

### Backend Logs

The server logs rate limit violations:

```typescript
// In rateLimiter.ts handler
handler: (req, res) => {
  console.warn(`Rate limit exceeded for IP: ${req.ip}, Endpoint: ${req.path}`);
  // Send 429 response
}
```

### Recommended Monitoring:

1. **Track 429 responses in analytics**
   - Count how often users hit limits
   - Identify if limits are too strict

2. **Set up alerts for excessive 429s**
   - Spike in rate limit errors might indicate:
     - Attack attempt
     - Buggy client making too many requests
     - Limits are too restrictive

3. **Use Sentry or similar**
   ```typescript
   if (response.status === 429) {
     Sentry.captureMessage('Rate limit hit', {
       level: 'warning',
       tags: { endpoint: '/api/analyze' }
     });
   }
   ```

## Adjusting Limits

### When to Increase Limits:

- ✅ Legitimate users frequently hit limits
- ✅ You've upgraded to a higher Gemini API tier
- ✅ You've implemented caching to reduce API calls
- ✅ You're offering a paid plan with higher limits

### When to Decrease Limits:

- ✅ API costs are too high
- ✅ You're seeing abuse patterns
- ✅ You're on a free/trial Gemini API tier
- ✅ Server resources are constrained

### How to Adjust:

1. **Update environment variables:**
   ```env
   # More restrictive
   RATE_LIMIT_MAX_REQUESTS=50
   RATE_LIMIT_WINDOW_MS=900000
   ```

2. **Modify specific endpoint limits:**
   ```typescript
   // In server/src/middleware/rateLimiter.ts
   export const aiAnalysisLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5, // Reduced from 10
     // ...
   });
   ```

3. **Redeploy the backend** for changes to take effect

## Per-User Rate Limiting (Future Enhancement)

Currently, rate limiting is IP-based. To implement per-user limits:

1. **Add user identification:**
   ```typescript
   export const userAnalysisLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: async (req) => {
       const user = await getUserFromRequest(req);
       return user.plan === 'premium' ? 100 : 10;
     },
     keyGenerator: (req) => {
       // Use user ID instead of IP
       return req.headers.authorization || req.ip;
     }
   });
   ```

2. **Store in Redis for distributed systems:**
   ```typescript
   import RedisStore from 'rate-limit-redis';
   import Redis from 'ioredis';

   const redis = new Redis(process.env.REDIS_URL);

   export const distributedLimiter = rateLimit({
     store: new RedisStore({
       client: redis,
       prefix: 'rl:'
     }),
     // ...
   });
   ```

## Security Considerations

### 1. DDoS Protection
Rate limiting helps mitigate DDoS attacks but is not a complete solution. Consider:
- CloudFlare for additional DDoS protection
- WAF (Web Application Firewall)
- IP blocking for known bad actors

### 2. Bot Detection
Rate limiting alone won't stop sophisticated bots. Add:
- CAPTCHA on analysis submission
- Request signature validation
- User-Agent analysis

### 3. Cost Management
The strict AI analysis limits directly control API costs:
- 10 requests/15min = max 96 requests/day per IP
- At ~$0.01 per request = $0.96/day per IP max
- Scale this by expected concurrent users

## Testing Rate Limits

### Manual Testing:

```bash
# Test analysis endpoint (should fail on 11th request)
for i in {1..15}; do
  curl -X POST http://localhost:8080/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"contentInput":"test"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

### Automated Testing:

```typescript
// In your test suite
describe('Rate Limiting', () => {
  it('should enforce analysis rate limits', async () => {
    const requests = [];

    // Make 11 requests (limit is 10)
    for (let i = 0; i < 11; i++) {
      requests.push(
        fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ contentInput: 'test' })
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    // First 10 should succeed (or fail for other reasons)
    // 11th should be 429
    expect(statuses.filter(s => s === 429).length).toBeGreaterThan(0);
  });
});
```

## Common Issues

### Issue: All requests show same IP (127.0.0.1 or proxy IP)

**Solution:** Enable trust proxy
```typescript
app.set('trust proxy', 1);
```

### Issue: Rate limits not working behind CloudFlare

**Solution:** Use CloudFlare-specific headers
```typescript
keyGenerator: (req) => {
  return req.headers['cf-connecting-ip'] || req.ip;
}
```

### Issue: Development limits too strict

**Solution:** Set environment to development
```env
NODE_ENV=development  # Uses higher limits
```

### Issue: Need different limits per API key/user

**Solution:** Implement custom key generator (see Per-User section)

## Related Documentation

- [Environment Variables](../README.md#environment-variables)
- [Deployment Guide](./DEPLOYMENT_ENV_VARS.md)
- [Security Best Practices](./PRODUCTION_READINESS.md#security)

---

**Need to adjust rate limits?** Update `server/.env` and restart the backend, or modify the middleware in [server/src/middleware/rateLimiter.ts](../server/src/middleware/rateLimiter.ts).
