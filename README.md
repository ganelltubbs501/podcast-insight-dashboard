# Podcast Insight Dashboard

A React + Vite dashboard that analyzes podcast transcripts with Gemini, saves results to Supabase, and displays them in a user dashboard with a full results view.

## What it does
- Log in / persist session (Supabase Auth)
- Run transcript analysis (Gemini via backend API)
- Save transcript + structured analysis results to Supabase
- View analyses in the Dashboard
- View detailed results per transcript (platform content, overview, exports, etc.)

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Node/Express (TypeScript)
- AI: Google Gemini
- Database/Auth: Supabase (Postgres + Auth)

## Project Structure (high level)
- `/src` - React app (pages, components, lib, services)
- `/server` - API server (Gemini calls + endpoints)
- `/services` - Shared / app services (depending on your structure)

## Requirements
- Node.js (LTS recommended)
- Supabase project (URL + Anon key)
- Gemini API key

## Environment Variables

### Frontend (.env.local)
Create `./.env.local` in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8080
