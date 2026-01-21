import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
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
import { requireAuth, optionalAuth, getUserId, AuthRequest } from "./middleware/auth.js";
import {
  analyzeRequestSchema,
  repurposeRequestSchema,
  chatRequestSchema,
  sponsorRequestSchema,
  metricsRequestSchema,
  createScheduledPostSchema,
  updateScheduledPostSchema,
  validateRequest
} from "./validation/schemas.js";

// Validate environment variables on startup
validateBackendEnv();

// Initialize error tracking
initSentry();

// Supabase admin client for beta management (optional for local dev)
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
  : null;

const app = express();

// Trust proxy - required for rate limiting behind proxies (Vercel, Railway, etc.)
app.set('trust proxy', 1);

// CORS - Use environment configuration with validation
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (backendEnv.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Required for cookies/auth
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400 // Cache preflight for 24h
}));

// Different size limits for different endpoints (will be refined per-route)
app.use(express.json({ limit: "5mb" })); // Default 5MB for most endpoints

// Health check with lenient rate limit
app.get("/health", healthCheckLimiter, (_req, res) => res.json({ ok: true }));

// Apply general rate limiter to all /api routes
app.use("/api", generalLimiter);

// AI Analysis endpoint with strict rate limiting + auth + validation
app.post("/api/analyze", requireAuth, aiAnalysisLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request body
    const validation = validateRequest(analyzeRequestSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const { contentInput, settings } = validation.data;

    // Log analysis request for auditing
    console.log(`📊 Analysis request from user: ${userId.substring(0, 8)}...`);

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
      ...(backendEnv.isDevelopment && { details: err?.message })
    });
  }
});

// Repurpose content with moderate rate limiting + auth + validation
app.post("/api/repurpose", requireAuth, repurposingLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request body
    const validation = validateRequest(repurposeRequestSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const { type, context } = validation.data;

    console.log(`🔄 Repurpose request (${type}) from user: ${userId.substring(0, 8)}...`);

    const result = await repurposeWithGemini({ type, context });
    return res.json(result);
  } catch (err: any) {
    console.error("REPURPOSE ERROR:", err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// AI Chat endpoint - Context-aware chat assistant + auth + validation
app.post("/api/chat", requireAuth, generalLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request body
    const validation = validateRequest(chatRequestSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const { message, conversationHistory, context } = validation.data;

    console.log(`💬 Chat request from user: ${userId.substring(0, 8)}...`);

    // Convert conversation history to Gemini format
    const geminiHistory = conversationHistory?.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }]
    })) || [];

    // Convert context to pageContext format
    const pageContext = {
      currentPage: context?.page,
      transcriptData: context?.transcriptId ? { id: context.transcriptId } : undefined,
      userData: context?.userName ? { name: context.userName } : undefined
    };

    const result = await chatWithGemini({
      message,
      conversationHistory: geminiHistory,
      pageContext
    });
    return res.json(result);
  } catch (err: any) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Chat service error"
    });
  }
});

// Guest suggestions (based on transcript context) + auth
app.post("/api/guests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    console.log(`👥 Guest suggestions request from user: ${userId.substring(0, 8)}...`);

    const guests = [
      { id: 'g1', name: 'Industry Expert A', title: 'Founder & CEO', bio: 'Thought leader in the space', expertise: ['strategy', 'growth'], status: 'Suggested', matchReason: 'Topical alignment' },
      { id: 'g2', name: 'Practitioner B', title: 'Director', bio: 'Hands-on experience with implementation', expertise: ['implementation', 'tools'], status: 'Suggested', matchReason: 'Audience fit' }
    ];
    return res.json(guests);
  } catch (err: any) {
    console.error("GUESTS ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// Generate outreach email for a guest + auth
app.post("/api/outreach", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { guestName, guestBio, context } = req.body ?? {};

    console.log(`📧 Outreach email request from user: ${userId.substring(0, 8)}...`);

    const email = {
      subject: `Invitation to be a guest on our podcast`,
      body: `Hi ${guestName || 'there'},\n\nI've been following your work on ${guestBio || 'your expertise'} and think you'd be a perfect fit for our audience.\n\nWould you be interested in joining us to discuss ${(context || 'this topic').split('\n')[0]}?\n\nLooking forward to hearing from you!\n\nBest regards,\nPodcast Team`
    };
    return res.json(email);
  } catch (err: any) {
    console.error("OUTREACH ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// Generate sponsorship insights with manual input (status-based monetization) + auth
app.post("/api/monetization", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { context, monetizationInput } = req.body ?? {};

    if (!context) return res.status(400).json({ error: "Missing context" });
    if (!monetizationInput) return res.status(400).json({ error: "Missing monetizationInput" });

    console.log(`💰 Monetization request from user: ${userId.substring(0, 8)}...`);

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

// Generate sponsorship insights with research layer (legacy endpoint) + auth
app.post("/api/sponsorship", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { context, useLiveData } = req.body ?? {};

    if (!context) return res.status(400).json({ error: "Missing context" });

    console.log(`🤝 Sponsorship request from user: ${userId.substring(0, 8)}...`);

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

app.get("/api/spotify/auth", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getSpotifyAuthUrl } = require('./spotify-oauth.js');

    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify OAuth not configured' });
    }

    if (!redirectUri) {
      return res.status(500).json({ error: 'SPOTIFY_REDIRECT_URI not configured' });
    }

    const config = { clientId, clientSecret, redirectUri };

    console.log(`🎵 Spotify auth request from user: ${userId.substring(0, 8)}...`);

    const authUrl = getSpotifyAuthUrl(config, req.query.state as string);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('Spotify auth URL generation failed:', err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err.message : 'Authentication service error'
    });
  }
});

app.post("/api/spotify/callback", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { exchangeSpotifyCode, storeSpotifyConnection } = await import('./spotify-oauth.js');
    const { code, showId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify OAuth not configured' });
    }

    if (!redirectUri) {
      return res.status(500).json({ error: 'SPOTIFY_REDIRECT_URI not configured' });
    }

    const config = { clientId, clientSecret, redirectUri };

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

app.get("/api/spotify/analytics/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const authenticatedUserId = getUserId(req);
    const { userId } = req.params;

    // Ensure users can only access their own data
    if (userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other users data' });
    }

    const { getSpotifyConnection, getSpotifyPodcastAnalytics, extractVerifiedMetrics, refreshSpotifyToken, storeSpotifyConnection } = await import('./spotify-oauth.js');

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

app.delete("/api/spotify/disconnect/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const authenticatedUserId = getUserId(req);
    const { userId } = req.params;

    // Ensure users can only disconnect their own account
    if (userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Forbidden: Cannot modify other users data' });
    }

    const { removeSpotifyConnection } = require('./spotify-oauth.js');

    removeSpotifyConnection(userId);

    return res.json({ success: true, message: 'Spotify disconnected' });
  } catch (err: any) {
    console.error('Spotify disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// In-memory storage for scheduled posts (in production, use Supabase)
// TODO: Move to database with user_id column for proper isolation
interface ScheduledPost {
  id: string;
  userId: string;
  platform: string;
  content: string;
  scheduledDate: string;
  status: string;
  transcriptId?: string;
  createdAt: string;
  metrics: any;
}

const scheduledPosts: ScheduledPost[] = [];

// Get all scheduled posts for authenticated user
app.get("/api/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Filter posts by user
    const userPosts = scheduledPosts.filter(p => p.userId === userId);

    return res.json(userPosts);
  } catch (err: any) {
    console.error("GET SCHEDULE ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// Schedule a new post with validation
app.post("/api/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request body
    const validation = validateRequest(createScheduledPostSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const { platform, content, scheduledDate, transcriptId, metadata } = validation.data;

    const newPost: ScheduledPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId, // Associate with authenticated user
      platform,
      content,
      scheduledDate,
      status: 'scheduled',
      transcriptId,
      createdAt: new Date().toISOString(),
      metrics: metadata || null
    };

    scheduledPosts.push(newPost);
    console.log(`📅 Scheduled ${platform} post for ${scheduledDate} (user: ${userId.substring(0, 8)}...)`);

    return res.json(newPost);
  } catch (err: any) {
    console.error("SCHEDULE POST ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// Delete a scheduled post (only if owned by user)
app.post("/api/schedule/:id/delete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const index = scheduledPosts.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Verify ownership
    if (scheduledPosts[index].userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only delete your own posts" });
    }

    scheduledPosts.splice(index, 1);
    console.log(`🗑️  Deleted scheduled post ${id} (user: ${userId.substring(0, 8)}...)`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE SCHEDULE ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// ============================================================================
// BETA MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/beta/status - Check beta availability
app.get("/api/beta/status", async (_req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Beta management not configured" });
  }

  const cap = 50;

  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) return res.status(500).json({ error: error.message });

  const used = count ?? 0;
  const remaining = Math.max(0, cap - used);

  res.json({ open: remaining > 0, remaining, cap, used });
});

// POST /api/signup - Invite-only signup
app.post("/api/signup", async (req, res) => {
  console.log("✅ HIT /api/signup", new Date().toISOString(), req.body);
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Beta management not configured" });
    }

    console.log("📨 /api/signup body:", req.body);

    const email = String(req.body?.email || "").trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) return res.status(400).json({ error: "Invalid email" });

    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (countError) return res.status(500).json({ error: "Could not check beta capacity" });

    const CAP = 50;
    if ((count ?? 0) >= CAP) {
      return res.status(403).json({ code: "beta_full", cap: CAP, used: count ?? 0 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://loquihq-beta.web.app/#/auth/callback",
    });

    if (error) {
      console.log("❌ INVITE ERROR:", error);
      return res.status(400).json({ error: error.message, code: error.name });
    }

    console.log("✅ INVITED:", data?.user?.id, data?.user?.email);
    return res.json({ status: "invited", userId: data.user?.id });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);
    console.error("SIGNUP ERROR message:", err?.message);
    console.error("SIGNUP ERROR stack:", err?.stack);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// POST /api/waitlist - Add to waitlist
app.post("/api/waitlist", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Beta management not configured" });
  }

  const { email, source } = req.body as { email?: string; source?: string };
  if (!email) return res.status(400).json({ error: "email required" });

  const { error } = await supabaseAdmin
    .from("waitlist")
    .upsert({ email, source: source ?? "loquihq-beta" }, { onConflict: "email" });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ status: "waitlisted" });
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

const server = app.listen(backendEnv.port, '0.0.0.0', () => {
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
