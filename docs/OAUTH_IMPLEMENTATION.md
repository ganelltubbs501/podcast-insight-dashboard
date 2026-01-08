# OAuth Implementation Guide for Social Media Posting

This document outlines the implementation strategy for OAuth-based social media posting across multiple platforms.

## Overview

Currently, the application supports **scheduling** posts to various platforms. To enable **automatic posting**, we need to implement OAuth authentication and platform-specific APIs.

## Supported Platforms

1. **LinkedIn** - LinkedIn API v2
2. **Twitter/X** - Twitter API v2
3. **YouTube** - YouTube Data API v3
4. **Medium** - Medium API
5. **Email** - SMTP or email service APIs (SendGrid, Mailchimp, etc.)

## Architecture

### 1. Backend OAuth Routes

Create new Express routes in `server/src/index.ts`:

```typescript
// OAuth initiation endpoints
app.get('/api/oauth/:platform/init', async (req, res) => {
  const { platform } = req.params;
  const { userId } = req.query;

  // Generate OAuth URL for the platform
  const authUrl = generateOAuthUrl(platform, userId);
  res.json({ authUrl });
});

// OAuth callback endpoints
app.get('/api/oauth/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state } = req.query;

  // Exchange code for access token
  const tokens = await exchangeCodeForTokens(platform, code);

  // Store tokens in Supabase user_oauth_tokens table
  await saveOAuthTokens(state, platform, tokens);

  res.redirect('/settings?oauth=success');
});

// Post publishing endpoint
app.post('/api/publish/:platform', async (req, res) => {
  const { platform } = req.params;
  const { content, userId } = req.body;

  // Get stored OAuth tokens
  const tokens = await getOAuthTokens(userId, platform);

  // Publish to platform
  const result = await publishToплатform(platform, content, tokens);

  res.json(result);
});
```

### 2. Database Schema for OAuth Tokens

Create a new Supabase migration:

```sql
-- supabase/migrations/004_oauth_tokens.sql

create table if not exists user_oauth_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('linkedin', 'twitter', 'youtube', 'medium', 'email')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(user_id, platform)
);

-- Enable Row Level Security
alter table user_oauth_tokens enable row level security;

-- RLS policies
create policy "Users can view their own tokens"
  on user_oauth_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tokens"
  on user_oauth_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tokens"
  on user_oauth_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tokens"
  on user_oauth_tokens for delete
  using (auth.uid() = user_id);
```

### 3. Platform-Specific Implementation

## LinkedIn

**OAuth Flow:**
- Redirect to: `https://www.linkedin.com/oauth/v2/authorization`
- Scope: `w_member_social` (post on behalf of user)
- Exchange code at: `https://www.linkedin.com/oauth/v2/accessToken`

**Posting API:**
```typescript
async function publishToLinkedIn(content: string, accessToken: string) {
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    })
  });

  return response.json();
}
```

**Rate Limits:** 500 requests per user per day

---

## Twitter/X

**OAuth Flow:**
- OAuth 2.0 with PKCE
- Redirect to: `https://twitter.com/i/oauth2/authorize`
- Scope: `tweet.read tweet.write users.read`
- Exchange code at: `https://api.twitter.com/2/oauth2/token`

**Posting API:**
```typescript
async function publishToTwitter(content: string, accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: content
    })
  });

  return response.json();
}
```

**Rate Limits:**
- Free tier: 1,500 tweets per month
- Basic tier ($100/mo): 3,000 tweets per month
- Pro tier ($5,000/mo): Unlimited

---

## YouTube

**OAuth Flow:**
- Redirect to: `https://accounts.google.com/o/oauth2/v2/auth`
- Scope: `https://www.googleapis.com/auth/youtube.upload`
- Exchange code at: `https://oauth2.googleapis.com/token`

**Posting API (YouTube Shorts):**
```typescript
async function publishToYouTube(content: string, accessToken: string, videoFile: Buffer) {
  // Upload video
  const uploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: videoFile
  });

  // Set metadata
  const metadata = {
    snippet: {
      title: content.substring(0, 100),
      description: content,
      categoryId: '22' // People & Blogs
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false
    }
  };

  return uploadResponse.json();
}
```

**Note:** YouTube requires video content, not just text. Consider generating short video clips from audio or using text-to-video services.

**Rate Limits:** 10,000 quota units per day (upload = 1,600 units)

---

## Medium

**OAuth Flow:**
- Redirect to: `https://medium.com/m/oauth/authorize`
- Scope: `basicProfile,publishPost`
- Exchange code at: `https://api.medium.com/v1/tokens`

**Posting API:**
```typescript
async function publishToMedium(content: string, title: string, accessToken: string) {
  // Get user ID
  const userResponse = await fetch('https://api.medium.com/v1/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const { data: { id } } = await userResponse.json();

  // Publish post
  const response = await fetch(`https://api.medium.com/v1/users/${id}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: title,
      contentFormat: 'markdown',
      content: content,
      publishStatus: 'public'
    })
  });

  return response.json();
}
```

**Rate Limits:** No official limit, but recommended < 100 requests/hour

---

## Email Newsletter

**Option 1: Direct SMTP (For individual emails)**

```typescript
import nodemailer from 'nodemailer';

async function sendEmail(to: string, subject: string, body: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: to,
    subject: subject,
    html: body
  });
}
```

**Option 2: SendGrid API (For bulk emails)**

```typescript
async function sendViaSendGrid(to: string[], subject: string, body: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: to.map(email => ({ to: [{ email }] })),
      from: { email: process.env.FROM_EMAIL },
      subject: subject,
      content: [{
        type: 'text/html',
        value: body
      }]
    })
  });

  return response.json();
}
```

**Option 3: Mailchimp API (For newsletter campaigns)**

No OAuth needed - uses API key. Best for scheduled newsletter campaigns with subscriber lists.

---

## Frontend Implementation

### 1. Settings Page OAuth Connections

Create a new section in Settings:

```tsx
// components/OAuthConnections.tsx
import React, { useEffect, useState } from 'react';
import { Linkedin, Twitter, Youtube, FileType, CheckCircle, XCircle } from 'lucide-react';

const OAuthConnections: React.FC = () => {
  const [connections, setConnections] = useState({
    linkedin: false,
    twitter: false,
    youtube: false,
    medium: false
  });

  const handleConnect = async (platform: string) => {
    const response = await fetch(`/api/oauth/${platform}/init?userId=${userId}`);
    const { authUrl } = await response.json();
    window.location.href = authUrl;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-textPrimary">Connected Platforms</h3>
      {[
        { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
        { id: 'twitter', icon: Twitter, label: 'Twitter / X' },
        { id: 'youtube', icon: Youtube, label: 'YouTube' },
        { id: 'medium', icon: FileType, label: 'Medium' }
      ].map(platform => (
        <div key={platform.id} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border">
          <div className="flex items-center gap-3">
            <platform.icon className="h-5 w-5" />
            <span className="font-medium">{platform.label}</span>
          </div>
          {connections[platform.id] ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <button
              onClick={() => handleConnect(platform.id)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 2. Auto-Publish Option in Schedule Modal

Update the schedule modal to include "Publish Now" option:

```tsx
<div className="mb-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={autoPublish}
      onChange={(e) => setAutoPublish(e.target.checked)}
    />
    <span className="text-sm font-medium">Publish automatically when scheduled time arrives</span>
  </label>
  <p className="text-xs text-textMuted mt-1">
    Requires {platform} account connection in Settings
  </p>
</div>
```

---

## Scheduled Publishing Worker

Create a background worker that checks for posts scheduled for publishing:

```typescript
// server/src/worker.ts
import { CronJob } from 'cron';
import { supabase } from './supabase';

// Run every minute
const job = new CronJob('* * * * *', async () => {
  const now = new Date().toISOString();

  // Find posts scheduled for now
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'Scheduled')
    .lte('scheduled_date', now);

  for (const post of posts || []) {
    try {
      // Get user's OAuth tokens
      const { data: tokens } = await supabase
        .from('user_oauth_tokens')
        .select('*')
        .eq('user_id', post.user_id)
        .eq('platform', post.platform)
        .single();

      if (!tokens) {
        throw new Error(`No OAuth token found for ${post.platform}`);
      }

      // Publish to platform
      const result = await publishToPlatform(post.platform, post.content, tokens.access_token);

      // Update post status
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'Published',
          metrics: { platformId: result.id }
        })
        .eq('id', post.id);

      console.log(`Published post ${post.id} to ${post.platform}`);
    } catch (error) {
      console.error(`Failed to publish post ${post.id}:`, error);

      // Mark as failed
      await supabase
        .from('scheduled_posts')
        .update({ status: 'Failed' })
        .eq('id', post.id);
    }
  }
});

job.start();
```

Run this worker as a separate process:
```bash
node server/dist/worker.js
```

Or use a service like **Supabase Edge Functions** or **AWS Lambda** for serverless execution.

---

## Security Considerations

1. **Token Encryption**: Store OAuth tokens encrypted in the database
   ```typescript
   import crypto from 'crypto';

   const encrypt = (text: string) => {
     const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
     return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
   };
   ```

2. **Token Refresh**: Implement automatic token refresh for expired tokens
   ```typescript
   async function refreshToken(platform: string, refreshToken: string) {
     const response = await fetch(getRefreshUrl(platform), {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         grant_type: 'refresh_token',
         refresh_token: refreshToken,
         client_id: process.env[`${platform.toUpperCase()}_CLIENT_ID`],
         client_secret: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]
       })
     });

     return response.json();
   }
   ```

3. **Scope Limitation**: Request only necessary OAuth scopes
4. **Rate Limit Handling**: Implement exponential backoff and queue systems
5. **HTTPS Only**: Ensure OAuth callbacks use HTTPS in production

---

## Environment Variables Required

```env
# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/oauth/linkedin/callback

# Twitter
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_REDIRECT_URI=https://yourdomain.com/api/oauth/twitter/callback

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/oauth/youtube/callback

# Medium
MEDIUM_CLIENT_ID=your_client_id
MEDIUM_CLIENT_SECRET=your_client_secret
MEDIUM_REDIRECT_URI=https://yourdomain.com/api/oauth/medium/callback

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=LoquiHQ <noreply@yourdomain.com>

# Or SendGrid
SENDGRID_API_KEY=your_api_key

# Security
ENCRYPTION_KEY=your_32_byte_encryption_key
```

---

## Testing Strategy

1. **Development**: Use OAuth sandbox/test environments where available
2. **Rate Limits**: Implement rate limit testing with mock data
3. **Error Handling**: Test token expiration, network failures, API errors
4. **Manual Testing**: Create test posts on each platform
5. **Monitoring**: Set up logging and alerts for failed publications

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1)
- Create OAuth tokens table
- Build OAuth flow routes
- Implement Settings page connections UI

### Phase 2: Platform Integration (Week 2-3)
- LinkedIn integration
- Twitter integration
- Medium integration

### Phase 3: Worker & Auto-Publishing (Week 4)
- Build publishing worker
- Implement token refresh
- Add auto-publish option to scheduler

### Phase 4: YouTube & Email (Week 5)
- YouTube integration (requires video generation)
- Email newsletter integration
- Bulk email support

### Phase 5: Testing & Polish (Week 6)
- End-to-end testing
- Error handling refinement
- Documentation

---

## Alternative: Use Social Media Management SDKs

Consider using existing SDKs to simplify integration:

- **Buffer API**: Multi-platform posting (LinkedIn, Twitter, Facebook)
- **Hootsuite API**: Enterprise-grade scheduling
- **Ayrshare API**: Developer-friendly multi-platform API

These services handle OAuth, rate limits, and platform-specific quirks, but add recurring costs.

---

## Recommended Next Steps

1. Start with **LinkedIn** as it has the simplest OAuth flow
2. Implement **Settings page** OAuth connections UI
3. Build **publishing worker** for scheduled posts
4. Add remaining platforms incrementally
5. Monitor platform API changes and deprecations

---

## Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api)
- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Medium API Documentation](https://github.com/Medium/medium-api-docs)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
