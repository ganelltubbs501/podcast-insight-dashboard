# Podcast Insight Dashboard

An AI-powered command center for podcast analysis, content strategy, and monetization intelligence.

This application analyzes podcast transcripts using Gemini, extracts structured insights, and presents them in a high-density executive dashboard designed for creators, strategists, and agencies.

---

## ✨ Current Status (Stable Checkpoint)

✅ Core analysis flow working  
✅ Results saved to Supabase  
✅ User dashboard populated correctly  
✅ Results page rendering fully  
✅ Design system implemented (custom, non-generic)  

🚧 Advanced features (repurposing intelligence, monetization enrichment, external data) in progress

---

## 🧠 Core Features

- **AI Transcript Analysis**
  - Key takeaways
  - Quotes with timestamps
  - Sentiment analysis
  - SEO metadata
  - Platform-ready content

- **Results Dashboard**
  - Persistent analysis history
  - Status tracking
  - Export options (PDF, DOCX, JSON, etc.)

- **Insight Command Center UI**
  - Custom design system
  - Insight Frames
  - Score Rings
  - Dense, power-user layout
  - Executive intelligence aesthetic

- **Authentication & Storage**
  - Supabase Auth
  - Supabase Postgres
  - User-scoped data

---

## 🧱 Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- Custom Design System (CSS variables)
- Minimal Tailwind usage (layout only)

**Backend**
- Node.js
- Express
- Gemini API

**Database**
- Supabase (Postgres + Auth)

---

## 📂 Project Structure (Simplified)

podcast-insight-dashboard/
├── src/
│ ├── pages/
│ ├── components/
│ ├── services/
│ ├── lib/
│ └── design-system.css
├── services/ # Shared services (non-src)
├── server/ # API / Gemini logic
└── README.md

---

## 🚀 Running Locally

### Frontend
```bash
npm install
npm run dev
Backend
bash
Copy code
cd server
npm install
npm run dev
Ensure environment variables are set for:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

GEMINI_API_KEY

🧭 Roadmap (Next)
Wire Blog & SEO tab to structured results

Enhance Repurposing with context-aware generation

Monetization enrichment with market data

Visual hierarchy refinements

Performance optimizations

🧠 Philosophy
This is not a “pretty dashboard.”

It is an Insight Command Center — built for clarity, power, and decision-making.

Form follows intelligence.


