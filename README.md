# 📌 Podcast Insight Dashboard

An AI-powered dashboard for analyzing podcast transcripts and generating structured insights, platform-ready content, and monetization recommendations grounded in real market data.

---

## 🚀 Current Status (Stable Checkpoint - Jan 2026)

### ✅ Fully Functional Features

- **Transcript Analysis**: Multi-format support (text, audio transcripts, image uploads) via Gemini 2.5 Flash
- **Supabase Integration**: Full persistence with authentication (transcripts, results, comments, workflow states)
- **Dashboard**: View all past analyses with status tracking and search
- **Results Display**: Comprehensive multi-tab interface with all analysis outputs
- **Content Generation**:
  - Platform-specific content (LinkedIn, Twitter/X, TikTok, YouTube, Email, Medium)
  - Blog posts with SEO optimization
  - Show notes with FAQs
  - Speaker analytics
  - Sentiment analysis with emotional triggers
- **Monetization Engine**: Research-backed sponsor recommendations with 70+ real brands
  - CPM benchmarks from IAB, Raptive, ConvertKit
  - Market conditions (Q1 2026 creator economy trends)
  - Platform-specific recommendations (Podcast, YouTube, Newsletter)
  - Actionable next steps with transparent data sourcing
- **Repurposing**: Email series, social calendar, LinkedIn articles, image prompts
- **Collaboration**: Team comments, workflow status tracking (Draft → Review → Approved → Published)
- **Export Options**: PDF, DOCX, Markdown, JSON, Media Kit, Google Sheets, Email

### 🎯 Recent Improvements

- **Research Layer**: Curated sponsor database (70+ brands across 8 categories)
- **Live Enrichment**: Optional podcast-specific data from iTunes, RSS, YouTube, Spotify, Reddit
- **Enhanced UI**: Monetization tab displays real brands, CPM estimates, typical deal structures
- **Data Transparency**: All recommendations cite sources (IAB reports, industry benchmarks)

---

## 🧠 Core Features

### 1. AI Transcript Analysis
- **Key Takeaways**: 5 bullet points of most important insights
- **Quotes**: Direct quotes with timestamps and speaker attribution
- **Sentiment Analysis**: 0-100 score with emotional keywords and timeline
- **Social Content**: Platform-optimized posts for 7+ channels
- **Blog Post**: SEO-optimized article with sections and conclusion
- **Speaker Analytics**: Speaking time estimates and topic contributions
- **Show Notes**: Formatted timestamps and resources
- **SEO**: Meta descriptions, keywords, readability scores, title variations

### 2. Monetization Intelligence
- **Sponsor Database**: 70+ brands (Notion, ClickUp, AG1, Brilliant, HubSpot, Shopify, etc.)
- **CPM Benchmarks**:
  - Podcast: $18-50 CPM (avg $25)
  - YouTube: $5-30 CPM (avg $12)
  - Newsletter: $20-100 CPM (avg $40)
- **Category Matching**: Auto-matches transcript topics to relevant sponsor categories
- **Platform Recommendations**: Priority levels (High/Medium/Low) for each channel
- **Next Steps**: Specific actionable tasks (e.g., "Join Gumball marketplace", "Create media kit")
- **Data Sources**: Transparent sourcing (IAB Podcast Revenue Report, Axios, industry benchmarks)

### 3. Content Repurposing
- **Email Series**: 3-5 day automated sequences
- **Social Calendar**: Multi-week post schedule (LinkedIn, Twitter, Instagram)
- **LinkedIn Article**: Long-form content adaptation
- **Image Prompts**: AI image generation prompts for quote cards

### 4. Team Collaboration
- **Comments**: Per-transcript discussion threads
- **Workflow States**: Draft → In Review → Approved → Published
- **User Authentication**: Supabase Auth with row-level security

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + TypeScript |
| **Backend** | Node.js + Express |
| **AI Model** | Google Gemini 2.5 Flash |
| **Database** | Supabase (PostgreSQL + Auth + RLS) |
| **Styling** | Tailwind CSS |
| **Market Data** | IAB, Raptive, ConvertKit, Axios |
| **Live Enrichment** | iTunes API, RSS Parser, YouTube Data API, Spotify API, Reddit API |

---

## 🔐 Environment Variables

### Frontend `.env.local`

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8080
```

### Backend `server/.env`

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key
PORT=8080

# Optional (for live enrichment)
YOUTUBE_API_KEY=your_youtube_data_api_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

---

## ▶️ Run Locally

### Frontend

```bash
npm install
npm run dev
```

Access at: `http://localhost:3000`

### Backend

```bash
cd server
npm install
npm run dev
```

API runs at: `http://localhost:8080`

---

## 📊 Database Schema

### Supabase Table: `transcripts`

```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'Completed',
  result JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transcripts"
  ON transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transcripts"
  ON transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcripts"
  ON transcripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts"
  ON transcripts FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🎨 Features by Tab

### Overview Tab
- Key takeaways (5 insights)
- Best quotes with speakers
- Sentiment analysis (score, tone, emotional keywords)

### Platform Content Tab
- LinkedIn posts
- Twitter threads
- TikTok/Reels scripts
- YouTube descriptions
- Email newsletters
- Medium articles
- Newsletter teasers
- Copy to clipboard + Schedule post (UI ready)

### Blog & SEO Tab
- Full blog article draft
- Show notes with timestamps
- SEO metadata (keywords, meta description, title variations)
- Readability score

### Speakers Tab
- Speaker contributions and roles
- Speaking time estimates
- Topic breakdown per speaker

### Repurposing Tab
- Email series generation
- Social calendar (multi-week)
- LinkedIn article drafts
- Image prompts for quote cards

### Monetization Tab
- Sponsorship readiness score (0-100)
- Suggested sponsors (real brands from database)
- Estimated CPM per category
- Typical deal structures
- Target audience profile
- Platform recommendations (Podcast/YouTube/Newsletter)
- Actionable next steps
- Revenue calculator (CPM × downloads)
- Data sources (transparent citations)

### Collaboration Tab
- Team comments with timestamps
- Workflow status management
- Activity log

---

## 📚 Documentation

- **Research Layer**: See [server/RESEARCH_LAYER.md](server/RESEARCH_LAYER.md) for detailed monetization system documentation
- **API Endpoints**:
  - `POST /api/analyze` - Analyze transcript with Gemini
  - `POST /api/sponsorship` - Generate monetization insights (with research layer)
  - `POST /api/repurpose` - Generate repurposed content
  - `POST /api/guests` - Suggest guest recommendations (stub)
  - `POST /api/outreach` - Generate outreach emails (stub)

---

## 🧭 Roadmap (Next Steps)

### Short-term
- [ ] Wire scheduling functionality (integrate with platform APIs)
- [ ] Expand sponsor database (100+ brands)
- [ ] Add guest recommendation engine (with enrichment)
- [ ] Implement media kit PDF generation
- [ ] Add export to social media platforms (LinkedIn, Twitter APIs)

### Medium-term
- [ ] Multi-user team workspace with permissions
- [ ] Analytics dashboard (usage, content performance)
- [ ] Series analytics (track multiple episodes)
- [ ] Content calendar integration
- [ ] Automated email export workflows

### Long-term
- [ ] Video podcast support (auto-transcribe via Gemini)
- [ ] Live enrichment for all analysis (pull show metadata automatically)
- [ ] Sponsor marketplace integration (Gumball, Podcorn API)
- [ ] White-label branding
- [ ] Mobile app

---

## 🔄 Recent Updates (Jan 2026)

### v1.2.0 - Research Layer Implementation
- Added curated sponsor database (70+ brands)
- Integrated IAB CPM benchmarks
- Market conditions from Q1 2026 reports
- Platform-specific recommendations
- Transparent data sourcing
- Enhanced monetization UI with next steps

### v1.1.0 - Supabase Persistence
- Full Supabase integration
- User authentication with row-level security
- Dashboard loading from database
- Comment system with user attribution

### v1.0.0 - Initial Release
- Gemini-powered analysis
- Multi-tab results interface
- Export functionality (PDF, DOCX, JSON)
- Platform content generation

---

## 🧑‍💻 Author

**Ganell Tubbs**
Founder, The Elite Automation Agency

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **Market Data Sources**: IAB, Raptive, ConvertKit, Axios, Podcast Movement
- **APIs**: Google Gemini, Supabase, YouTube Data API, Spotify API, iTunes API
- **Inspiration**: Modern creator economy and podcast monetization best practices

---

## 🐛 Known Issues

- Scheduling functionality (UI present, backend not wired)
- Media kit PDF generation uses placeholder template
- Guest recommendations return stub data (enrichment planned)
- Some export formats may need adjustment for very long transcripts

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub or contact via The Elite Automation Agency.

---

**Last Updated**: January 2026
**Current Version**: v1.2.0
