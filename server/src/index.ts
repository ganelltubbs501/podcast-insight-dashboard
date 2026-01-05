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

// Generate sponsorship insights with research layer
app.post("/api/sponsorship", async (req, res) => {
  try {
    const { context, useLiveData } = req.body ?? {};
    if (!context) return res.status(400).json({ error: "Missing context" });

    // Step 1: Build research pack (market data, sponsor database, CPM benchmarks)
    const { buildResearchPack, matchSponsorCategories } = await import("./research.js");
    const researchPack = await buildResearchPack();

    // Step 2: Optionally enrich with live podcast-specific data
    let enrichment = null;
    if (useLiveData) {
      try {
        const { enrichForSponsorship } = await import("./enrichment.js");
        enrichment = await enrichForSponsorship(context, { youtubeApiKey: process.env.YOUTUBE_API_KEY });

        console.log('SPONSORSHIP: enrichment sources=', enrichment?.sources || [], 'rssCandidates=', (enrichment?.rss?.sponsorCandidates || []).length);

        if (enrichment?.rss?.sponsorCandidates?.length > 0) {
          console.log('SPONSORSHIP: sponsorCandidates sample=', enrichment.rss.sponsorCandidates.slice(0, 6));
        }
      } catch (e) {
        console.error('Live enrichment failed (continuing with research pack only)', e);
      }
    }

    // Step 3: Extract keywords/topics from context for category matching
    const keywords = context.toLowerCase().match(/\b\w{4,}\b/g)?.slice(0, 30) || [];
    const matchedCategories = matchSponsorCategories(keywords, keywords);

    // Combine research pack with any live enrichment data
    const enhancedResearchPack = {
      ...researchPack,
      liveEnrichment: enrichment,
      preMatchedCategories: matchedCategories.map(c => c.name)
    };

    // Step 4: Generate sponsorship insights using Gemini + research pack
    const { generateSponsorshipWithGemini } = await import("./gemini.js");
    const insights = await generateSponsorshipWithGemini({
      transcriptContext: context,
      researchPack: enhancedResearchPack
    });

    // Step 5: Attach metadata for transparency
    insights.researchMetadata = {
      researchPackVersion: researchPack.timestamp,
      totalSponsorBrands: researchPack.sponsorDatabase.totalBrands,
      marketDataSources: researchPack.sources,
      liveDataUsed: !!enrichment,
      categoriesMatched: matchedCategories.length
    };

    if (enrichment) {
      insights.enrichment = enrichment;
    }

    return res.json(insights);
  } catch (err: any) {
    console.error("SPONSORSHIP ERROR:", err?.message);
    console.error("SPONSORSHIP STACK:", err?.stack);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
