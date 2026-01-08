import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeWithGemini, repurposeWithGemini, chatWithGemini } from "./gemini.js";
import { validateBackendEnv, backendEnv } from "./env.js";
import {
  generalLimiter,
  aiAnalysisLimiter,
  repurposingLimiter,
  healthCheckLimiter
} from "./middleware/rateLimiter.js";
import {
  initSentry,
  errorHandler,
  captureException
} from "./utils/sentry.js";

// Validate environment variables on startup
validateBackendEnv();

// Initialize error tracking
initSentry();

const app = express();

// Trust proxy - required for rate limiting behind proxies (Vercel, Railway, etc.)
app.set('trust proxy', 1);

// CORS - Use environment configuration
app.use(cors({
  origin: backendEnv.cors.allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "25mb" }));

// Health check with lenient rate limit
app.get("/health", healthCheckLimiter, (_req, res) => res.json({ ok: true }));

// Apply general rate limiter to all /api routes
app.use("/api", generalLimiter);

// AI Analysis endpoint with strict rate limiting
app.post("/api/analyze", aiAnalysisLimiter, async (req, res) => {
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

    // Extract user-friendly error message
    const errorMessage = err?.message || "";
    let userMessage = "Analysis failed. Please try again.";
    let statusCode = 500;

    if (errorMessage.includes("503") || errorMessage.includes("overloaded") || errorMessage.includes("UNAVAILABLE")) {
      userMessage = "The AI service is currently overloaded. We've retried multiple times but couldn't complete the analysis. Please try again in a few minutes.";
      statusCode = 503;
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      userMessage = "Rate limit exceeded. Please wait a moment and try again.";
      statusCode = 429;
    } else if (errorMessage.includes("Missing GEMINI_API_KEY")) {
      userMessage = "API configuration error. Please check your API key.";
      statusCode = 500;
    } else if (errorMessage.includes("No response from Gemini")) {
      userMessage = "No response received from the AI service. Please try again.";
      statusCode = 500;
    }

    return res.status(statusCode).json({
      error: userMessage,
      details: err?.message
    });
  }
});

// Repurpose content with moderate rate limiting
app.post("/api/repurpose", repurposingLimiter, async (req, res) => {
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

// AI Chat endpoint - Context-aware chat assistant
app.post("/api/chat", generalLimiter, async (req, res) => {
  try {
    const { message, conversationHistory, pageContext } = req.body ?? {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    const result = await chatWithGemini({
      message,
      conversationHistory: conversationHistory || [],
      pageContext: pageContext || {}
    });
    return res.json(result);
  } catch (err: any) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ error: err?.message ?? "Chat service error" });
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

// Generate sponsorship insights with manual input (status-based monetization)
app.post("/api/monetization", async (req, res) => {
  try {
    const { context, monetizationInput } = req.body ?? {};
    if (!context) return res.status(400).json({ error: "Missing context" });
    if (!monetizationInput) return res.status(400).json({ error: "Missing monetizationInput" });

    // Step 1: Build research pack (market data, sponsor database, CPM benchmarks)
    const { buildResearchPack } = await import("./research.js");
    const researchPack = await buildResearchPack();

    // Step 2: Process manual input and build confidence-weighted metrics
    const { processMonetizationInput } = await import("./monetization.js");
    const processedData = await processMonetizationInput(monetizationInput, context);

    // Step 3: Generate truth-based insights
    const { generateTruthBasedMonetization } = await import("./gemini.js");
    const insights = await generateTruthBasedMonetization({
      transcriptContext: context,
      processedMetrics: processedData,
      researchPack
    });

    return res.json(insights);
  } catch (err: any) {
    console.error("MONETIZATION ERROR:", err?.message);
    console.error("MONETIZATION STACK:", err?.stack);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Generate sponsorship insights with research layer (legacy endpoint)
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

// ============================================================================
// SPOTIFY OAUTH ENDPOINTS (Real Download Data)
// ============================================================================

app.get("/api/spotify/auth", (req, res) => {
  try {
    const { getSpotifyAuthUrl } = require('./spotify-oauth.js');

    const config = {
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/spotify/callback'
    };

    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ error: 'Spotify OAuth not configured' });
    }

    const authUrl = getSpotifyAuthUrl(config, req.query.state as string);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('Spotify auth URL generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/spotify/callback", async (req, res) => {
  try {
    const { exchangeSpotifyCode, storeSpotifyConnection } = await import('./spotify-oauth.js');
    const { code, userId, showId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing code or userId' });
    }

    const config = {
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/spotify/callback'
    };

    const tokens = await exchangeSpotifyCode(config, code);

    const connection = {
      userId,
      showId: showId || '',
      tokens,
      connectedAt: Date.now()
    };

    storeSpotifyConnection(connection);

    return res.json({ success: true, message: 'Spotify connected successfully' });
  } catch (err: any) {
    console.error('Spotify callback failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/spotify/analytics/:userId", async (req, res) => {
  try {
    const { getSpotifyConnection, getSpotifyPodcastAnalytics, extractVerifiedMetrics, refreshSpotifyToken, storeSpotifyConnection } = await import('./spotify-oauth.js');
    const { userId } = req.params;

    const connection = getSpotifyConnection(userId);
    if (!connection) {
      return res.status(404).json({ error: 'Spotify not connected for this user' });
    }

    let tokens = connection.tokens;
    if (Date.now() >= tokens.expiresAt - 60000) {
      const config = {
        clientId: process.env.SPOTIFY_CLIENT_ID || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || ''
      };

      tokens = await refreshSpotifyToken(config, tokens.refreshToken);
      connection.tokens = tokens;
      storeSpotifyConnection(connection);
    }

    const analytics = await getSpotifyPodcastAnalytics(tokens.accessToken, connection.showId);
    const verifiedMetrics = extractVerifiedMetrics(analytics);

    return res.json({
      metrics: verifiedMetrics,
      analytics,
      dataSource: 'spotify',
      lastSynced: Date.now()
    });
  } catch (err: any) {
    console.error('Spotify analytics fetch failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/spotify/disconnect/:userId", (req, res) => {
  try {
    const { removeSpotifyConnection } = require('./spotify-oauth.js');
    const { userId } = req.params;

    removeSpotifyConnection(userId);

    return res.json({ success: true, message: 'Spotify disconnected' });
  } catch (err: any) {
    console.error('Spotify disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// In-memory storage for scheduled posts (in production, use Supabase)
const scheduledPosts: any[] = [];

// Get all scheduled posts
app.get("/api/schedule", (req, res) => {
  try {
    return res.json(scheduledPosts);
  } catch (err: any) {
    console.error("GET SCHEDULE ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Schedule a new post
app.post("/api/schedule", (req, res) => {
  try {
    const { platform, content, scheduledDate, status, transcriptId } = req.body ?? {};

    if (!platform || !content || !scheduledDate) {
      return res.status(400).json({ error: "Missing required fields: platform, content, scheduledDate" });
    }

    const newPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform,
      content,
      scheduledDate,
      status: status || 'Scheduled',
      transcriptId,
      createdAt: new Date().toISOString(),
      metrics: null // Populated after publishing
    };

    scheduledPosts.push(newPost);
    console.log(`Scheduled ${platform} post for ${scheduledDate}`);

    return res.json(newPost);
  } catch (err: any) {
    console.error("SCHEDULE POST ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Delete a scheduled post
app.post("/api/schedule/:id/delete", (req, res) => {
  try {
    const { id } = req.params;
    const index = scheduledPosts.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    scheduledPosts.splice(index, 1);
    console.log(`Deleted scheduled post ${id}`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE SCHEDULE ERROR:", err?.message);
    return res.status(500).json({ error: err?.message ?? "Server error" });
  }
});

// Sentry error handler - MUST be after all routes and before other error handlers
app.use(errorHandler);

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  captureException(err, {
    url: req.url,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(backendEnv.port, () => {
  console.log(`✅ Server running on port ${backendEnv.port}`);
  console.log(`   Environment: ${backendEnv.nodeEnv}`);
  console.log(`   CORS Origins: ${backendEnv.cors.allowedOrigins.join(', ')}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${backendEnv.port} is already in use. Please kill the existing process or change the PORT in .env`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
