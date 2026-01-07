# Podcast Insight Dashboard

An AI-powered command center for podcast analysis, content strategy, and monetization intelligence.

This application analyzes podcast transcripts using Gemini AI, extracts structured insights, generates platform-optimized content, and provides data-driven monetization recommendations — all presented in a high-density executive dashboard designed for creators, strategists, and agencies.

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

✅ **Results & Persistence**
- Results saved to Supabase with full user scoping
- Dashboard populated with analysis history
- Export options (PDF, DOCX, Markdown, JSON, Media Kit)

✅ **Professional UI/UX**
- Custom design system (Insight Command Center aesthetic)
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

### Content Repurposing
- Email series generation
- Social media calendars
- LinkedIn articles
- Image prompt generation for thumbnails/graphics

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
- Custom Design System (CSS variables)
- Tailwind CSS (layout utilities)
- Lucide React (icons)

**Backend**
- Node.js
- Express
- TypeScript (ESM)
- Gemini 2.5 Flash API

**Database & Auth**
- Supabase (Postgres)
- Supabase Auth
- Row Level Security (RLS)

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
podcast-insight-dashboard/
├── pages/                    # React pages
│   ├── NewAnalysis.tsx      # Analysis input & processing
│   ├── ResultsPage.tsx      # Full results dashboard
│   └── DashboardPage.tsx    # User dashboard
├── services/                # Frontend services
│   ├── geminiService.ts     # API client
│   ├── transcripts.ts       # Supabase operations
│   └── downloadService.ts   # Export functionality
├── server/                  # Backend API
│   ├── src/
│   │   ├── index.ts         # Express server
│   │   ├── gemini.ts        # Gemini AI integration
│   │   ├── research.ts      # Sponsor database & CPM benchmarks
│   │   └── enrichment.ts    # Live data fetching & metrics estimation
│   └── dist/                # Compiled output
├── types/                   # TypeScript definitions
├── index.html              # Entry point
└── README.md
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Supabase account
- Gemini API key

### Environment Variables

Create `.env` in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `server/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=8080
GEMINI_MODEL=gemini-2.5-flash  # Optional: override default model

# Optional: For enhanced data fetching
YOUTUBE_API_KEY=your_youtube_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### Frontend
```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`

### Backend
```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:8080`

### Database Setup

1. Create a Supabase project
2. Run the following SQL to create the transcripts table:

```sql
create table transcripts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text,
  result jsonb,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table transcripts enable row level security;

-- Create policies
create policy "Users can view their own transcripts"
  on transcripts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transcripts"
  on transcripts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transcripts"
  on transcripts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transcripts"
  on transcripts for delete
  using (auth.uid() = user_id);
```

---

## 🎯 Key Improvements (Recent Updates)

### Error Handling & Resilience
- **Automatic Retry Logic**: 3 retries with exponential backoff for 503/429 errors
- **User-Friendly Messages**: Clear, actionable error messages instead of technical jargon
- **Frontend Error Parsing**: Extracts and displays server error messages properly

### Platform Content Completeness
- **Required Fields**: All 7 platform content types now mandatory in schema
- **Subject/Body Requirements**: Email newsletters and teasers must include both fields
- **Validation**: Gemini can't skip content generation for any platform

### Monetization Intelligence Overhaul
- **Realistic Metrics**: Conservative estimates (1,000-3,000 downloads) instead of inflated defaults
- **Live Data Integration**: Fetches from 6+ external sources to inform estimates
- **Episode-Specific Matching**: Sponsors matched to actual episode content, not generic categories
- **Confidence Scoring**: Transparent about estimate quality with reasoning
- **Smart CPM Calculation**: Niche-aware rates (tech/business: $30, new shows: $18)

### UI/UX Polish
- **Visible Buttons**: Inline CSS for guaranteed visibility
- **Metric Display**: Shows confidence level and data sources for estimates
- **Auto-Update Calculator**: Revenue calculator updates when monetization data loads
- **Better Loading States**: Clear indicators during processing

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

---

## 🔒 Security

- Row Level Security (RLS) on all database tables
- User-scoped data (users can only access their own transcripts)
- API key validation on all endpoints
- Environment variable isolation
- No API keys in client-side code

---

## 📊 Performance

- **Analysis Time**: 30-60 seconds per transcript (Gemini 2.5 Flash)
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

**Monetization Approach:**
- Real data from similar shows
- No inflated numbers
- Confidence scoring
- Episode-specific recommendations
- Market-aware CPM rates

---

## 🤝 Contributing

This is a production-ready application. Key areas for contribution:
- Additional sponsor brand database entries
- Enhanced CPM benchmarks from industry reports
- New platform content formats
- Improved metric estimation algorithms
- Additional external data sources

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Gemini API** for powerful AI analysis
- **Supabase** for backend infrastructure
- **Open Source Community** for RSS parsing, API integrations, and tools

---

**Built for podcast creators who need intelligence, not fluff.**
