import "dotenv/config";
console.log("ENV FILE CHECK -> GEMINI_API_KEY exists?", !!process.env.GEMINI_API_KEY);
console.log("ENV FILE CHECK -> PORT:", process.env.PORT);
import express from "express";
import cors from "cors";
import { analyzeWithGemini, repurposeWithGemini } from "./gemini.js";

const app = express();

// For local dev: allow your Vite dev server
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://192.168.1.197:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", async (req, res) => {
  try {
    const { contentInput, settings } = req.body ?? {};
    if (!contentInput) return res.status(400).json({ error: "Missing contentInput" });

    const result = await analyzeWithGemini({ contentInput, settings });
    return res.json(result);
  } catch (err: any) {
  console.error("ANALYZE ERROR:", err);
  console.error("ANALYZE ERROR message:", err?.message);
  console.error("ANALYZE ERROR stack:", err?.stack);
  console.error("ANALYZE ERROR cause:", err?.cause);
  console.error("ANALYZE ERROR response:", err?.response);
  console.error("ANALYZE ERROR details:", err?.details);

  return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Repurpose content (generate email series, social calendar, articles, image prompts)
app.post("/api/repurpose", async (req, res) => {
  try {
    const { type, context } = req.body ?? {};
    if (!type) return res.status(400).json({ error: "Missing type" });
    if (!context) return res.status(400).json({ error: "Missing context" });

    const result = await repurposeWithGemini({ type, context });
    return res.json(result);
  } catch (err: any) {
    console.error("REPURPOSE ERROR:", err);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Guest suggestions (based on transcript context)
app.post("/api/guests", (req, res) => {
  try {
    const guests = [
      { id: 'g1', name: 'Industry Expert A', title: 'Founder & CEO', bio: 'Thought leader in the space', expertise: ['strategy', 'growth'], status: 'Suggested', matchReason: 'Topical alignment' },
      { id: 'g2', name: 'Practitioner B', title: 'Director', bio: 'Hands-on experience with implementation', expertise: ['implementation', 'tools'], status: 'Suggested', matchReason: 'Audience fit' }
    ];
    return res.json(guests);
  } catch (err: any) {
    console.error("GUESTS ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Generate outreach email for a guest
app.post("/api/outreach", (req, res) => {
  try {
    const { guestName, guestBio, context } = req.body ?? {};
    const email = {
      subject: `Invitation to be a guest on our podcast`,
      body: `Hi ${guestName || 'there'},\n\nI've been following your work on ${guestBio || 'your expertise'} and think you'd be a perfect fit for our audience.\n\nWould you be interested in joining us to discuss ${(context || 'this topic').split('\n')[0]}?\n\nLooking forward to hearing from you!\n\nBest regards,\nPodcast Team`
    };
    return res.json(email);
  } catch (err: any) {
    console.error("OUTREACH ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Generate sponsorship insights
app.post("/api/sponsorship", async (req, res) => {
  try {
    const { context, useLiveData } = req.body ?? {};

    // Basic stub insights (kept for deterministic behavior)
    const insights: any = {
      score: 72,
      reasoning: 'This episode has strong appeal to a niche audience with clear monetization opportunities. The content and tone align well with mid-market sponsors.',
      suggestedSponsors: [
        { industry: 'SaaS Tools', brands: ['Tool A', 'Tool B', 'Tool C'], matchReason: 'Target audience overlap' },
        { industry: 'Online Services', brands: ['Service X', 'Service Y'], matchReason: 'Audience demographics' }
      ],
      targetAudienceProfile: 'Professionals aged 25-45 interested in industry trends and best practices.',
      potentialAdSpots: ['Pre-roll (15s)', 'Mid-roll host read (30s)', 'Post-roll with CTA']
    };

    if (useLiveData && context) {
      try {
        const { enrichForSponsorship } = await import("./enrichment.js");
        const enrichment: any = await enrichForSponsorship(context, { youtubeApiKey: process.env.YOUTUBE_API_KEY });
        insights.enrichment = enrichment;
        insights.enrichmentAttempted = true;

        // Debug logging to help diagnose missing sponsor data
        try {
          console.log('SPONSORSHIP: enrichment sources=', enrichment?.sources || enrichment?.enrichment?.sources || enrichment?.rss?.sources, 'rssCandidates=', (enrichment?.rss?.sponsorCandidates || []).length);
          if ((enrichment?.rss?.sponsorCandidates || []).length > 0) {
            console.log('SPONSORSHIP: sponsorCandidates sample=', (enrichment?.rss?.sponsorCandidates || []).slice(0, 6));
          }
        } catch (e) {
          console.warn('SPONSORSHIP logging failed', e);
        }

        // Use sponsorCandidates from enrichment, if present, to produce actual suggested brands
        if (enrichment?.rss?.sponsorCandidates?.length) {
          const brands = enrichment.rss.sponsorCandidates.map((s: any) => s.name || s).slice(0, 6);
          insights.suggestedSponsors = [
            { industry: 'Mentioned Sponsors', brands, matchReason: 'Found sponsor mentions or links in show notes / episodes.' },
          ];
        } else {
          // indicate we checked live data but didn't find explicit sponsor mentions
          insights.enrichmentNote = 'noSponsorCandidates';
        }

        // Optionally tweak the score a bit when enrichment exists
        if (enrichment.youtube?.subscribers) {
          if (enrichment.youtube.subscribers > 100000) insights.score = Math.min(95, insights.score + 10);
          else if (enrichment.youtube.subscribers > 20000) insights.score = Math.min(90, insights.score + 6);
        }
      } catch (e) {
        console.error('Enrichment failed', e);
      }
    }

    return res.json(insights);
  } catch (err: any) {
    console.error("SPONSORSHIP ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
