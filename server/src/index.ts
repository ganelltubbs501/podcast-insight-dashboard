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

import Parser from "rss-parser";

// near top-level
const rssParser = new Parser({
  customFields: {
    feed: ["itunes:author", "itunes:image", "itunes:category"],
    item: [
      "itunes:duration",
      "itunes:episode",
      "itunes:season",
      "enclosure",
      "guid",
    ],
  },
});

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

// Readiness check - verifies dependencies are available
app.get("/ready", healthCheckLimiter, (_req, res) => {
  const checks = {
    supabase: !!supabaseAdmin,
    gemini: !!backendEnv.gemini.apiKey,
    timestamp: new Date().toISOString(),
  };

  const allReady = checks.supabase && checks.gemini;

  if (allReady) {
    return res.json({ status: "ready", checks });
  } else {
    return res.status(503).json({ status: "not_ready", checks });
  }
});

// Request logging middleware - adds request ID and logs with context
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(2, 10);
  (req as any).requestId = requestId;

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.id?.slice(0, 8) || "anon";
    const status = res.statusCode;
    const level = status >= 500 ? "❌" : status >= 400 ? "⚠️" : "✅";

    console.log(
      `${level} [${requestId}] ${req.method} ${req.path} ${status} ${duration}ms user:${userId}`
    );
  });

  next();
});

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

// ============================================================================
// LINKEDIN OAUTH ENDPOINTS (Social Media Posting)
// ============================================================================

app.get("/api/integrations/linkedin/auth-url", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getLinkedInAuthUrl } = await import('./linkedin-oauth.js');

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'LinkedIn OAuth not configured' });
    }

    if (!apiPublicUrl) {
      return res.status(500).json({ error: 'API_PUBLIC_URL not configured' });
    }

    const redirectUri = `${apiPublicUrl}/api/integrations/linkedin/callback`;
    const config = { clientId, clientSecret, redirectUri };

    // Use userId as state for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');

    console.log(`🔗 LinkedIn auth request from user: ${userId.substring(0, 8)}...`);

    const authUrl = getLinkedInAuthUrl(config, state);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('LinkedIn auth URL generation failed:', err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err.message : 'Authentication service error'
    });
  }
});

// LinkedIn OAuth callback - handles redirect from LinkedIn
app.get("/api/integrations/linkedin/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    const appPublicUrl = process.env.APP_PUBLIC_URL || 'https://loquihq-beta.web.app';

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, error_description);
      return res.redirect(`${appPublicUrl}/#/settings?linkedin=error&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`);
    }

    if (!code || !state) {
      return res.redirect(`${appPublicUrl}/#/settings?linkedin=error&message=${encodeURIComponent('Missing authorization code')}`);
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      userId = stateData.userId;

      // Check state isn't too old (10 minute max)
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return res.redirect(`${appPublicUrl}/#/settings?linkedin=error&message=${encodeURIComponent('Authorization expired, please try again')}`);
      }
    } catch {
      return res.redirect(`${appPublicUrl}/#/settings?linkedin=error&message=${encodeURIComponent('Invalid state parameter')}`);
    }

    const { exchangeLinkedInCode, getLinkedInProfile, storeLinkedInConnection } = await import('./linkedin-oauth.js');

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/linkedin/callback`;

    const config = { clientId, clientSecret, redirectUri };

    // Exchange code for tokens
    const tokens = await exchangeLinkedInCode(config, code as string);

    // Get user profile
    const profile = await getLinkedInProfile(tokens.accessToken);

    // Store connection in database
    await storeLinkedInConnection(userId, tokens, profile);

    console.log(`✅ LinkedIn connected for user: ${userId.substring(0, 8)}... (${profile.localizedFirstName} ${profile.localizedLastName})`);

    // Redirect back to frontend settings page
    return res.redirect(`${appPublicUrl}/#/settings?linkedin=connected&name=${encodeURIComponent(profile.localizedFirstName)}`);
  } catch (err: any) {
    console.error('LinkedIn callback failed:', err);
    const appPublicUrl = process.env.APP_PUBLIC_URL || 'https://loquihq-beta.web.app';
    return res.redirect(`${appPublicUrl}/#/settings?linkedin=error&message=${encodeURIComponent(err.message || 'Connection failed')}`);
  }
});

// Get LinkedIn connection status
app.get("/api/integrations/linkedin/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getLinkedInConnection, isTokenExpired } = await import('./linkedin-oauth.js');

    const connection = await getLinkedInConnection(userId);

    if (!connection) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      accountName: connection.accountName,
      accountId: connection.accountId,
      tokenExpired: isTokenExpired(connection.tokenExpiresAt),
      expiresAt: connection.tokenExpiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('LinkedIn status check failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Disconnect LinkedIn
app.delete("/api/integrations/linkedin/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeLinkedInConnection } = await import('./linkedin-oauth.js');

    await removeLinkedInConnection(userId);

    console.log(`🔌 LinkedIn disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'LinkedIn disconnected' });
  } catch (err: any) {
    console.error('LinkedIn disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Post to LinkedIn
app.post("/api/integrations/linkedin/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { content, mediaUrl, mediaTitle, mediaDescription } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    if (content.length > 3000) {
      return res.status(400).json({ error: 'Post content exceeds LinkedIn limit (3000 characters)' });
    }

    const { getLinkedInConnection, getValidLinkedInToken, postToLinkedIn } = await import('./linkedin-oauth.js');

    const connection = await getLinkedInConnection(userId);

    if (!connection) {
      return res.status(400).json({ error: 'LinkedIn not connected. Please connect your account first.' });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/linkedin/callback`;
    const config = { clientId, clientSecret, redirectUri };

    // Get valid token (refresh if needed)
    const accessToken = await getValidLinkedInToken(config, connection);

    // Post to LinkedIn
    const personUrn = `urn:li:person:${connection.accountId}`;
    const result = await postToLinkedIn(accessToken, personUrn, content.trim(), {
      mediaUrl,
      mediaTitle,
      mediaDescription,
    });

    console.log(`📤 LinkedIn post created for user: ${userId.substring(0, 8)}... (postId: ${result.postId})`);

    return res.json({
      success: true,
      postId: result.postId,
      postUrl: result.postUrl,
    });
  } catch (err: any) {
    console.error('LinkedIn post failed:', err);

    // Handle token expiration
    if (err.message.includes('expired') || err.message.includes('reconnect')) {
      return res.status(401).json({
        error: 'LinkedIn session expired. Please reconnect your account.',
        reconnectRequired: true,
      });
    }

    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SCHEDULED POSTS PUBLISHER (Cloud Scheduler cron job endpoint)
// ============================================================================

app.post("/api/jobs/publish-scheduled", async (req, res) => {
  // Verify cron secret
  const secret = req.header("x-cron-secret");
  const expectedSecret = process.env.PUBLISHER_CRON_SECRET;

  if (!expectedSecret) {
    console.error("PUBLISHER_CRON_SECRET not configured");
    return res.status(500).json({ error: "Publisher not configured" });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn("Unauthorized publish-scheduled request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Create admin Supabase client
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch due posts (status = 'Scheduled' and scheduled_date <= now)
    const now = new Date().toISOString();
    const { data: duePosts, error: fetchError } = await supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("platform", "linkedin")
      .eq("status", "Scheduled")
      .lte("scheduled_date", now)
      .limit(25);

    if (fetchError) {
      console.error("Failed to fetch due posts:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!duePosts?.length) {
      console.log("📅 No scheduled posts due for publishing");
      return res.json({ ok: true, processed: 0 });
    }

    console.log(`📅 Processing ${duePosts.length} scheduled posts...`);
    let processed = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        // Get LinkedIn connection for this user
        const { data: connection, error: connError } = await supabaseAdmin
          .from("connected_accounts")
          .select("access_token, token_expires_at, account_id")
          .eq("user_id", post.user_id)
          .eq("provider", "linkedin")
          .maybeSingle();

        if (connError || !connection) {
          throw new Error("LinkedIn not connected for this user");
        }

        // Check token expiry
        if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() < Date.now()) {
          throw new Error("LinkedIn token expired - user must reconnect");
        }

        // Build LinkedIn post body
        const personUrn = `urn:li:person:${connection.account_id}`;
        const postBody = {
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: post.content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };

        // Post to LinkedIn
        const linkedInResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(postBody),
        });

        if (!linkedInResponse.ok) {
          const errorText = await linkedInResponse.text();
          throw new Error(`LinkedIn API error: ${linkedInResponse.status} - ${errorText}`);
        }

        // Get post ID from response header
        const postId = linkedInResponse.headers.get("x-restli-id") || "";

        // Update post status to Published
        await supabaseAdmin
          .from("scheduled_posts")
          .update({
            status: "Published",
            metrics: { linkedin_post_id: postId, posted_at: new Date().toISOString() },
          })
          .eq("id", post.id);

        console.log(`✅ Published post ${post.id} to LinkedIn (postId: ${postId})`);
        processed++;
      } catch (postError: any) {
        console.error(`❌ Failed to publish post ${post.id}:`, postError.message);

        // Update post status to Failed
        await supabaseAdmin
          .from("scheduled_posts")
          .update({
            status: "Failed",
            metrics: { error: postError.message, failed_at: new Date().toISOString() },
          })
          .eq("id", post.id);

        failed++;
      }
    }

    console.log(`📅 Publisher completed: ${processed} published, ${failed} failed`);
    return res.json({ ok: true, processed, failed });
  } catch (err: any) {
    console.error("Publisher job error:", err);
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
      redirectTo: "https://loquihq-beta.web.app/",
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

// GET /api/admin/sanity - Admin sanity check endpoint (auth required)
// Verifies: profile exists, can read own data, RLS is working
app.get("/api/admin/sanity", requireAuth, async (req: AuthRequest, res) => {
  const checks: Record<string, { ok: boolean; error?: string; data?: any }> = {};
  const userId = getUserId(req);

  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Database not configured" });
  }

  // 1. Check user ID is valid
  checks.auth = { ok: !!userId, data: { userId: userId?.slice(0, 8) + "..." } };

  // 2. Check profile exists
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, created_at")
      .eq("id", userId)
      .single();

    checks.profile = {
      ok: !!profile && !error,
      error: error?.message,
      data: profile ? { exists: true, created: profile.created_at } : { exists: false },
    };
  } catch (e: any) {
    checks.profile = { ok: false, error: e.message };
  }

  // 3. Check can read transcripts (RLS - only own rows)
  try {
    const { data: transcripts, error } = await supabaseAdmin
      .from("transcripts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    checks.transcripts_read = {
      ok: !error,
      error: error?.message,
      data: { canRead: !error },
    };
  } catch (e: any) {
    checks.transcripts_read = { ok: false, error: e.message };
  }

  // 4. Check can read podcasts (RLS - only own rows)
  try {
    const { data: podcast, error } = await supabaseAdmin
      .from("podcasts")
      .select("id, title")
      .eq("user_id", userId)
      .maybeSingle();

    checks.podcast_read = {
      ok: !error,
      error: error?.message,
      data: { hasPodcast: !!podcast, title: podcast?.title?.slice(0, 20) },
    };
  } catch (e: any) {
    checks.podcast_read = { ok: false, error: e.message };
  }

  // 5. Verify RLS is enforced (try to read another user's data - should fail or return empty)
  try {
    const { data: otherProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .neq("id", userId)
      .limit(1);

    // Using service role key, this WILL return data (bypasses RLS)
    // But in frontend with anon key, this would return empty
    checks.rls_note = {
      ok: true,
      data: {
        note: "Service role bypasses RLS (expected). Frontend uses anon key with RLS enforced.",
        otherProfilesVisible: (otherProfiles?.length ?? 0) > 0,
      },
    };
  } catch (e: any) {
    checks.rls_note = { ok: false, error: e.message };
  }

  // Summary
  const allOk = Object.values(checks).every((c) => c.ok);

  res.json({
    status: allOk ? "healthy" : "issues_found",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ============================================================================
// PODCAST ANALYTICS ENDPOINTS
// ============================================================================

import {
  fetchAndParseRss,
  detectProvider,
  getSupportedProviders,
  type ParsedPodcastFeed,
} from "./services/rss-parser.js";
import {
  computeMetricsFromManual,
  computeProjections,
  getDefaultAssumptions,
  estimateCadence,
} from "./services/podcast-analytics.js";
import {
  connectRssSchema,
  manualMetricsSchema,
  projectionsAssumptionsSchema,
} from "./validation/schemas.js";

// POST /api/podcast/connect-rss - Connect podcast via RSS
// Schema: podcasts (with rss_url) → podcast_connections (references podcast)
app.post("/api/podcast/connect-rss", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request
    const validation = validateRequest(connectRssSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined,
      });
    }

    const { rssUrl } = validation.data;
    console.log(`🎙️ Connect RSS request from user: ${userId.substring(0, 8)}... URL: ${rssUrl}`);

    // Fetch and parse RSS feed
    let feed: ParsedPodcastFeed;
    try {
      feed = await fetchAndParseRss(rssUrl);
    } catch (err: any) {
      console.error("RSS parse error:", err.message);
      return res.status(400).json({
        error: "Failed to parse RSS feed",
        details: err.message,
      });
    }

    // Detect hosting provider (maps to podcast_provider enum)
    const detectedProvider = detectProvider(rssUrl);
    // Map to enum values in 010_podcast_connectors_and_metrics.sql
    const providerEnum = mapToProviderEnum(detectedProvider);
    console.log(`   Detected provider: ${providerEnum}, Episodes: ${feed.items.length}`);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Estimate cadence from episodes
    const { cadence, episodesPerMonth } = estimateCadence(feed.items);

    // Step 1: Upsert podcasts FIRST (new schema has rss_url on podcasts table)
    const latestEpisodeAt = feed.items[0]?.publishedAt?.toISOString() || null;
    const { data: podcast, error: podError } = await supabaseAdmin
      .from("podcasts")
      .upsert(
        {
          user_id: userId,
          rss_url: rssUrl,
          title: feed.title,
          author: feed.author,
          description: feed.description?.substring(0, 5000),
          image_url: feed.imageUrl,
          language: feed.language || "en",
          categories: feed.categories,
          explicit: feed.explicit,
          website_url: feed.link,
          latest_episode_at: latestEpisodeAt,
          episode_count_total: feed.items.length,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (podError) {
      console.error("Podcast upsert error:", podError);
      // Check for RSS URL uniqueness violation
      if (podError.code === "23505" && podError.message?.includes("rss_url")) {
        return res.status(409).json({ error: "This podcast RSS feed is already connected by another user" });
      }
      return res.status(500).json({ error: "Failed to save podcast metadata" });
    }

    // Step 2: Upsert podcast_connections (references podcast_id)
    const { data: connection, error: connError } = await supabaseAdmin
      .from("podcast_connections")
      .upsert(
        {
          user_id: userId,
          podcast_id: podcast.id,
          rss_url: rssUrl,
          provider: providerEnum,
          status: "connected",
          last_rss_sync_at: new Date().toISOString(),
        },
        { onConflict: "podcast_id" }
      )
      .select()
      .single();

    if (connError) {
      console.error("Connection upsert error:", connError);
      return res.status(500).json({ error: "Failed to save connection" });
    }

    // Step 3: Upsert episodes (batch insert, skip existing by guid)
    // Filter episodes with valid published_at (required in new schema)
    const episodesToInsert = feed.items
      .filter((ep) => ep.publishedAt)
      .map((ep) => ({
        podcast_id: podcast.id,
        guid: ep.guid,
        title: ep.title,
        published_at: ep.publishedAt!.toISOString(),
        duration_sec: ep.durationSec || null,
        audio_url: ep.audioUrl,
        episode_number: ep.episodeNumber || null,
        season_number: ep.seasonNumber || null,
      }));

    if (episodesToInsert.length > 0) {
      const { error: epError } = await supabaseAdmin
        .from("podcast_episodes")
        .upsert(episodesToInsert, { onConflict: "podcast_id,guid", ignoreDuplicates: true });

      if (epError) {
        console.error("Episodes upsert error:", epError);
        // Non-fatal - continue even if some episodes fail
      }
    }

    console.log(`✅ Connected podcast: "${feed.title}" with ${episodesToInsert.length} episodes`);

    return res.json({
      connection: {
        id: connection.id,
        podcastId: connection.podcast_id,
        rssUrl: connection.rss_url,
        provider: connection.provider,
        status: connection.status,
      },
      podcast: {
        id: podcast.id,
        title: podcast.title,
        author: podcast.author,
        imageUrl: podcast.image_url,
        episodeCountTotal: podcast.episode_count_total,
        latestEpisodeAt: podcast.latest_episode_at,
        cadence,
        episodesPerMonth,
      },
      episodeCount: episodesToInsert.length,
      detectedProvider: providerEnum,
    });
  } catch (err: any) {
    console.error("CONNECT RSS ERROR:", err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err.message : "Failed to connect podcast",
    });
  }
});

// Helper: Map detected provider to DB enum values
function mapToProviderEnum(detected: string): string {
  const mapping: Record<string, string> = {
    buzzsprout: "buzzsprout",
    libsyn: "libsyn",
    transistor: "transistor",
    captivate: "captivate",
    simplecast: "simplecast",
    anchor: "anchor",
    spotify: "spotify_for_creators",
    unknown: "unknown",
  };
  return mapping[detected] || "rss_only";
}

// GET /api/podcast/analytics/sources - Get supported analytics sources
app.get("/api/podcast/analytics/sources", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get user's current connection
    const { data: connection } = await supabaseAdmin
      .from("podcast_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    const detected = connection?.provider || null;
    const supported = getSupportedProviders();

    return res.json({
      detected,
      supported,
      manualAvailable: true,
      currentConnection: connection
        ? {
            id: connection.id,
            rssUrl: connection.rss_url,
            provider: connection.provider,
            status: connection.status,
          }
        : null,
    });
  } catch (err: any) {
    console.error("ANALYTICS SOURCES ERROR:", err);
    return res.status(500).json({ error: "Failed to get analytics sources" });
  }
});

// POST /api/podcast/analytics/manual - Submit manual metrics
app.post("/api/podcast/analytics/manual", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate request
    const validation = validateRequest(manualMetricsSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined,
      });
    }

    console.log(`📊 Manual metrics submission from user: ${userId.substring(0, 8)}...`);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get user's podcast
    const { data: podcast, error: podError } = await supabaseAdmin
      .from("podcasts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (podError || !podcast) {
      return res.status(404).json({ error: "No podcast connected. Please connect RSS first." });
    }

    // Compute metrics snapshot
    const metricsData = computeMetricsFromManual(validation.data);

    // Insert snapshot
    const { data: snapshot, error: snapError } = await supabaseAdmin
      .from("podcast_metrics_snapshots")
      .insert({
        podcast_id: podcast.id,
        period_start: metricsData.periodStart.toISOString().split("T")[0],
        period_end: metricsData.periodEnd.toISOString().split("T")[0],
        source: "manual",
        downloads_30d_total: metricsData.downloads30dTotal,
        avg_downloads_per_episode_30d: metricsData.avgDownloadsPerEpisode30d,
        followers_total: metricsData.followersTotal,
        top_countries: metricsData.topCountries || [],
      })
      .select()
      .single();

    if (snapError) {
      console.error("Snapshot insert error:", snapError);
      return res.status(500).json({ error: "Failed to save metrics" });
    }

    // Compute projections
    const projectionData = computeProjections(metricsData);

    // Insert projection
    const { data: projection, error: projError } = await supabaseAdmin
      .from("monetization_projections")
      .insert({
        podcast_id: podcast.id,
        snapshot_id: snapshot.id,
        assumptions: projectionData.assumptions,
        sellable_impressions_est: projectionData.sellableImpressionsEst,
        sponsor_rev_low: projectionData.sponsorRevLow,
        sponsor_rev_mid: projectionData.sponsorRevMid,
        sponsor_rev_high: projectionData.sponsorRevHigh,
      })
      .select()
      .single();

    if (projError) {
      console.error("Projection insert error:", projError);
      // Non-fatal - return snapshot at minimum
    }

    console.log(`✅ Saved manual metrics: ${metricsData.downloads30dTotal} downloads/30d`);

    return res.json({
      snapshot: {
        id: snapshot.id,
        periodStart: snapshot.period_start,
        periodEnd: snapshot.period_end,
        source: snapshot.source,
        downloads30dTotal: snapshot.downloads_30d_total,
        avgDownloadsPerEpisode30d: snapshot.avg_downloads_per_episode_30d,
      },
      projection: projection
        ? {
            id: projection.id,
            assumptions: projection.assumptions,
            sellableImpressionsEst: projection.sellable_impressions_est,
            sponsorRevLow: projection.sponsor_rev_low,
            sponsorRevMid: projection.sponsor_rev_mid,
            sponsorRevHigh: projection.sponsor_rev_high,
            monthlyRevLow: projectionData.monthlyRevLow,
            monthlyRevMid: projectionData.monthlyRevMid,
            monthlyRevHigh: projectionData.monthlyRevHigh,
          }
        : null,
    });
  } catch (err: any) {
    console.error("MANUAL METRICS ERROR:", err);
    return res.status(500).json({ error: "Failed to process metrics" });
  }
});

// GET /api/podcast/projections/latest - Get latest projection
app.get("/api/podcast/projections/latest", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get user's podcast with latest projection
    const { data: podcast } = await supabaseAdmin
      .from("podcasts")
      .select("id, title, image_url, episode_count_total")
      .eq("user_id", userId)
      .single();

    if (!podcast) {
      return res.status(404).json({ error: "No podcast connected" });
    }

    // Get latest snapshot
    const { data: snapshot } = await supabaseAdmin
      .from("podcast_metrics_snapshots")
      .select("*")
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get latest projection
    const { data: projection } = await supabaseAdmin
      .from("monetization_projections")
      .select("*")
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return res.json({
      podcast: {
        id: podcast.id,
        title: podcast.title,
        imageUrl: podcast.image_url,
        episodeCountTotal: podcast.episode_count_total,
      },
      snapshot: snapshot
        ? {
            id: snapshot.id,
            periodStart: snapshot.period_start,
            periodEnd: snapshot.period_end,
            source: snapshot.source,
            downloads30dTotal: snapshot.downloads_30d_total,
            avgDownloadsPerEpisode30d: snapshot.avg_downloads_per_episode_30d,
            followersTotal: snapshot.followers_total,
          }
        : null,
      projection: projection
        ? {
            id: projection.id,
            assumptions: projection.assumptions,
            sellableImpressionsEst: projection.sellable_impressions_est,
            sponsorRevLow: projection.sponsor_rev_low,
            sponsorRevMid: projection.sponsor_rev_mid,
            sponsorRevHigh: projection.sponsor_rev_high,
          }
        : null,
    });
  } catch (err: any) {
    console.error("GET PROJECTIONS ERROR:", err);
    return res.status(500).json({ error: "Failed to get projections" });
  }
});

// POST /api/podcast/projections/recompute - Recompute with new assumptions
app.post("/api/podcast/projections/recompute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // Validate assumptions
    const validation = validateRequest(projectionsAssumptionsSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid assumptions",
        details: "errors" in validation ? validation.errors : undefined,
      });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get user's podcast
    const { data: podcast } = await supabaseAdmin
      .from("podcasts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!podcast) {
      return res.status(404).json({ error: "No podcast connected" });
    }

    // Get latest snapshot
    const { data: snapshot } = await supabaseAdmin
      .from("podcast_metrics_snapshots")
      .select("*")
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!snapshot) {
      return res.status(404).json({ error: "No metrics data. Please enter metrics first." });
    }

    // Recompute with new assumptions
    const metricsData = {
      periodStart: new Date(snapshot.period_start),
      periodEnd: new Date(snapshot.period_end),
      source: snapshot.source as any,
      downloads30dTotal: snapshot.downloads_30d_total,
      avgDownloadsPerEpisode30d: snapshot.avg_downloads_per_episode_30d,
    };

    const projectionData = computeProjections(metricsData, validation.data);

    // Insert new projection
    const { data: projection, error: projError } = await supabaseAdmin
      .from("monetization_projections")
      .insert({
        podcast_id: podcast.id,
        snapshot_id: snapshot.id,
        assumptions: projectionData.assumptions,
        sellable_impressions_est: projectionData.sellableImpressionsEst,
        sponsor_rev_low: projectionData.sponsorRevLow,
        sponsor_rev_mid: projectionData.sponsorRevMid,
        sponsor_rev_high: projectionData.sponsorRevHigh,
      })
      .select()
      .single();

    if (projError) {
      console.error("Projection insert error:", projError);
      return res.status(500).json({ error: "Failed to save projection" });
    }

    return res.json({
      projection: {
        id: projection.id,
        assumptions: projection.assumptions,
        sellableImpressionsEst: projection.sellable_impressions_est,
        sponsorRevLow: projection.sponsor_rev_low,
        sponsorRevMid: projection.sponsor_rev_mid,
        sponsorRevHigh: projection.sponsor_rev_high,
        monthlyRevLow: projectionData.monthlyRevLow,
        monthlyRevMid: projectionData.monthlyRevMid,
        monthlyRevHigh: projectionData.monthlyRevHigh,
      },
    });
  } catch (err: any) {
    console.error("RECOMPUTE PROJECTIONS ERROR:", err);
    return res.status(500).json({ error: "Failed to recompute projections" });
  }
});

// GET /api/podcast/dashboard - Get complete dashboard data
app.get("/api/podcast/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get connection
    const { data: connection } = await supabaseAdmin
      .from("podcast_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!connection) {
      return res.status(404).json({ error: "No podcast connected", needsSetup: true });
    }

    // Get podcast
    const { data: podcast } = await supabaseAdmin
      .from("podcasts")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!podcast) {
      return res.status(404).json({ error: "Podcast data not found", needsSetup: true });
    }

    // Get recent episodes (last 10)
    const { data: episodes } = await supabaseAdmin
      .from("podcast_episodes")
      .select("id, guid, title, published_at, duration_sec, episode_number, season_number")
      .eq("podcast_id", podcast.id)
      .order("published_at", { ascending: false })
      .limit(10);

    // Get latest metrics
    const { data: latestMetrics } = await supabaseAdmin
      .from("podcast_metrics_snapshots")
      .select("*")
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get latest projection
    const { data: latestProjection } = await supabaseAdmin
      .from("monetization_projections")
      .select("*")
      .eq("podcast_id", podcast.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate cadence from episodes
    const { cadence, episodesPerMonth } = estimateCadence(
      (episodes || []).map((e) => ({ publishedAt: e.published_at }))
    );

    return res.json({
      connection: {
        id: connection.id,
        rssUrl: connection.rss_url,
        provider: connection.provider,
        status: connection.status,
        lastRssSyncAt: connection.last_rss_sync_at,
      },
      podcast: {
        id: podcast.id,
        title: podcast.title,
        author: podcast.author,
        description: podcast.description,
        imageUrl: podcast.image_url,
        categories: podcast.categories,
        episodeCountTotal: podcast.episode_count_total,
        latestEpisodeAt: podcast.latest_episode_at,
        cadence,
        episodesPerMonth,
      },
      recentEpisodes: (episodes || []).map((ep) => ({
        id: ep.id,
        guid: ep.guid,
        title: ep.title,
        publishedAt: ep.published_at,
        durationSec: ep.duration_sec,
        episodeNumber: ep.episode_number,
        seasonNumber: ep.season_number,
      })),
      latestMetrics: latestMetrics
        ? {
            id: latestMetrics.id,
            periodStart: latestMetrics.period_start,
            periodEnd: latestMetrics.period_end,
            source: latestMetrics.source,
            downloads30dTotal: latestMetrics.downloads_30d_total,
            avgDownloadsPerEpisode30d: latestMetrics.avg_downloads_per_episode_30d,
            followersTotal: latestMetrics.followers_total,
            topCountries: latestMetrics.top_countries,
          }
        : null,
      latestProjection: latestProjection
        ? {
            id: latestProjection.id,
            assumptions: latestProjection.assumptions,
            sellableImpressionsEst: latestProjection.sellable_impressions_est,
            sponsorRevLow: latestProjection.sponsor_rev_low,
            sponsorRevMid: latestProjection.sponsor_rev_mid,
            sponsorRevHigh: latestProjection.sponsor_rev_high,
          }
        : null,
      needsMetrics: !latestMetrics,
    });
  } catch (err: any) {
    console.error("PODCAST DASHBOARD ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// POST /api/podcast/resync-rss - Resync RSS feed (with cooldown)
const RESYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

app.post("/api/podcast/resync-rss", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get existing connection
    const { data: connection, error: connFetchErr } = await supabaseAdmin
      .from("podcast_connections")
      .select("*, podcasts(*)")
      .eq("user_id", userId)
      .single();

    if (connFetchErr || !connection) {
      return res.status(404).json({ error: "No podcast connected" });
    }

    // Check cooldown
    const lastSync = connection.last_rss_sync_at
      ? new Date(connection.last_rss_sync_at).getTime()
      : 0;
    const now = Date.now();
    const timeUntilAllowed = RESYNC_COOLDOWN_MS - (now - lastSync);

    if (timeUntilAllowed > 0) {
      const minutesLeft = Math.ceil(timeUntilAllowed / 60000);
      return res.status(429).json({
        error: `Please wait ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} before resyncing`,
        cooldownMs: timeUntilAllowed,
        nextAllowedAt: new Date(now + timeUntilAllowed).toISOString(),
      });
    }

    // Fetch and parse RSS feed
    console.log(`🔄 Resync RSS request from user: ${userId.substring(0, 8)}...`);

    let feed: ParsedPodcastFeed;
    try {
      feed = await fetchAndParseRss(connection.rss_url);
    } catch (err: any) {
      console.error("RSS parse error during resync:", err.message);
      return res.status(400).json({
        error: "Failed to fetch RSS feed",
        details: err.message,
      });
    }

    const podcastId = connection.podcast_id;
    const latestEpisodeAt = feed.items[0]?.publishedAt?.toISOString() || null;

    // Update podcast metadata
    const { error: podUpdateErr } = await supabaseAdmin
      .from("podcasts")
      .update({
        title: feed.title,
        author: feed.author,
        description: feed.description?.substring(0, 5000),
        image_url: feed.imageUrl,
        language: feed.language || "en",
        categories: feed.categories,
        explicit: feed.explicit,
        website_url: feed.link,
        latest_episode_at: latestEpisodeAt,
        episode_count_total: feed.items.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", podcastId);

    if (podUpdateErr) {
      console.error("Podcast update error during resync:", podUpdateErr);
    }

    // Upsert episodes (skip existing by guid)
    const episodesToInsert = feed.items
      .filter((ep) => ep.publishedAt)
      .map((ep) => ({
        podcast_id: podcastId,
        guid: ep.guid,
        title: ep.title,
        published_at: ep.publishedAt!.toISOString(),
        duration_sec: ep.durationSec || null,
        audio_url: ep.audioUrl,
        episode_number: ep.episodeNumber || null,
        season_number: ep.seasonNumber || null,
      }));

    let newEpisodeCount = 0;
    if (episodesToInsert.length > 0) {
      // Get existing GUIDs
      const { data: existingEps } = await supabaseAdmin
        .from("podcast_episodes")
        .select("guid")
        .eq("podcast_id", podcastId);

      const existingGuids = new Set((existingEps || []).map((e) => e.guid));
      const newEpisodes = episodesToInsert.filter((e) => !existingGuids.has(e.guid));
      newEpisodeCount = newEpisodes.length;

      if (newEpisodes.length > 0) {
        const { error: epError } = await supabaseAdmin
          .from("podcast_episodes")
          .upsert(newEpisodes, { onConflict: "podcast_id,guid", ignoreDuplicates: true });

        if (epError) {
          console.error("Episodes upsert error during resync:", epError);
        }
      }
    }

    // Update last sync timestamp
    await supabaseAdmin
      .from("podcast_connections")
      .update({ last_rss_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    console.log(`✅ Resync complete: ${feed.items.length} total episodes, ${newEpisodeCount} new`);

    return res.json({
      success: true,
      episodeCountTotal: feed.items.length,
      newEpisodeCount,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("RESYNC RSS ERROR:", err);
    return res.status(500).json({ error: "Failed to resync RSS feed" });
  }
});

// Beta Admin Routes - Admin-only endpoints for beta management
// GET /api/admin/beta/metrics - Get beta metrics dashboard
app.get("/api/admin/beta/metrics", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // TODO: Add admin role check here - for now allowing any authenticated user
    // In production, check if user has admin role

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get total users (active beta testers)
    const { count: totalUsers, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (userError) {
      console.error("User count error:", userError);
      return res.status(500).json({ error: "Failed to get user count" });
    }

    // Get waitlist count
    const { count: waitlistCount, error: waitlistError } = await supabaseAdmin
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (waitlistError) {
      console.error("Waitlist count error:", waitlistError);
      return res.status(500).json({ error: "Failed to get waitlist count" });
    }

    // Get connected podcasts count
    const { count: connectedPodcasts, error: podcastError } = await supabaseAdmin
      .from("podcasts")
      .select("*", { count: "exact", head: true });

    if (podcastError) {
      console.error("Podcast count error:", podcastError);
      return res.status(500).json({ error: "Failed to get podcast count" });
    }

    // Get analyses run today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: analysesToday, error: todayError } = await supabaseAdmin
      .from("podcast_analyses")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (todayError) {
      console.error("Today analyses count error:", todayError);
      return res.status(500).json({ error: "Failed to get today's analyses count" });
    }

    // Get analyses this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const { count: analysesThisWeek, error: weekError } = await supabaseAdmin
      .from("podcast_analyses")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString());

    if (weekError) {
      console.error("Week analyses count error:", weekError);
      return res.status(500).json({ error: "Failed to get week's analyses count" });
    }

    return res.json({
      totalUsers: totalUsers || 0,
      waitlistCount: waitlistCount || 0,
      connectedPodcasts: connectedPodcasts || 0,
      analysesToday: analysesToday || 0,
      analysesThisWeek: analysesThisWeek || 0,
      betaCapacity: 50, // Configurable beta capacity
      betaRemaining: Math.max(0, 50 - (totalUsers || 0)),
    });
  } catch (err: any) {
    console.error("BETA METRICS ERROR:", err);
    return res.status(500).json({ error: "Failed to get beta metrics" });
  }
});

// GET /api/admin/beta/testers - Get list of beta testers
app.get("/api/admin/beta/testers", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    // TODO: Add admin role check here - for now allowing any authenticated user

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get all profiles with their podcast and analysis counts
    const { data: testers, error: testersError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        created_at,
        last_sign_in_at,
        podcasts!inner(count),
        podcast_analyses!inner(count)
      `)
      .order("created_at", { ascending: false });

    if (testersError) {
      console.error("Testers fetch error:", testersError);
      return res.status(500).json({ error: "Failed to get testers list" });
    }

    // Transform the data to match the expected format
    const transformedTesters = (testers || []).map((tester: any) => ({
      id: tester.id,
      email: tester.email,
      name: tester.full_name,
      created_at: tester.created_at,
      last_sign_in_at: tester.last_sign_in_at,
      podcast_count: tester.podcasts?.[0]?.count || 0,
      analysis_count: tester.podcast_analyses?.[0]?.count || 0,
    }));

    return res.json(transformedTesters);
  } catch (err: any) {
    console.error("BETA TESTERS ERROR:", err);
    return res.status(500).json({ error: "Failed to get beta testers" });
  }
});

// DELETE /api/admin/beta/remove-tester/:userId - Remove a tester
app.delete("/api/admin/beta/remove-tester/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminUserId = getUserId(req);
    const { userId: targetUserId } = req.params;

    // TODO: Add admin role check here - for now allowing any authenticated user

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    console.log(`🗑️ Removing beta tester: ${targetUserId} by admin: ${adminUserId}`);

    // Delete in order: analyses, projections, metrics, episodes, connections, podcasts, profile
    // This ensures foreign key constraints are satisfied

    // Delete podcast analyses
    await supabaseAdmin
      .from("podcast_analyses")
      .delete()
      .eq("user_id", targetUserId);

    // Delete monetization projections
    await supabaseAdmin
      .from("monetization_projections")
      .delete()
      .eq("podcast_id", await getPodcastId(targetUserId));

    // Delete metrics snapshots
    await supabaseAdmin
      .from("podcast_metrics_snapshots")
      .delete()
      .eq("podcast_id", await getPodcastId(targetUserId));

    // Delete podcast episodes
    await supabaseAdmin
      .from("podcast_episodes")
      .delete()
      .eq("podcast_id", await getPodcastId(targetUserId));

    // Delete scheduled posts
    await supabaseAdmin
      .from("scheduled_posts")
      .delete()
      .eq("user_id", targetUserId);

    // Delete podcast connections
    await supabaseAdmin
      .from("podcast_connections")
      .delete()
      .eq("user_id", targetUserId);

    // Delete podcasts
    await supabaseAdmin
      .from("podcasts")
      .delete()
      .eq("user_id", targetUserId);

    // Finally delete the profile
    const { error: profileError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (profileError) {
      console.error("Profile deletion error:", profileError);
      return res.status(500).json({ error: "Failed to delete user account" });
    }

    console.log(`✅ Successfully removed beta tester: ${targetUserId}`);
    return res.json({ success: true, message: "Tester removed successfully" });
  } catch (err: any) {
    console.error("REMOVE TESTER ERROR:", err);
    return res.status(500).json({ error: "Failed to remove tester" });
  }
});

// POST /api/admin/beta/reinvite - Re-invite a tester
app.post("/api/admin/beta/reinvite", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminUserId = getUserId(req);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // TODO: Add admin role check here - for now allowing any authenticated user

    console.log(`📧 Re-inviting beta tester: ${email} by admin: ${adminUserId}`);

    // For now, just log the re-invite. In production, you'd send an actual email
    // You could integrate with a service like SendGrid, Mailgun, etc.

    console.log(`✅ Re-invite logged for: ${email}`);
    return res.json({ success: true, message: "Re-invite sent successfully" });
  } catch (err: any) {
    console.error("REINVITE TESTER ERROR:", err);
    return res.status(500).json({ error: "Failed to send re-invite" });
  }
});

// Helper function to get podcast ID for a user
async function getPodcastId(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const { data: podcast } = await supabaseAdmin
    .from("podcasts")
    .select("id")
    .eq("user_id", userId)
    .single();

  return podcast?.id || null;
}

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

// helper (put near bottom or a utils file)
function parseDurationToSeconds(value: any): number | null {
  if (!value) return null;
  if (typeof value === "number") return value;

  const s = String(value).trim();
  // "SS", "MM:SS", "HH:MM:SS"
  if (/^\d+$/.test(s)) return Number(s);

  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

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
