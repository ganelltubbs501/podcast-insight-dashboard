# Podcast Insight Dashboard

A small, local-first React + Vite dashboard for analyzing podcast transcripts, generating social content, and sourcing sponsorship insights.

---

## Features

- Upload or paste transcripts (text, images, or short audio) and run analyses.
- Generate SEO-friendly blog drafts, social clips, speaker analytics, and sponsorship suggestions.
- Export reports as PDF / DOCX and bulk-download transcript ZIPs.
- Uses Supabase for auth and data storage (optional for local dev — a safe stub is provided).

---

## Requirements

- Node.js 18+ (or a recent LTS)
- npm or yarn

---

## Setup

1. Install dependencies:

   npm install

2. Create a `.env.local` file at the project root with the following variables (only required for full functionality):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8080  # optional; server features stubbed if absent
```

3. (Optional) Start backend server if you intend to use the real Gemini/API endpoints:

   cd server
   npm install
   npm run dev

4. Start the frontend dev server:

   npm run dev

Open http://localhost:5173 (Vite default) in your browser.

---

## Notes & Troubleshooting

- Supabase env vars: `lib/supabaseClient.ts` will log a warning and expose a safe stub if the Supabase environment variables are missing so the app can run in dev without crashing. However, auth and DB calls will be no-ops.

- Tailwind: The app only loads the Tailwind CDN on `localhost` to keep the dev experience simple. For production, install Tailwind via PostCSS or the CLI (see https://tailwindcss.com/docs/installation). This avoids the production warning about using `cdn.tailwindcss.com` in production.

- Service Worker: The service worker (`sw.js`) is tolerant of failed fetches and falls back to `index.html` when offline. If you see stale builds or caching issues, unregister the service worker in DevTools → Application → Service Workers, then refresh.

- Manifest and icons: Local SVG icons are used to avoid cross-origin fetch failures (no external placeholder images).

- Stubs: Several server-backed endpoints (e.g., sponsorship, repurposing, outreach) return sensible mock data locally when `VITE_API_BASE_URL` is not set.

---

## Running the build

- Build for production:

  npm run build

- Preview the production build locally:

  npm run preview

---

## Contributing

- Open an issue or PR for additions or fixes.
- Follow project conventions and keep changes small.

---

## License

MIT
