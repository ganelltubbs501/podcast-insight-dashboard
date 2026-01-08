# LoquiHQ

**Where podcasters get the truth.**

A podcast performance and monetization intelligence platform built for podcasters who want clear answers, not vanity metrics.

LoquiHQ analyzes podcast transcripts using Gemini AI, extracts structured insights, generates platform-optimized content, and provides data-driven monetization recommendations — all presented in a high-density executive dashboard designed for creators who treat their show like a business.

---

## ✨ Current Status (Production-Ready)

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
- **Bulk Scheduling**: Schedule all platforms at once with staggered timing
- **Series Scheduling**: Auto-schedule email series (5 days) and social calendars (25 posts across 5 platforms × 5 days)
- **Individual Platform Scheduling**: Schedule posts for specific platforms with date/time picker
- **Content Calendar**: Visual calendar with drag-and-drop scheduling
- **Post Editing**: Edit scheduled posts (content, date/time, status)
- **Performance Tracking**: Track impressions, clicks, likes, shares after publishing
- **Supabase Integration**: All scheduled content persisted with RLS security

✅ **Content Repurposing**
- **Email Series**: 5-day email sequences (one per day)
- **Social Calendar**: 25 posts (5 platforms: Instagram, Facebook, LinkedIn, Twitter, Instagram Stories × 5 days)
- **LinkedIn Articles**: Long-form content optimization
- **Image Prompts**: AI-generated prompts for thumbnails and graphics
- **Schedule All**: One-click scheduling for entire series with smart day distribution

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
  - Click "Schedule" button on any platform content
  - Select date and time
  - Saves to Content Calendar
  - **Fixed**: Button now works correctly (no more click event bubbling issues)

- **Bulk Scheduling Wizard**
  - Schedule all 7 platforms at once (LinkedIn, Twitter, TikTok, YouTube, Email, Medium, Teaser)
  - Choose time interval: 1 hour apart, 1 day apart, or custom hours
  - Visual preview of all scheduled dates before confirming
  - Each platform posts once, staggered at chosen interval

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

### AI Live Chat Assistant ⭐ NEW
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
- Tables: `transcripts`, `scheduled_posts`
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
│   ├── SeriesAnalytics.tsx  # Analytics and insights
│   ├── TeamWorkspace.tsx    # Team collaboration
│   ├── GuestOutreach.tsx    # Guest recommendations
│   ├── UsageAnalytics.tsx   # Usage metrics
│   └── LandingPage.tsx      # Public landing page
├── components/              # Reusable components
│   ├── BulkScheduleWizard.tsx       # Bulk platform scheduling
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
│   └── backend.ts           # Backend API wrapper
├── server/                  # Backend API
│   ├── src/
│   │   ├── index.ts         # Express server with all endpoints
│   │   ├── gemini.ts        # Gemini AI integration (analysis, repurpose, chat)
│   │   ├── research.ts      # Sponsor database & CPM benchmarks
│   │   ├── enrichment.ts    # Live data fetching & metrics estimation
│   │   ├── env.ts           # Environment validation
│   │   └── middleware/      # Rate limiting, error handling
│   └── dist/                # Compiled output
├── types/                   # TypeScript definitions
├── src/
│   ├── index.css            # Tailwind v4 config with @theme
│   └── utils/               # Utilities (env, sentry)
├── supabase/                # Database migrations
├── docs/                    # Documentation
├── index.html               # Entry point
├── App.tsx                  # Main application component
├── vite.config.ts           # Vite configuration
├── postcss.config.js        # PostCSS for Tailwind
└── README.md
```

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

Or manually run the SQL from the migration files in your Supabase SQL editor.

---

## 🎯 Recent Updates

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

---

## 🔒 Security

- Row Level Security (RLS) on all database tables
- User-scoped data (users can only access their own transcripts)
- API key validation on all endpoints
- Environment variable isolation
- No API keys in client-side code
- CORS protection with allowed origins configuration
- Rate limiting on all API endpoints

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
