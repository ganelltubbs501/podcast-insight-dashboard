import "dotenv/config";
console.log("ENV FILE CHECK -> GEMINI_API_KEY exists?", !!process.env.GEMINI_API_KEY);
console.log("ENV FILE CHECK -> PORT:", process.env.PORT);
import express from "express";
import cors from "cors";
import { analyzeWithGemini } from "./gemini.js";

const app = express();

// For local dev: allow your Vite dev server
app.use(cors({
  origin: [
    "http://localhost:3000",
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
app.post("/api/repurpose", (req, res) => {
  try {
    const { type, context } = req.body ?? {};
    if (!type) return res.status(400).json({ error: "Missing type" });

    // Return realistic stub data based on repurposing type
    let data: any = {};
    if (type === 'email_series') {
      data.emailSeries = [
        { day: 1, subject: 'Episode Highlights', body: 'Check out our latest insights...', goal: 'Engage' },
        { day: 3, subject: 'Deep Dive', body: 'A closer look at the main topic...', goal: 'Educate' },
        { day: 7, subject: 'Action Items', body: 'How to apply these insights...', goal: 'Convert' }
      ];
    } else if (type === 'social_calendar') {
      data.socialCalendar = [
        { day: 1, platform: 'LinkedIn', type: 'Insight', content: 'Key takeaway from our episode...' },
        { day: 2, platform: 'Twitter', type: 'Quote', content: 'Memorable quote: "..."' },
        { day: 3, platform: 'Instagram', type: 'Clip', content: 'Short video clip suggestion' },
        { day: 5, platform: 'LinkedIn', type: 'Article', content: 'Full article based on episode' }
      ];
    } else if (type === 'linkedin_article') {
      data.linkedinArticle = 'Comprehensive LinkedIn article draft with introduction, key sections, and call-to-action based on episode insights.';
    } else if (type === 'image_prompts') {
      data.imagePrompts = [
        { quote: 'Key insight 1', prompt: 'Modern flat design with bold typography and tech theme' },
        { quote: 'Key insight 2', prompt: 'Minimalist design with professional color palette' }
      ];
    }

    return res.json(data);
  } catch (err: any) {
    console.error("REPURPOSE ERROR:", err?.message);
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
app.post("/api/sponsorship", (req, res) => {
  try {
    const insights = {
      score: 72,
      reasoning: 'This episode has strong appeal to a niche audience with clear monetization opportunities. The content and tone align well with mid-market sponsors.',
      suggestedSponsors: [
        { industry: 'SaaS Tools', brands: ['Tool A', 'Tool B', 'Tool C'], matchReason: 'Target audience overlap' },
        { industry: 'Online Services', brands: ['Service X', 'Service Y'], matchReason: 'Audience demographics' }
      ],
      targetAudienceProfile: 'Professionals aged 25-45 interested in industry trends and best practices.',
      potentialAdSpots: ['Pre-roll (15s)', 'Mid-roll host read (30s)', 'Post-roll with CTA']
    };
    return res.json(insights);
  } catch (err: any) {
    console.error("SPONSORSHIP ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
