📌 Podcast Insight Dashboard

An AI-powered dashboard for analyzing podcast transcripts and generating structured insights, content, and workflows.

🚀 Current Status (Stable Checkpoint)

✅ Transcript analysis runs successfully
✅ Gemini API analysis returns structured JSON
✅ Results are saved to Supabase
✅ Results display correctly in the Dashboard
✅ Overview and Platform Content tabs fully functional

⚠️ Blog & SEO tab UI present but not yet wired
⚠️ Repurposing uses placeholder generation logic
⚠️ Monetization logic scaffolded but not finalized

🧠 Core Features

AI Transcript Analysis

Key takeaways

Quotes with speakers & timestamps

Sentiment analysis

Social & platform-specific content

Dashboard

View all past analyses

Status tracking

Supabase-backed persistence

Results View

Overview insights

Platform-ready content

Export options (PDF, DOCX, JSON)

🛠 Tech Stack

Frontend: React + Vite + TypeScript

Backend: Node + Express

AI: Google Gemini API

Database: Supabase (Postgres + Auth)

Styling: Tailwind CSS

🔐 Environment Variables

Create .env.local in the root:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8080


Backend .env:

GEMINI_API_KEY=your_gemini_key
PORT=8080

▶️ Run Locally

Frontend:

npm install
npm run dev


Backend:

cd server
npm install
npm run dev

🧭 Roadmap (Next)

Wire Blog & SEO rendering

Replace repurpose placeholders with real data

Add research-backed monetization engine

External market & sponsor intelligence

🧑‍💻 Author

Built by Ganell Tubbs
Founder, The Elite Automation Agency