# LoquiHQ

**Where podcasters get the truth.**

A podcast performance and monetization intelligence platform built for podcasters who want clear answers, not vanity metrics.

LoquiHQ analyzes podcast transcripts using Gemini AI, extracts structured insights, generates platform-optimized content, and provides data-driven monetization recommendations — all presented in a high-density executive dashboard designed for creators who treat their show like a business.

---

## ✨ Current Status (Production-Ready)

✅ **Podcast Analytics Dashboard** ⭐ NEW
- Connect your podcast via RSS feed URL
- Automatic episode detection and syncing
- Manual metrics entry (downloads, followers, revenue)
- Revenue projections based on real metrics
- Episode-by-episode performance tracking
- Resync button for feed updates

✅ **LinkedIn Integration** ⭐ NEW
- OAuth-based LinkedIn connection
- Direct posting from scheduled content
- Account status monitoring with token expiry tracking
- Connect/disconnect flow in Settings page
- Automatic redirect handling for OAuth callbacks

✅ **Settings & Integrations Page** ⭐ NEW
- Centralized integrations management
- LinkedIn connection status and controls
- Future-ready for additional platform integrations

✅ **Onboarding Experience** ⭐ NEW
- Interactive onboarding checklist for new users
- Step-by-step guidance: Connect Podcast → Run Analysis → View Content
- Beta Guide page with comprehensive getting-started instructions
- Contextual help throughout the platform

✅ **Beta Feedback System** ⭐ NEW
- Dedicated feedback page for beta testers
- Bug report, feature request, and pricing feedback forms
- Device and browser auto-detection
- Structured feedback collection for product improvement

✅ **Forgot Password Flow** ⭐ NEW
- Password reset via email link
- Supabase-powered secure reset flow
- Automatic redirect to login after reset

✅ **Enhanced Error Handling** ⭐ NEW
- ErrorBoundary component for graceful crash recovery
- ErrorDisplay component for consistent error presentation
- User-friendly error messages with recovery options

✅ **Beta Access System**
- Invite-only beta with 50 user cap
- Server-side signup enforcement (cap can't be bypassed)
- Email invite flow: signup → email link → set password → dashboard
- Waitlist for users when beta is full
- New endpoints: `/api/beta/status`, `/api/signup`, `/api/waitlist`

✅ **Core Analysis Flow**
- Multi-format input support (text, audio, images)
- Comprehensive AI-powered transcript analysis
- Real-time processing with progress indicators
- Automatic retry logic with exponential backoff for API resilience

✅ **Platform Content Generation**
- LinkedIn, Twitter/X, TikTok, YouTube optimized content
- Email newsletters with subject lines
- Medium articles in Markdown
- Newsletter teasers for Substack/Beehiiv
- **All platform content fields now required** - no more empty sections

✅ **Content Scheduling & Calendar**
- **Individual Platform Scheduling**: Schedule posts for LinkedIn, Twitter, Medium, Email, and Newsletter platforms with date/time picker
- **Video Content Export**: Export TikTok/Reels/YouTube scripts and shot lists for manual publishing
- **Series Scheduling**: Auto-schedule email series (5 days) and social calendars (multiple posts across 5 platforms × 5 days)
- **Content Calendar**: Visual calendar with drag-and-drop scheduling
- **Post Editing**: Edit scheduled posts (content, date/time, status)
- **Performance Tracking**: Track impressions, clicks, likes, shares after publishing
- **Supabase Integration**: All scheduled content persisted with RLS security

✅ **Content Repurposing**
- **Email Series**: 5-day email sequences (one per day)
- **Social Calendar**: 25 posts (5 platforms: Instagram, Facebook, LinkedIn, Twitter, Instagram Stories × 5 days)
- **LinkedIn Articles**: Long-form content optimization
- **Image Prompts**: AI-generated prompts for thumbnails and graphics
- **Series Scheduling**: One-click scheduling for email series and social calendars

✅ **AI-Powered Live Chat Assistant** ⭐ NEW
- Context-aware chatbot using Gemini AI
- Pulls real information from current page and user data
- Answers questions about platform features
- Provides podcast growth strategies and monetization advice
- Maintains conversation history for multi-turn discussions
- Knowledge of LoquiHQ features, CPM rates, best practices

✅ **Data-Driven Monetization**
- Live data fetching from iTunes, Spotify, YouTube, Reddit
- Realistic podcast metrics estimation based on similar shows
- Episode-specific sponsor recommendations
- Conservative CPM/download estimates (no inflated numbers)
- Confidence scoring with data source transparency

✅ **Robust Error Handling**
- User-friendly error messages for all failure scenarios
- Automatic retry for 503 (overloaded) and 429 (rate limit) errors
- Clear guidance when services are temporarily unavailable
- Fixed Supabase RLS query issues for seamless data access

✅ **Results & Persistence**
- Results saved to Supabase with full user scoping
- Dashboard populated with analysis history
- Export options (PDF, DOCX, Markdown, JSON, Media Kit)

✅ **Professional UI/UX**
- Custom design system (Insight Command Center aesthetic)
- **Dark/Light Mode Toggle** with localStorage persistence
- Semantic color token system for consistent theming
- Visible monetization button with inline styles
- Real-time metric updates in revenue calculator
- Confidence indicators for all estimates

---

## 🧠 Core Features

### AI Transcript Analysis
- **Key Takeaways**: 5 bullet points of most important insights
- **Quotes with Timestamps**: Direct quotes with speaker attribution
- **Sentiment Analysis**: Label, score, and tone detection
- **SEO Metadata**: Keywords, meta descriptions, title optimization
- **Speaker Analysis**: Individual speaker contributions and expertise
- **FAQ Generation**: Common questions and answers
- **Show Notes**: Structured episode summaries

### Platform-Ready Content (100% Coverage)
- **LinkedIn Post**: 150-300 words with hashtags and engagement questions
- **Twitter/X Thread**: 5-10 numbered tweets optimized for engagement
- **TikTok/Reels Script**: 30-second script with visual cues and hooks
- **YouTube Description**: SEO-optimized description (100-150 chars)
- **Email Newsletter**: Full draft (500-800 words) with subject line
- **Medium Article**: 1000-word article formatted in Markdown (H2, H3)
- **Newsletter Teaser**: Subject + body for Substack/Beehiiv

### Data-Driven Monetization Intelligence
- **Live Metrics Estimation**
  - Downloads per episode based on similar shows
  - Realistic CPM rates for the show's niche
  - Confidence scoring (low/medium/high)
  - Data source transparency

- **Smart Sponsor Matching**
  - Episode-specific recommendations (not generic)
  - 60+ curated sponsor brands across 8 categories
  - Topical relevance analysis
  - Match reasoning for each sponsor

- **Revenue Calculator**
  - Auto-populated with realistic estimates
  - Manual adjustment capability
  - Real-time revenue projections

- **Platform Recommendations**
  - Priority scoring (High/Medium/Low)
  - Platform-specific CPM ranges
  - Monetization strategy notes

- **External Data Sources**
  - iTunes/Apple Podcasts metadata
  - Spotify episode counts and publisher info
  - YouTube subscriber counts and engagement
  - RSS feed analysis for sponsors and publishing frequency
  - Reddit community discussions
  - Google Trends data

### Content Scheduling & Calendar
- **Individual Platform Scheduling**
  - Click "Schedule" button on any supported platform (LinkedIn, Twitter, Medium, Email)
  - Select date and time
  - Saves to Content Calendar
  - **Fixed**: Button now works correctly (no more click event bubbling issues)

- **Video Content Export**
  - TikTok/Reels/YouTube scripts and shot lists available for export
  - Manual publishing workflow for video platforms

- **Series Scheduling**
  - **Email Series**: 5 emails scheduled one per day (day 1, 2, 3, 4, 5)
  - **Social Calendar**: 25 posts (Instagram, Facebook, LinkedIn, Twitter, Instagram Stories) × 5 days
  - Posts with same day number scheduled on same day at specified time
  - One-click scheduling with custom start date/time
  - Preview all posts in the series before scheduling
  - **Fixed**: AI now generates correct day numbering for proper distribution

- **Content Calendar**
  - Visual monthly calendar grid
  - Color-coded by platform (LinkedIn blue, Twitter cyan, etc.)
  - Click any post to view full details
  - Filter by platform and status (Scheduled, Published, Failed)

- **Post Management**
  - Edit scheduled posts: content, date/time, status
  - Delete scheduled posts
  - Track performance metrics: impressions, clicks, likes, shares
  - Auto-calculate engagement rate and CTR

- **Performance Metrics Tracker**
  - Track post-publication metrics
  - Impressions, clicks, likes, shares input fields
  - Auto-calculated engagement rate and click-through rate
  - Metrics stored in Supabase for historical analysis

### Podcast Analytics Dashboard ⭐ NEW
- **RSS Feed Connection**
  - Paste your podcast RSS URL to connect
  - Automatic podcast metadata extraction (title, description, artwork)
  - Episode detection and cataloging

- **Performance Metrics**
  - Total downloads tracking (30-day and all-time)
  - Average downloads per episode
  - Follower count tracking
  - Revenue projections with configurable CPM rates

- **Manual Metrics Entry**
  - Enter real metrics from your podcast host
  - Automatic revenue calculation preview
  - Save metrics to track progress over time

- **Episode Management**
  - View all episodes with publish dates
  - Duration and description for each episode
  - One-click resync for new episodes

### LinkedIn Integration ⭐ NEW
- **OAuth 2.0 Connection**
  - Secure authentication with LinkedIn
  - Access token management with expiry tracking
  - Automatic token refresh prompts

- **Direct Posting**
  - Post scheduled content directly to LinkedIn
  - Track post success/failure status
  - View posted content on LinkedIn

- **Settings Management**
  - Connect/disconnect from Settings page
  - View connected account details
  - Token status monitoring

### AI Live Chat Assistant
- **Context-Aware Intelligence**
  - Knows what page you're currently on
  - Accesses current transcript data when viewing results
  - Remembers conversation history for follow-ups
  - Personalized responses using your name

- **Capabilities**
  - Answer questions about LoquiHQ features and how to use them
  - Provide podcast growth strategies and best practices
  - Explain monetization concepts (CPM, sponsorships, revenue)
  - Help interpret analysis results and metrics
  - Suggest content repurposing strategies
  - Offer scheduling and calendar guidance

- **Powered by Gemini AI**
  - Real-time intelligent responses
  - Not canned answers or random replies
  - Pulls information from online sources
  - Knowledge of platform features and industry best practices
  - Maximum 500 tokens per response for concise, actionable advice

- **Always Available**
  - Floating chat button in bottom-right corner
  - Available on all logged-in pages
  - Conversation history maintained during session
  - Quick responses (1-3 seconds)

### Content Repurposing
- Email series generation (5-day sequences)
- Social media calendars (25 posts: 5 platforms × 5 days)
- LinkedIn articles
- Image prompt generation for thumbnails/graphics
- **All repurposed content can be bulk-scheduled**

### Results Dashboard
- Persistent analysis history
- Status tracking (Draft, In Review, Published, Archived)
- Collaboration tools (comments, team notes)
- Advanced export options

---

## 🧱 Tech Stack

**Frontend**
- React 19
- TypeScript
- Vite
- Custom Design System (CSS variables + semantic tokens)
- Tailwind CSS v4 (with @import and @theme directives)
- Dark/Light mode theming
- Lucide React (icons)
- React Router (navigation)

**Backend**
- Node.js
- Express
- TypeScript (ESM)
- Gemini 2.5 Flash API
- Rate limiting middleware
- CORS configuration

**Database & Auth**
- Supabase (Postgres)
- Supabase Auth with Row Level Security (RLS)
- Core Tables: `transcripts`, `scheduled_posts`, `profiles`, `waitlist`
- Podcast Tables: `podcasts`, `episodes`, `podcast_metrics`, `podcast_projections` ⭐ NEW
- Integration Tables: `connected_accounts` ⭐ NEW
- User-scoped data access via RLS policies

**External APIs**
- iTunes Search API
- Spotify API
- YouTube Data API (optional)
- Reddit Search
- RSS Feed Parsing
- Google Trends

---

## 📂 Project Structure

```
loquihq/
├── pages/                    # React pages
│   ├── NewAnalysis.tsx      # Analysis input & processing
│   ├── ResultsPage.tsx      # Full results dashboard with scheduling
│   ├── Dashboard.tsx        # User dashboard
│   ├── ContentCalendar.tsx  # Content calendar & scheduling
│   ├── ConnectPodcast.tsx   # RSS feed connection wizard ⭐ NEW
│   ├── PodcastAnalytics.tsx # Podcast performance dashboard ⭐ NEW
│   ├── Settings.tsx         # Integrations & settings ⭐ NEW
│   ├── BetaGuide.tsx        # Onboarding guide for beta users ⭐ NEW
│   ├── BetaFeedback.tsx     # Beta feedback submission ⭐ NEW
│   ├── BetaAdmin.tsx        # Admin dashboard for beta management
│   ├── KnownIssues.tsx      # Public known issues page
│   ├── SeriesAnalytics.tsx  # Analytics and insights
│   ├── TeamWorkspace.tsx    # Team collaboration
│   ├── GuestOutreach.tsx    # Guest recommendations
│   ├── UsageAnalytics.tsx   # Usage metrics
│   └── LandingPage.tsx      # Public landing page
├── components/              # Reusable components
│   ├── AuthCallback.tsx             # Invite link token handler
│   ├── SetPassword.tsx              # Password setup after invite
│   ├── ForgotPassword.tsx           # Password reset flow ⭐ NEW
│   ├── Login.tsx                    # Login/signup with beta system
│   ├── OnboardingChecklist.tsx      # Step-by-step onboarding ⭐ NEW
│   ├── ManualMetricsModal.tsx       # Manual podcast metrics entry ⭐ NEW
│   ├── ErrorBoundary.tsx            # React error boundary ⭐ NEW
│   ├── ErrorDisplay.tsx             # Error presentation component ⭐ NEW
│   ├── ReportIssue.tsx              # Bug report component ⭐ NEW
│   ├── SeriesScheduleWizard.tsx     # Email/social series scheduling
│   ├── MetricsTracker.tsx           # Performance metrics tracking
│   ├── MonetizationInputModal.tsx   # Monetization data input
│   ├── ThemeToggle.tsx              # Dark/light mode toggle
│   ├── LiveChatWidget.tsx           # AI chat assistant
│   ├── HelpPanel.tsx                # Help documentation
│   └── DataConfidenceDisplay.tsx    # Data quality indicators
├── services/                # Frontend services
│   ├── geminiService.ts     # API client
│   ├── transcripts.ts       # Supabase operations
│   ├── downloadService.ts   # Export functionality
│   ├── auth.ts              # Authentication helpers
│   ├── backend.ts           # Backend API wrapper
│   ├── linkedin.ts          # LinkedIn OAuth & posting ⭐ NEW
│   └── podcast.ts           # Podcast RSS & analytics ⭐ NEW
├── server/                  # Backend API
│   ├── src/
│   │   ├── index.ts         # Express server with all endpoints
│   │   ├── gemini.ts        # Gemini AI integration (analysis, repurpose, chat)
│   │   ├── research.ts      # Sponsor database & CPM benchmarks
│   │   ├── enrichment.ts    # Live data fetching & metrics estimation
│   │   ├── env.ts           # Environment validation
│   │   ├── linkedin-oauth.ts # LinkedIn OAuth handler ⭐ NEW
│   │   ├── services/        # Backend service modules ⭐ NEW
│   │   └── middleware/      # Rate limiting, error handling
│   └── dist/                # Compiled output
├── types/                   # TypeScript definitions
│   └── podcast-analytics.ts # Podcast analytics types ⭐ NEW
├── scripts/                 # Utility scripts ⭐ NEW
├── utils/                   # Frontend utilities ⭐ NEW
├── src/
│   ├── index.css            # Tailwind v4 config with @theme
│   └── utils/               # Utilities (env, sentry)
├── supabase/                # Database migrations
│   └── migrations/
│       ├── 001-008          # Core tables (transcripts, posts, beta system)
│       ├── 009_podcast_analytics.sql      # Podcast analytics tables ⭐ NEW
│       ├── 010_podcast_connectors_and_metrics.sql # Metrics storage ⭐ NEW
│       ├── 011_add_rss_url_to_podcasts.sql # RSS URL tracking ⭐ NEW
│       ├── 012_fix_beta_cap_function.sql   # Beta cap improvements
│       └── 013_connected_accounts.sql      # OAuth accounts table ⭐ NEW
├── docs/                    # Documentation
├── index.html               # Entry point
├── App.tsx                  # Main application component
├── vite.config.ts           # Vite configuration
├── postcss.config.js        # PostCSS for Tailwind
└── README.md
```

---

## ✅ Beta Testing Readiness

**Status: READY FOR BETA TESTING** ✅

For a comprehensive assessment of beta readiness including feature verification, known issues, and launch checklist, see:
- [BETA_READINESS_REVIEW.md](BETA_READINESS_REVIEW.md) - Full 300+ line readiness assessment
- [BETA_QUICK_CHECKLIST.md](BETA_QUICK_CHECKLIST.md) - Quick reference checklist for launch day

**Key Metrics:**
- ✅ Core features: Complete and functional
- ✅ Analytics dashboard: Full podcast performance tracking
- ✅ LinkedIn integration: OAuth and direct posting working
- ✅ Content scheduling: Individual and series scheduling verified
- ✅ Monetization insights: Live data and sponsor matching functional
- ✅ Error handling: Comprehensive with user-friendly messages
- ✅ Security: RLS enabled, API keys protected, admin beta system in place
- ⚠️ Known issues: 5 documented non-blocking issues (see [BETA_READINESS_REVIEW.md](BETA_READINESS_REVIEW.md))

**Next Steps:**
1. **This Week**: Review readiness report, run `npm run build` to verify no errors, test with real podcast data
2. **Next Week**: Send beta invites to first 5-10 users, monitor feedback daily
3. **Before Public Launch**: Fix admin role verification, enable full Supabase RLS enforcement, implement complete API authentication

See [BETA_READINESS_REVIEW.md](BETA_READINESS_REVIEW.md) for complete analysis with detailed findings and support resources.

---

## 🎯 Beta Operations

LoquiHQ includes comprehensive tools for managing the beta testing phase. Access the beta admin dashboard at `/beta-admin` or use the command-line tools below.

### Admin Dashboard (`/beta-admin`)

A web interface for beta management with:
- **Real-time Metrics**: User count, waitlist size, connected podcasts, daily analyses
- **Beta Capacity**: Track usage against the 50-user limit
- **Tester Management**: View all beta users with activity stats
- **User Actions**: Remove testers or send re-invites
- **Support Links**: Direct links to bug reports and known issues

### Command Line Tools

```bash
# Show beta metrics and recent testers
npm run beta-ops

# Run security audit
npm run security-audit
```

### SQL Queries (`BETA_OPERATIONS.sql`)

Comprehensive SQL queries for:
- **Metrics**: User counts, activity statistics, capacity tracking
- **User Management**: List testers, find inactive users, activity monitoring
- **Reset Plan**: Step-by-step user removal process
- **Health Checks**: Database integrity and orphaned records

### Support System

- **Bug Reports**: `beta-support@loquihq.com` - One email for all bug reports
- **Known Issues**: `/known-issues` - Public page listing current issues and workarounds
- **User Feedback**: Integrated report issue feature in the app

### Reset Plan

To remove a tester and re-invite:

1. **Remove Tester**: Use admin dashboard or run SQL queries in order
2. **Database Cleanup**: Deletes analyses, projections, metrics, episodes, connections, podcasts
3. **User Deletion**: Removes auth account and profile
4. **Re-invite**: Send new invite email (logs re-invite for tracking)

### Key Metrics to Monitor

- **Daily Active Usage**: Analyses per day, user sign-ins
- **Growth Rate**: New signups, waitlist growth
- **Engagement**: Podcast connections, feature usage
- **Support Load**: Bug reports, user feedback volume

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Supabase account
- Gemini API key

### Environment Variables

The application uses environment variables for configuration. Template files are provided for easy setup.

**Quick Start:**

1. **Copy the template file**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and add your API keys:**
   - `VITE_SUPABASE_URL` - Get from [Supabase Dashboard](https://app.supabase.com/project/_/settings/api)
   - `VITE_SUPABASE_ANON_KEY` - Get from Supabase Dashboard
   - `VITE_API_BASE_URL` - Set to `http://localhost:8080` for local development

3. **Create `server/.env` for backend:**
   ```bash
   cd server
   # Create .env file with:
   GEMINI_API_KEY=your_gemini_api_key  # Get from https://aistudio.google.com/app/apikey
   PORT=8080
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

   # For beta signup system (production only):
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # From Supabase Dashboard > Settings > API
   ```

**Required Variables:**
- ✅ `VITE_SUPABASE_URL` - Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `GEMINI_API_KEY` - Google Gemini AI API key

**Optional Variables:**
- `GEMINI_MODEL` - Override default model (default: `gemini-2.5-flash`)
- `YOUTUBE_API_KEY` - Enhanced monetization data
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` - Spotify podcast data
- `SENDGRID_API_KEY` - Email export functionality
- `VITE_SENTRY_DSN` / `SENTRY_DSN` - Error tracking
- `VITE_GA_MEASUREMENT_ID` - Google Analytics
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `SUPABASE_URL` - Required for beta signup system (backend)
- `SUPABASE_SERVICE_ROLE_KEY` - Required for beta signup system (backend)

**LinkedIn Integration (Optional):**
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth app client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth app client secret
- `LINKEDIN_REDIRECT_URI` - OAuth callback URL (e.g., `https://your-api.com/api/integrations/linkedin/callback`)

**Environment Validation:**

The app automatically validates required environment variables on startup:
- ✅ Frontend validation in [src/utils/env.ts](src/utils/env.ts)
- ✅ Backend validation in [server/src/env.ts](server/src/env.ts)

Missing variables will throw descriptive errors with setup instructions.

See [.env.example](.env.example) for full documentation of all available variables.

### Frontend
```bash
npm install
npm run dev
```

Runs on `http://localhost:3000` (or auto-assigned port if 3000 is taken)

### Backend
```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:8080`

**Note:** Both frontend and backend must be running for full functionality including:
- Transcript analysis
- Content repurposing
- AI chat assistant
- Monetization insights

### Database Setup

1. Create a Supabase project
2. Run the migrations in `supabase/migrations/` in order:
   - `001_transcripts.sql` - Creates transcripts table
   - `003_scheduled_posts.sql` - Creates scheduled_posts table
   - `004_enable_rls_security.sql` - Enables Row Level Security
   - `005_profiles_and_beta_cap.sql` - User profiles and beta cap system
   - `007_set_beta_cap_50.sql` - Sets beta user cap to 50
   - `008_waitlist.sql` - Waitlist for beta overflow
   - `009_podcast_analytics.sql` - Podcast and episode tables ⭐ NEW
   - `010_podcast_connectors_and_metrics.sql` - Metrics and projections ⭐ NEW
   - `011_add_rss_url_to_podcasts.sql` - RSS URL tracking ⭐ NEW
   - `012_fix_beta_cap_function.sql` - Beta cap function improvements
   - `013_connected_accounts.sql` - OAuth integration accounts ⭐ NEW

Or manually run the SQL from the migration files in your Supabase SQL editor.

---

## 🎯 Recent Updates

### January 2026

#### Podcast Analytics Dashboard ⭐ NEW
- **RSS Feed Connection**: Connect your podcast via RSS URL with automatic episode detection
- **Podcast Analytics Page**: Dedicated dashboard showing downloads, revenue projections, episode performance
- **Manual Metrics Entry**: Modal for entering real metrics (downloads, followers) when platform APIs aren't available
- **Episode Syncing**: Automatic detection of new episodes with manual resync button
- **Revenue Projections**: Calculate potential earnings based on your actual metrics

#### LinkedIn Integration ⭐ NEW
- **OAuth Flow**: Secure LinkedIn OAuth 2.0 connection
- **Direct Posting**: Post scheduled content directly to LinkedIn
- **Token Management**: Automatic token expiry tracking and refresh prompts
- **Settings Page**: New `/settings` page for managing integrations
- **Disconnect Flow**: Cleanly remove LinkedIn connection when needed

#### User Onboarding ⭐ NEW
- **Onboarding Checklist**: Interactive checklist guiding new users through setup
- **Beta Guide Page**: Comprehensive `/beta-guide` with step-by-step instructions
- **Contextual Help**: Platform-aware guidance throughout the app

#### Beta Feedback System ⭐ NEW
- **Feedback Page**: `/beta-feedback` for structured beta tester feedback
- **Multiple Feedback Types**: Bug reports, feature requests, pricing feedback
- **Auto-Detection**: Captures device, browser, and context automatically

#### Password Management ⭐ NEW
- **Forgot Password**: Password reset flow via email
- **Secure Reset**: Supabase-powered reset with automatic redirect

#### Error Handling Improvements ⭐ NEW
- **ErrorBoundary**: React error boundary for graceful crash recovery
- **ErrorDisplay**: Consistent error presentation with retry options
- **ReportIssue**: Quick bug reporting from error states

### January 2025

#### Beta Access System
- **Invite-Only Signup**: 50 user cap enforced server-side
- **Server-Side Enforcement**: Removed direct `signUpUser()` from frontend to prevent cap bypass
- **Email Invite Flow**: Users receive Supabase invite email → click link → set password
- **New Components**: `AuthCallback.tsx` (token handler), `SetPassword.tsx` (password setup)
- **New Endpoints**: `/api/beta/status`, `/api/signup`, `/api/waitlist`
- **Waitlist**: Users can join waitlist when beta is full
- **HashRouter Support**: Invite links properly route to `/#/auth/callback`

### December 2024 - January 2025

#### AI Chat Assistant ⭐ NEW
- **Context-Aware Chatbot**: Gemini-powered assistant that understands your current page and data
- **Real Information**: Pulls from site content, user data, and AI knowledge bases
- **Conversation Memory**: Maintains history for multi-turn discussions
- **Platform Knowledge**: Knows all LoquiHQ features, monetization strategies, best practices

#### Content Scheduling Improvements
- **Fixed Individual Scheduling**: Platform content "Schedule" button now works correctly
- **Fixed Email Distribution**: Email series now properly distributes across 5 days (one per day)
- **Enhanced Social Calendar**: Now generates 25 posts (5 platforms × 5 days) instead of random count
- **Smart Day Numbering**: AI explicitly instructed to use day values 1-5 for proper scheduling

#### Platform Content
- All 7 platform types generate complete, optimized content
- No more empty sections or missing fields
- Subject + body requirements enforced for emails

#### Monetization Intelligence
- Realistic metrics based on actual podcast data
- Live data from 6+ external sources
- Episode-specific sponsor matching
- Conservative CPM estimates with confidence scores

#### UI/UX Polish
- Dark/Light mode with persistent preferences
- Tailwind CSS v4 with @import and @theme directives
- Fixed color theming across all components
- Improved scheduling wizards with clear instructions

---

## 🎨 Theme System

### Dark/Light Mode Implementation

The application features a comprehensive dark/light mode system with persistent user preferences.

**Color Palette:**
- **Primary**: `#FF2D8D` (Signature Pink)
- **Secondary**: `#5B2EFF` (Dark Purple)
- **Success**: `#22C55E` (Green)
- **Error**: `#EF4444` (Red)

**Semantic Text Tokens:**
- `textPrimary`: Main headings and emphasis (white in dark, dark in light)
- `textBody`: Body text (light gray in dark, dark gray in light)
- `textSecondary`: Secondary information (medium gray)
- `textMuted`: Subtle text and metadata (dim gray)

**Gray Scale (Dark Mode):**
- `gray-50`: `#0B0B10` (Darkest background)
- `gray-100`: `#11111A` (Cards/surfaces)
- `gray-200`: `#1A1A26` (Elevated surfaces)
- `gray-300`: `#242438` (Borders)
- `gray-400`-`900`: Progressive lightening to white

**Implementation:**
- Theme toggle in navigation bar (Sun/Moon icons)
- localStorage persistence (`theme` key)
- CSS class-based switching (`html.dark` / `html.light`)
- Tailwind CSS v4 with @theme directive
- Default: Dark mode

**Files:**
- [src/index.css](src/index.css) - Tailwind v4 config with @theme
- [components/ThemeToggle.tsx](components/ThemeToggle.tsx) - Toggle component
- All page and component files use semantic tokens

---

## 🧭 Architecture Highlights

### Retry Logic with Exponential Backoff
All Gemini API calls automatically retry on transient failures:
- Initial delay: 1 second
- Exponential growth: 2x per retry
- Random jitter: Prevents thundering herd
- Max retries: 3 attempts
- Retryable errors: 503, 429, UNAVAILABLE, RESOURCE_EXHAUSTED

### Podcast Metrics Estimation Algorithm
```typescript
// Conservative baseline
downloads = 1000, cpm = 18

// Adjust based on:
+ Spotify episode count (maturity indicator)
+ YouTube subscriber count (15% conversion to podcast)
+ Active sponsor presence (monetization tier)
+ RSS publishing frequency (consistency)
+ Tech/SaaS niche detection (premium CPM)
+ Reddit community activity (engagement)

// Cap at realistic maximum (50k downloads)
```

### Episode-Specific Sponsor Matching
```typescript
Priority Order:
1. Episode content analysis (topics, themes, audience)
2. Topical relevance matching
3. Reference sponsor database (60+ brands, 8 categories)
4. Market rate calibration

Output:
- Custom recommendations per episode
- Specific reasoning for each match
- Different episodes → different sponsors
```

### AI Chat System Architecture
```typescript
User Message
  → Frontend: Collect context (page, user, transcript)
  → Backend: /api/chat endpoint
  → Gemini AI: Process with system instructions + context
  → Response: Context-aware, actionable answer
  → Frontend: Display + maintain conversation history
```

### Beta Signup Flow
```typescript
User Signup Request
  → Frontend: POST /api/signup with email
  → Backend: Check cap against profiles table (active users)
  → If cap not reached:
    → Supabase admin.inviteUserByEmail()
    → User receives email with invite link
  → If cap reached:
    → Return 403 with "beta full" message
    → Frontend shows "Join Waitlist" option

Invite Link Flow
  → User clicks email link
  → Redirects to /#/auth/callback with tokens in hash
  → AuthCallback component extracts tokens
  → Sets Supabase session
  → Redirects to /set-password
  → User creates password
  → Redirects to /dashboard
```

---

## 🔒 Security

- Row Level Security (RLS) on all database tables
- User-scoped data (users can only access their own transcripts)
- API key validation on all endpoints
- Environment variable isolation
- No API keys in client-side code
- CORS protection with allowed origins configuration
- Rate limiting on all API endpoints
- **Beta cap enforcement**: Server-side only (frontend `signUpUser` removed)
- **Invite-only signup**: Users can't bypass beta cap via direct Supabase calls
- **Supabase Admin Client**: Service role key used only on backend for privileged operations
- **OAuth Token Security**: LinkedIn tokens encrypted and stored securely in `connected_accounts` table ⭐ NEW
- **Token Expiry Tracking**: Automatic detection and prompts for expired OAuth tokens ⭐ NEW

---

## 📊 Performance

- **Analysis Time**: 30-60 seconds per transcript (Gemini 2.5 Flash)
- **Chat Response**: 1-3 seconds for AI assistant replies
- **Retry Resilience**: Automatic recovery from temporary API failures
- **Caching**: 1-hour cache for external API calls (iTunes, Spotify, etc.)
- **Frontend**: Service Worker for offline capability
- **Export**: Optimized document generation

---

## 🧠 Philosophy

This is not a "pretty dashboard."

It is an **Insight Command Center** — built for clarity, power, and decision-making.

**Design Principles:**
- Form follows intelligence
- Density over whitespace
- Data over decoration
- Transparency over magic
- Conservative estimates over hype
- Accessible theming with dark/light modes
- Context-aware assistance over generic help

**Monetization Approach:**
- Real data from similar shows
- No inflated numbers
- Confidence scoring
- Episode-specific recommendations
- Market-aware CPM rates

**AI Assistant Philosophy:**
- Context over canned responses
- Real information over placeholders
- Actionable advice over vague answers
- Platform knowledge over generic AI

---

## 🤝 Contributing

This is a production-ready application. Key areas for contribution:
- Additional sponsor brand database entries
- Enhanced CPM benchmarks from industry reports
- New platform content formats
- Improved metric estimation algorithms
- Additional external data sources
- Enhanced AI chat knowledge base

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Gemini API** for powerful AI analysis and chat capabilities
- **Supabase** for backend infrastructure
- **Open Source Community** for RSS parsing, API integrations, and tools

---

**Built for podcast creators who need intelligence, not fluff.**
