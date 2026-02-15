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
import { attachPlan } from "./middleware/planCheck.js";
import { enforceAnalysisLimit, enforceScheduleLimit, enforceAutomationLimit, getUserUsage, FREE_LIMITS, getLimits } from "./middleware/planLimits.js";
import { stripe, PRICE_MAP, PRICE_TO_PLAN, VALID_PRICE_IDS, getPriceId, type Stripe } from "./services/stripe.js";
import { requireTeamRole, TeamAuthRequest, getPermissionsForRole } from "./middleware/teamAuth.js";
import {
  analyzeRequestSchema,
  repurposeRequestSchema,
  chatRequestSchema,
  sponsorRequestSchema,
  metricsRequestSchema,
  createScheduledPostSchema,
  updateScheduledPostSchema,
  createTeamSchema,
  updateTeamSchema,
  createInviteSchema,
  updateMemberRoleSchema,
  acceptInviteSchema,
  validateRequest,
  scheduleAutomationTriggerSchema,
  scheduleNewsletterSchema
} from "./validation/schemas.js";
import crypto from "crypto";

import Parser from "rss-parser";
import { getSpotifyAuthUrl, removeSpotifyConnection } from "./spotify-oauth.js";
import { getMarketingAdapter, isMarketingProvider } from "./integrations/registry.js";
import type { MarketingProvider } from "./integrations/types.js";
import { logIntegrationEvent } from "./integrations/events.js";
import { kitAuthUrl, kitCallback, kitStatus } from "./kit-oauth.js";
import { mailchimpAuthUrl, mailchimpCallback, mailchimpDisconnect, mailchimpStatus } from "./mailchimp-oauth.js";
import { looksLikeSendGridKey, validateSendGridKey, fetchSendGridLists, fetchSendGridTemplates, createAndScheduleSendGridSingleSend } from "./sendgrid.js";

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

// CORS — hardcoded allowed origins + env-based validation
const allowedOrigins = new Set([
  "https://app.loquihq.com",
  "https://loquihq.com",
  "https://www.loquihq.com",
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // Allow non-browser tools with no Origin header (curl, Cloud Scheduler, etc.)
    if (!origin) return cb(null, true);

    if (allowedOrigins.has(origin)) return cb(null, true);

    console.warn(`🚫 Blocked CORS request from: ${origin}`);
    return cb(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-cron-secret"],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// CRITICAL: handle preflight BEFORE auth/routes
app.options("*", cors(corsOptions));

// MUST be before app.use(express.json())
app.post(
  "/api/stripe/webhooks",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    // === CAN'T-MISS diagnostic log — runs before anything else ===
    console.log("🧾 STRIPE WEBHOOK HIT", {
      hasStripe: !!stripe,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      contentType: req.headers["content-type"],
      hasSig: !!req.headers["stripe-signature"],
      bodyType: typeof req.body,
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyLen: Buffer.isBuffer(req.body) ? req.body.length : null,
    });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
      console.error("Stripe not configured: missing stripe client or webhook secret");
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ STRIPE WEBHOOK ERROR", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Post-verification log with event details
    console.log("✅ STRIPE EVENT:", event.type, {
      id: event.id,
      created: event.created,
    });

    try {
      if (!supabaseAdmin) {
        console.error("supabaseAdmin not configured, skipping webhook processing");
        return res.status(200).json({ received: true });
      }

      // Helper: update profile
      const updateProfile = async (userId: string, patch: Record<string, any>) => {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ ...patch })
          .eq("id", userId);

        if (error) throw new Error(`Supabase update failed: ${error.message}`);
      };

      // Helper: determine plan from subscription items (returns null if unknown price)
      const planFromSub = (sub: Stripe.Subscription): "starter" | "pro" | "growth" | null => {
        const priceId = sub.items.data?.[0]?.price?.id || "";
        const mapped = PRICE_TO_PLAN[priceId];
        if (!mapped) {
          console.error("Unknown Stripe priceId; not updating plan:", { priceId, subId: sub.id });
          return null;
        }
        return mapped as "starter" | "pro" | "growth";
      };

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;

          const userId = session.metadata?.user_id;
          if (!userId) {
            console.warn("checkout.session.completed missing metadata.user_id");
            break;
          }

          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : null;

          let plan: string | null = "starter";
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            plan = planFromSub(sub);
            if (!plan) {
              console.warn("checkout.session.completed: unknown price, skipping plan update for user", userId);
              break;
            }
          } else {
            plan = (session.metadata?.plan as string) || "starter";
          }

          await updateProfile(userId, {
            plan,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id: subscriptionId,
          });

          console.log(`checkout completed -> user ${userId} plan=${plan}`);
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;

          const customerId = typeof sub.customer === "string" ? sub.customer : null;
          const userId = (sub.metadata?.user_id as string | undefined) || null;

          // Don't downgrade on cancel_at_period_end — user still has time left.
          // Only downgrade when status is actually canceled/unpaid/incomplete_expired.
          const badStatuses = new Set(["canceled", "unpaid", "incomplete_expired"]);
          const shouldDowngrade = badStatuses.has(sub.status);

          let finalPlan: string;
          if (shouldDowngrade) {
            finalPlan = "free";
          } else {
            const nextPlan = planFromSub(sub);
            if (!nextPlan) {
              // Unknown price — don't update plan, just bail
              break;
            }
            finalPlan = nextPlan;
          }

          if (userId) {
            await updateProfile(userId, {
              plan: finalPlan,
              stripe_subscription_id: sub.id,
              ...(customerId ? { stripe_customer_id: customerId } : {}),
            });
            console.log(`subscription.updated -> user ${userId} plan=${finalPlan}`);
          } else if (customerId) {
            const { data, error } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();

            if (error || !data?.id) {
              console.warn("subscription.updated could not find profile for customer", customerId);
              break;
            }

            await updateProfile(data.id, {
              plan: finalPlan,
              stripe_subscription_id: sub.id,
            });
            console.log(`subscription.updated -> user ${data.id} plan=${finalPlan}`);
          } else {
            console.warn("subscription.updated missing customer id + metadata.user_id");
          }

          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;

          const customerId = typeof sub.customer === "string" ? sub.customer : null;
          const userId = (sub.metadata?.user_id as string | undefined) || null;

          const patch = {
            plan: "free",
            stripe_subscription_id: null,
          };

          if (userId) {
            await updateProfile(userId, patch);
            console.log(`subscription.deleted -> user ${userId} downgraded to free`);
          } else if (customerId) {
            const { data, error } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();

            if (error || !data?.id) {
              console.warn("subscription.deleted could not find profile for customer", customerId);
              break;
            }

            await updateProfile(data.id, patch);
            console.log(`subscription.deleted -> user ${data.id} downgraded to free`);
          } else {
            console.warn("subscription.deleted missing customer id + metadata.user_id");
          }

          break;
        }

        default:
          console.log("STRIPE IGNORED EVENT:", event.type);
          break;
      }

      // Always respond 200 — even for ignored or unhandled events
      return res.status(200).json({ received: true });
    } catch (err: any) {
      // Log fully but don't crash Stripe with a 500 (prevents retry storms)
      console.error("❌ STRIPE WEBHOOK ERROR", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        eventId: event.id,
        type: event.type,
      });

      // Return 200 to stop retries while iterating
      return res.status(200).json({ received: true, handled: false });
    }
  }
);

// Different size limits for different endpoints (will be refined per-route)
app.use(express.json({ limit: "5mb" })); // Default 5MB for most endpoints

// Root route
app.get("/", (_req, res) => {
  res.status(200).send("LoquiHQ API is running. Try /health");
});

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

async function extractTextFromInlineDocument(inlineData: { mimeType: string; data: string }): Promise<string> {
  const { mimeType, data } = inlineData;
  const buffer = Buffer.from(data, 'base64');

  if (mimeType === 'application/pdf') {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const parsed = await pdfParse(buffer);
    return String(parsed?.text || '').trim();
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammothModule = await import('mammoth');
    const mammoth = (mammothModule as any).default || mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    return String(result?.value || '').trim();
  }

  if (mimeType === 'application/msword') {
    throw new Error('DOC files are not supported. Please upload DOCX or PDF.');
  }

  throw new Error('Unsupported document type');
}

// AI Analysis endpoint with strict rate limiting + auth + validation
app.post("/api/analyze", requireAuth, attachPlan, enforceAnalysisLimit, aiAnalysisLimiter, async (req: AuthRequest, res) => {
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

    let normalizedContentInput = contentInput;

    if (typeof contentInput !== 'string') {
      const mimeType = contentInput.inlineData?.mimeType;
      if (
        mimeType === 'application/pdf' ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const extractedText = await extractTextFromInlineDocument(contentInput.inlineData);
        if (!extractedText || extractedText.length < 10) {
          return res.status(400).json({ error: 'We could not extract readable text from this document.' });
        }
        normalizedContentInput = extractedText.slice(0, 50000);
      }
    }

    const result = await analyzeWithGemini({ contentInput: normalizedContentInput, settings });
    return res.json(result);
  } catch (err: any) {
    console.error("ANALYZE ERROR:", err);
    console.error("ANALYZE ERROR message:", err?.message);
    console.error("ANALYZE ERROR stack:", err?.stack);
    console.error("ANALYZE ERROR cause:", err?.cause);
    console.error("ANALYZE ERROR response:", err?.response);
    console.error("ANALYZE ERROR details:", err?.details);

    const requestId = (req as any).requestId;

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
    } else if (errorMessage.includes("NOT_FOUND") || errorMessage.toLowerCase().includes("model") && errorMessage.toLowerCase().includes("not found")) {
      userMessage = "AI model unavailable. Please try again later.";
      statusCode = 503;
    } else if (errorMessage.includes("Missing GEMINI_API_KEY")) {
      userMessage = "API configuration error. Please check your API key.";
      statusCode = 500;
    } else if (errorMessage.includes("No response from Gemini")) {
      userMessage = "No response received from the AI service. Please try again.";
      statusCode = 500;
    }

    if (requestId) {
      userMessage = `${userMessage} (ref: ${requestId})`;
    }

    return res.status(statusCode).json({
      error: userMessage,
      requestId,
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

    // Get user's name from profiles table to personalize email sign-offs
    let userName = '';
    if (supabaseAdmin && (type === 'email_series')) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      userName = profile?.full_name || '';
      // Fallback to email prefix if no name stored
      if (!userName) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (data?.user?.email) {
          userName = data.user.email.split('@')[0];
        }
      }
    }

    const enrichedContext = userName
      ? `${context}\n\nHost/Author Name: ${userName}`
      : context;

    const result = await repurposeWithGemini({ type, context: enrichedContext });
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

// AI Guest suggestions (based on transcript context) + auth
app.post("/api/suggest-guests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { context } = req.body ?? {};

    console.log(`👥 Guest suggestions request from user: ${userId.substring(0, 8)}...`);

    if (!context) {
      return res.status(400).json({ error: "Context is required for guest suggestions" });
    }

    const { suggestGuestsWithGemini } = await import("./gemini.js");
    const guests = await suggestGuestsWithGemini(context);

    console.log(`✅ Generated ${guests.length} guest suggestions`);
    return res.json(guests);
  } catch (err: any) {
    console.error("GUESTS SUGGEST ERROR:", err?.message);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err?.message : "Server error"
    });
  }
});

// ============================================================================
// GUEST CRUD ENDPOINTS
// ============================================================================

// GET /api/guests - List all guests for user
app.get("/api/guests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { data: guests, error } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("GET GUESTS ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    // Transform snake_case to camelCase for frontend
    const transformed = (guests || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      title: g.title,
      bio: g.bio,
      expertise: g.expertise || [],
      status: g.status,
      email: g.email,
      website: g.website,
      notes: g.notes,
      matchReason: g.match_reason,
      sourceTranscriptId: g.source_transcript_id,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));

    return res.json(transformed);
  } catch (err: any) {
    console.error("GET GUESTS ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/guests - Add a new guest
app.post("/api/guests", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const guest = req.body;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!guest.name) {
      return res.status(400).json({ error: "Guest name is required" });
    }

    const { data, error } = await supabaseAdmin
      .from('guests')
      .insert({
        user_id: userId,
        name: guest.name,
        title: guest.title || null,
        bio: guest.bio || null,
        expertise: guest.expertise || [],
        status: guest.status || 'Suggested',
        email: guest.email || null,
        website: guest.website || null,
        notes: guest.notes || null,
        match_reason: guest.matchReason || null,
        source_transcript_id: guest.sourceTranscriptId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("ADD GUEST ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Guest added for user: ${userId.substring(0, 8)}... - ${guest.name}`);
    return res.json(data);
  } catch (err: any) {
    console.error("ADD GUEST ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/guests/:id - Update a guest
app.post("/api/guests/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const guestId = req.params.id;
    const updates = req.body;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Build update object with snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.expertise !== undefined) updateData.expertise = updates.expertise;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.matchReason !== undefined) updateData.match_reason = updates.matchReason;

    const { data, error } = await supabaseAdmin
      .from('guests')
      .update(updateData)
      .eq('id', guestId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error("UPDATE GUEST ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Guest updated: ${guestId}`);
    return res.json(data);
  } catch (err: any) {
    console.error("UPDATE GUEST ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/guests/:id/delete - Delete a guest
app.post("/api/guests/:id/delete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const guestId = req.params.id;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { error } = await supabaseAdmin
      .from('guests')
      .delete()
      .eq('id', guestId)
      .eq('user_id', userId);

    if (error) {
      console.error("DELETE GUEST ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Guest deleted: ${guestId}`);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE GUEST ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Generate outreach email for a guest + auth
app.post("/api/outreach", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { guestName, guestBio, context, podcastName, hostName } = req.body ?? {};

    console.log(`📧 Outreach email request from user: ${userId.substring(0, 8)}...`);

    if (!guestName) {
      return res.status(400).json({ error: "Missing guestName" });
    }

    // Use Gemini to generate a personalized outreach email
    const { generateOutreachEmail } = await import("./gemini.js");
    const email = await generateOutreachEmail({
      guestName,
      guestBio: guestBio || "",
      context: context || "",
      podcastName,
      hostName
    });

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
// TEAM COLLABORATION ENDPOINTS
// ============================================================================

// POST /api/team - Create a new team
app.post("/api/team", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const validation = validateRequest(createTeamSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.errors
      });
    }

    const { name } = validation.data;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Create the team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name,
        owner_id: userId,
        max_members: 1
      })
      .select()
      .single();

    if (teamError) {
      console.error("CREATE TEAM ERROR:", teamError);
      return res.status(500).json({ error: teamError.message });
    }

    // Add creator as owner member
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'owner',
        invited_by: userId
      });

    if (memberError) {
      console.error("ADD TEAM OWNER ERROR:", memberError);
      // Clean up the team if member creation fails
      await supabaseAdmin.from('teams').delete().eq('id', team.id);
      return res.status(500).json({ error: memberError.message });
    }

    console.log(`✅ Team created: ${team.id} by user ${userId.substring(0, 8)}...`);

    return res.json({
      id: team.id,
      name: team.name,
      role: 'owner',
      pricingTier: team.pricing_tier ?? 'free',
      maxMembers: team.max_members,
      createdAt: team.created_at
    });
  } catch (err: any) {
    console.error("CREATE TEAM ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team - List user's teams
app.get("/api/team", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Get all teams user is a member of
    const { data: memberships, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        role,
        joined_at,
        teams:team_id (
          id,
          name,
          owner_id,
          max_members,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("GET TEAMS ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    // Transform to expected format
    const teams = (memberships || []).map((m: any) => ({
      id: m.teams.id,
      name: m.teams.name,
      role: m.role,
      isOwner: m.teams.owner_id === userId,
      pricingTier: m.teams.pricing_tier ?? 'free',
      maxMembers: m.teams.max_members,
      joinedAt: m.joined_at,
      createdAt: m.teams.created_at
    }));

    return res.json(teams);
  } catch (err: any) {
    console.error("GET TEAMS ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team/:teamId - Get team details
app.get("/api/team/:teamId", requireAuth, requireTeamRole('viewer'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Get team details
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    return res.json({
      id: team.id,
      name: team.name,
      ownerId: team.owner_id,
      pricingTier: team.pricing_tier ?? 'free',
      maxMembers: team.max_members,
      memberCount: count || 0,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      currentUserRole: req.teamMembership?.role,
      currentUserPermissions: req.teamMembership?.permissions
    });
  } catch (err: any) {
    console.error("GET TEAM ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/team/:teamId - Update team (admin/owner only)
app.patch("/api/team/:teamId", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    const validation = validateRequest(updateTeamSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.errors
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (validation.data.name) updateData.name = validation.data.name;

    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      console.error("UPDATE TEAM ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      id: team.id,
      name: team.name,
      updatedAt: team.updated_at
    });
  } catch (err: any) {
    console.error("UPDATE TEAM ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team/:teamId/members - List team members
app.get("/api/team/:teamId/members", requireAuth, requireTeamRole('viewer'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { data: members, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error("GET MEMBERS ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    // Get user profiles for members
    const userIds = (members || []).map((m: any) => m.user_id);
    const { data: profiles } = await supabaseAdmin.auth.admin.listUsers();

    const userMap = new Map();
    (profiles?.users || []).forEach((u: any) => {
      if (userIds.includes(u.id)) {
        userMap.set(u.id, {
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0]
        });
      }
    });

    const transformed = (members || []).map((m: any) => {
      const profile = userMap.get(m.user_id) || {};
      return {
        id: m.id,
        odayhelloId: m.user_id,
        role: m.role,
        email: profile.email || 'Unknown',
        name: profile.name || 'Unknown',
        joinedAt: m.joined_at,
        invitedBy: m.invited_by
      };
    });

    return res.json(transformed);
  } catch (err: any) {
    console.error("GET MEMBERS ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/team/:teamId/members/:userId - Change member role (admin/owner only)
app.patch("/api/team/:teamId/members/:userId", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId, userId: targetUserId } = req.params;
    const currentUserId = getUserId(req);

    const validation = validateRequest(updateMemberRoleSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.errors
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Check if target is an owner - can't change owner's role
    const { data: targetMember, error: checkError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single();

    if (checkError || !targetMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: "Cannot change owner's role" });
    }

    // Non-owners can't promote to admin
    if (req.teamMembership?.role !== 'owner' && validation.data.role === 'admin') {
      return res.status(403).json({ error: "Only team owner can promote to admin" });
    }

    const { data: member, error } = await supabaseAdmin
      .from('team_members')
      .update({ role: validation.data.role })
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) {
      console.error("UPDATE MEMBER ROLE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Role updated: user ${targetUserId.substring(0, 8)}... to ${validation.data.role} in team ${teamId.substring(0, 8)}...`);

    return res.json({
      id: member.id,
      userId: member.user_id,
      role: member.role
    });
  } catch (err: any) {
    console.error("UPDATE MEMBER ROLE ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/team/:teamId/members/:userId - Remove member (admin/owner only)
app.delete("/api/team/:teamId/members/:userId", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId, userId: targetUserId } = req.params;
    const currentUserId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Check if target is an owner - can't remove owner
    const { data: targetMember, error: checkError } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .single();

    if (checkError || !targetMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: "Cannot remove team owner" });
    }

    // Users can remove themselves (leave team)
    if (targetUserId !== currentUserId && req.teamMembership?.role !== 'owner' && req.teamMembership?.role !== 'admin') {
      return res.status(403).json({ error: "Only admins can remove other members" });
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error("REMOVE MEMBER ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Member removed: ${targetUserId.substring(0, 8)}... from team ${teamId.substring(0, 8)}...`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("REMOVE MEMBER ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/team/:teamId/invites - Create invite (admin/owner only)
app.post("/api/team/:teamId/invites", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;
    const userId = getUserId(req);

    const validation = validateRequest(createInviteSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.errors
      });
    }

    const { email, role } = validation.data;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', email) // This won't work directly - need to lookup by email
      .single();

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Check for existing pending invite to same email
    const { data: existingInvite } = await supabaseAdmin
      .from('team_invites')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .is('revoked_at', null)
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      return res.status(400).json({
        error: "Invite already exists",
        message: "A pending invite already exists for this email"
      });
    }

    const { data: invite, error } = await supabaseAdmin
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        token,
        token_hash: tokenHash,
        invited_by: userId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("CREATE INVITE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    // Get team name for the invite link
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    // Build invite URL (frontend will handle this)
    const inviteUrl = `${process.env.FRONTEND_PUBLIC_URL!}/invite?token=${token}`;

    console.log(`✅ Invite created for ${email} to team ${teamId.substring(0, 8)}...`);

    // Auto-send invite email via Gmail (non-blocking)
    let emailSent = false;
    try {
      const { getGmailConnection, getValidGmailToken, sendGmailEmail } = await import('./oauth/gmail.js');
      const gmailConnection = await getGmailConnection(userId);

      if (gmailConnection) {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        const apiPublicUrl = process.env.API_PUBLIC_URL || '';
        const redirectUri = `${apiPublicUrl}/api/integrations/gmail/callback`;
        const config = { clientId, clientSecret, redirectUri };

        const accessToken = await getValidGmailToken(config, userId);

        // Get inviter's name
        const { data: inviterProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        const inviterName = inviterProfile?.full_name || gmailConnection.email || 'A team member';

        const subject = `You've been invited to join ${team?.name || 'a team'} on LoquiHQ`;
        const body = `Hi there,\n\n${inviterName} has invited you to join the team "${team?.name || 'their team'}" on LoquiHQ as ${role === 'admin' ? 'an' : 'a'} ${role}.\n\nClick the link below to accept:\n${inviteUrl}\n\nThis invite expires in 7 days.\n\nBest,\nThe LoquiHQ Team`;

        await sendGmailEmail(accessToken, email, subject, body);
        emailSent = true;
        console.log(`📧 Invite email sent to ${email}`);
      }
    } catch (emailErr: any) {
      console.warn(`⚠️ Could not send invite email to ${email}:`, emailErr?.message);
      // Don't fail the invite — just fall back to manual link sharing
    }

    return res.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
      inviteUrl,
      teamName: team?.name,
      emailSent
    });
  } catch (err: any) {
    console.error("CREATE INVITE ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team/:teamId/invites - List pending invites (admin/owner only)
app.get("/api/team/:teamId/invites", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { data: invites, error } = await supabaseAdmin
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .is('revoked_at', null)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("GET INVITES ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    const transformed = (invites || []).map((i: any) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      isExpired: new Date(i.expires_at) < new Date()
    }));

    return res.json(transformed);
  } catch (err: any) {
    console.error("GET INVITES ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/team/invites/accept - Accept invite (any authenticated user)
app.post("/api/team/invites/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const validation = validateRequest(acceptInviteSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.errors
      });
    }

    const { token } = validation.data;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Hash the token to lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the invite
    const { data: invite, error: findError } = await supabaseAdmin
      .from('team_invites')
      .select('*, teams:team_id (name)')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .is('accepted_at', null)
      .single();

    if (findError || !invite) {
      return res.status(404).json({
        error: "Invalid or expired invite",
        message: "This invite link is invalid, expired, or has already been used"
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({
        error: "Invite expired",
        message: "This invite has expired. Please request a new one."
      });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return res.status(400).json({
        error: "Already a member",
        message: "You are already a member of this team"
      });
    }

    // Add user as team member
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by
      });

    if (memberError) {
      console.error("ACCEPT INVITE - ADD MEMBER ERROR:", memberError);
      return res.status(500).json({ error: memberError.message });
    }

    // Mark invite as accepted
    await supabaseAdmin
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Trigger welcome sequence if Mailchimp is configured (non-blocking)
    try {
      await scheduleWelcomeTrigger(userId, supabaseAdmin);
    } catch (e: any) {
      console.warn('Welcome trigger skipped:', e?.message || e);
    }

    console.log(`✅ Invite accepted: user ${userId.substring(0, 8)}... joined team ${invite.team_id.substring(0, 8)}... as ${invite.role}`);

    return res.json({
      success: true,
      teamId: invite.team_id,
      teamName: invite.teams?.name,
      role: invite.role
    });
  } catch (err: any) {
    console.error("ACCEPT INVITE ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

async function scheduleWelcomeTrigger(userId: string, supabaseAdmin: any) {
  // Ensure Mailchimp connection exists
  const { data: connection } = await supabaseAdmin
    .from('connected_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'mailchimp')
    .maybeSingle();

  if (!connection) return;

  // Destination (audience)
  const { data: destination } = await supabaseAdmin
    .from('email_destinations')
    .select('id, audience_id')
    .eq('user_id', userId)
    .eq('provider', 'mailchimp')
    .limit(1)
    .maybeSingle();

  if (!destination?.audience_id) return;

  // Automation (tag)
  const { data: automation } = await supabaseAdmin
    .from('email_automations')
    .select('id, trigger_value')
    .eq('user_id', userId)
    .eq('provider', 'mailchimp')
    .eq('trigger_value', 'loquihq_welcome')
    .limit(1)
    .maybeSingle();

  if (!automation?.trigger_value) return;

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email) return;

  const now = new Date().toISOString();

  await supabaseAdmin
    .from('scheduled_posts')
    .insert({
      user_id: userId,
      platform: 'email',
      provider: 'mailchimp',
      content: 'Welcome sequence triggered',
      scheduled_date: now,
      scheduled_at: now,
      status: 'Scheduled',
      meta: {
        provider: 'mailchimp',
        destinationId: destination.id,
        audienceId: destination.audience_id,
        subscriberEmail: userData.user.email,
        tags: ['loquihq_welcome'],
        mergeFields: {},
        automationId: automation.id,
        lastError: null,
      }
    });
}

// POST /api/team/:teamId/invites/:inviteId/revoke - Revoke invite (admin/owner only)
app.post("/api/team/:teamId/invites/:inviteId/revoke", requireAuth, requireTeamRole('admin'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId, inviteId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { error } = await supabaseAdmin
      .from('team_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('team_id', teamId);

    if (error) {
      console.error("REVOKE INVITE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Invite ${inviteId.substring(0, 8)}... revoked in team ${teamId.substring(0, 8)}...`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("REVOKE INVITE ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team/:teamId/me - Get current user's role and permissions
app.get("/api/team/:teamId/me", requireAuth, requireTeamRole('viewer'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    return res.json({
      teamId,
      role: req.teamMembership?.role,
      permissions: req.teamMembership?.permissions
    });
  } catch (err: any) {
    console.error("GET MY PERMISSIONS ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/team/:teamId/integrations/status - Get all integration statuses for team
app.get("/api/team/:teamId/integrations/status", requireAuth, requireTeamRole('viewer'), async (req: TeamAuthRequest, res) => {
  try {
    const { teamId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Get all connected accounts for team members
    // For now, get the owner's connected accounts as the "team" accounts
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const { data: accounts, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('user_id', team.owner_id);

    if (error) {
      console.error("GET INTEGRATIONS ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    // Build status map for each platform
    const platformStatus: Record<string, any> = {
      linkedin: { connected: false },
      twitter: { connected: false },
      medium: { connected: false },
      gmail: { connected: false },
      facebook: { connected: false }
    };

    for (const account of (accounts || [])) {
      const provider = account.provider;
      if (platformStatus[provider] !== undefined) {
        const isExpired = account.expires_at && new Date(account.expires_at) < new Date();
        platformStatus[provider] = {
          connected: !isExpired,
          accountName: account.profile?.name || account.profile?.email || 'Connected',
          scopes: account.scopes || [],
          tokenExpired: isExpired,
          expiresAt: account.expires_at
        };
      }
    }

    return res.json(platformStatus);
  } catch (err: any) {
    console.error("GET INTEGRATIONS STATUS ERROR:", err?.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// ============================================================================
// SPOTIFY OAUTH ENDPOINTS (Real Download Data)
// ============================================================================

app.get("/api/spotify/auth", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

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

// ============================================================================
// KIT OAUTH ENDPOINTS (Email/CRM)
// ============================================================================

app.get("/api/integrations/kit/auth-url", requireAuth, kitAuthUrl);
app.get("/api/integrations/kit/callback", kitCallback); // callback is public
app.get("/api/integrations/kit/status", requireAuth, kitStatus);
app.post("/api/integrations/kit/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const { error } = await supabaseAdmin
      .from("connected_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "kit");

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to disconnect Kit' });
  }
});

// ============================================================================
// MAILCHIMP OAUTH ENDPOINTS (Email/CRM)
// ============================================================================

app.get("/api/integrations/mailchimp/auth-url", requireAuth, mailchimpAuthUrl);
app.get("/api/integrations/mailchimp/callback", mailchimpCallback); // callback is public
app.get("/api/integrations/mailchimp/status", requireAuth, mailchimpStatus);
app.post("/api/integrations/mailchimp/disconnect", requireAuth, mailchimpDisconnect);

// Mailchimp resources
app.get("/api/integrations/mailchimp/audiences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const connection = await getMailchimpConnection(getUserId(req));
    if (!connection) return res.status(400).json({ error: 'Mailchimp not connected' });

    const response = await fetch(`${connection.apiEndpoint}/lists?count=100`, {
      headers: { 'Authorization': `Bearer ${connection.accessToken}` },
    });

    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(500).json({ error: `Mailchimp lists fetch failed: ${response.status} - ${JSON.stringify(json)}` });
    }

    return res.json({ audiences: json.lists || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch audiences' });
  }
});

app.get("/api/integrations/mailchimp/tags", requireAuth, async (req: AuthRequest, res) => {
  try {
    const audienceId = String(req.query.audienceId || '');
    if (!audienceId) return res.status(400).json({ error: 'audienceId is required' });

    const connection = await getMailchimpConnection(getUserId(req));
    if (!connection) return res.status(400).json({ error: 'Mailchimp not connected' });

    const response = await fetch(`${connection.apiEndpoint}/lists/${audienceId}/segments?count=100`, {
      headers: { 'Authorization': `Bearer ${connection.accessToken}` },
    });

    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(500).json({ error: `Mailchimp tags fetch failed: ${response.status} - ${JSON.stringify(json)}` });
    }

    return res.json({ tags: json.segments || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch tags' });
  }
});

app.post("/api/integrations/mailchimp/tags", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { audienceId, tag } = req.body || {};
    if (!audienceId || !tag) return res.status(400).json({ error: 'audienceId and tag are required' });

    const connection = await getMailchimpConnection(getUserId(req));
    if (!connection) return res.status(400).json({ error: 'Mailchimp not connected' });

    const response = await fetch(`${connection.apiEndpoint}/lists/${audienceId}/segments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify({
        name: tag,
        static_segment: [],
      }),
    });

    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(500).json({ error: `Mailchimp tag create failed: ${response.status} - ${JSON.stringify(json)}` });
    }

    return res.json({ tag: json });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create tag' });
  }
});

app.post("/api/integrations/mailchimp/destination", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const { audienceId, name } = req.body || {};
    if (!audienceId) {
      return res.status(400).json({ error: 'audienceId is required' });
    }

    const userId = getUserId(req);
    const { data, error } = await supabaseAdmin
      .from('email_destinations')
      .insert({
        user_id: userId,
        provider: 'mailchimp',
        audience_id: audienceId,
        name: name || 'Default',
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ destination: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save destination' });
  }
});

app.post("/api/integrations/mailchimp/automation", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const { destinationId, name, triggerValue } = req.body || {};
    if (!destinationId || !name || !triggerValue) {
      return res.status(400).json({ error: 'destinationId, name, and triggerValue are required' });
    }

    const userId = getUserId(req);
    const { data, error } = await supabaseAdmin
      .from('email_automations')
      .insert({
        user_id: userId,
        provider: 'mailchimp',
        destination_id: destinationId,
        name,
        trigger_type: 'tag_applied',
        trigger_value: triggerValue,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ automation: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save automation' });
  }
});

app.get("/api/integrations/mailchimp/destinations", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const { data, error } = await supabaseAdmin
      .from('email_destinations')
      .select('id, name, audience_id, created_at')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ destinations: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load destinations' });
  }
});

app.get("/api/integrations/mailchimp/automations", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const destinationId = String(req.query.destinationId || '');

    let query = supabaseAdmin
      .from('email_automations')
      .select('id, name, destination_id, trigger_type, trigger_value, created_at')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .order('created_at', { ascending: false });

    if (destinationId) {
      query = query.eq('destination_id', destinationId);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ automations: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load automations' });
  }
});

// LinkedIn OAuth callback - handles redirect from LinkedIn
app.get("/api/integrations/linkedin/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;

  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}/?oauth_error=linkedin&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?oauth_error=linkedin&message=${encodeURIComponent('Missing authorization code')}`);
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      userId = stateData.userId;

      // Check state isn't too old (10 minute max)
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return res.redirect(`${frontendUrl}/?oauth_error=linkedin&message=${encodeURIComponent('Authorization expired, please try again')}`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/?oauth_error=linkedin&message=${encodeURIComponent('Invalid state parameter')}`);
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
    return res.redirect(`${frontendUrl}/?oauth=linkedin`);
  } catch (err: any) {
    console.error('LinkedIn callback failed:', err);
    return res.redirect(`${frontendUrl}/?oauth_error=linkedin&message=${encodeURIComponent(err.message || 'Connection failed')}`);
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

    // Safely format expiresAt - handle invalid dates
    let expiresAtStr: string | null = null;
    try {
      if (connection.tokenExpiresAt && !isNaN(connection.tokenExpiresAt.getTime())) {
        expiresAtStr = connection.tokenExpiresAt.toISOString();
      }
    } catch {
      // Invalid date - leave as null
    }

    return res.json({
      connected: true,
      accountName: connection.accountName,
      accountId: connection.accountId,
      tokenExpired: isTokenExpired(connection.tokenExpiresAt),
      expiresAt: expiresAtStr,
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
// GMAIL OAUTH ENDPOINTS (Send Emails via Gmail)
// ============================================================================

app.get("/api/integrations/gmail/auth-url", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getGmailAuthUrl } = await import('./oauth/gmail.js');

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Gmail OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    }

    const redirectUri = `${apiPublicUrl}/api/integrations/gmail/callback`;
    const config = { clientId, clientSecret, redirectUri };

    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');

    console.log(`📧 Gmail auth request from user: ${userId.substring(0, 8)}...`);

    const authUrl = getGmailAuthUrl(config, state);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('Gmail auth URL generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/integrations/gmail/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;

  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Gmail OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}/?oauth_error=gmail&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?oauth_error=gmail&message=${encodeURIComponent('Missing authorization code')}`);
    }

    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      userId = stateData.userId;
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return res.redirect(`${frontendUrl}/?oauth_error=gmail&message=${encodeURIComponent('Authorization expired')}`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/?oauth_error=gmail&message=${encodeURIComponent('Invalid state')}`);
    }

    const { exchangeGmailCode, getGmailProfile, storeGmailConnection } = await import('./oauth/gmail.js');

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/gmail/callback`;
    const config = { clientId, clientSecret, redirectUri };

    const tokens = await exchangeGmailCode(config, code as string);
    const profile = await getGmailProfile(tokens.accessToken);
    await storeGmailConnection(userId, tokens, profile);

    console.log(`✅ Gmail connected for user: ${userId.substring(0, 8)}... (${profile.email})`);
    return res.redirect(`${frontendUrl}/?oauth=gmail`);
  } catch (err: any) {
    console.error('Gmail callback failed:', err);
    return res.redirect(`${frontendUrl}/?oauth_error=gmail&message=${encodeURIComponent(err.message || 'Connection failed')}`);
  }
});

app.get("/api/integrations/gmail/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getGmailConnection } = await import('./oauth/gmail.js');

    const connection = await getGmailConnection(userId);

    if (!connection) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      email: connection.email,
      name: connection.name,
    });
  } catch (err: any) {
    console.error('Gmail status check failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/integrations/gmail/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeGmailConnection } = await import('./oauth/gmail.js');

    await removeGmailConnection(userId);
    console.log(`🔌 Gmail disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'Gmail disconnected' });
  } catch (err: any) {
    console.error('Gmail disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/integrations/gmail/send", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const { getValidGmailToken, sendGmailEmail } = await import('./oauth/gmail.js');

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/gmail/callback`;
    const config = { clientId, clientSecret, redirectUri };

    const accessToken = await getValidGmailToken(config, userId);
    const result = await sendGmailEmail(accessToken, to, subject, body);

    console.log(`📤 Email sent via Gmail for user: ${userId.substring(0, 8)}... to: ${to}`);

    return res.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
    });
  } catch (err: any) {
    console.error('Gmail send failed:', err);

    if (err.message.includes('not connected')) {
      return res.status(401).json({
        error: 'Gmail not connected. Please connect your account first.',
        reconnectRequired: true,
      });
    }

    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// FACEBOOK OAUTH ENDPOINTS (Social Media Posting to Pages)
// ============================================================================

app.get("/api/integrations/facebook/auth-url", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getFacebookAuthUrl } = await import('./oauth/facebook.js');

    const appId = process.env.FACEBOOK_APP_ID || '';
    const appSecret = process.env.FACEBOOK_APP_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';

    if (!appId || !appSecret) {
      return res.status(500).json({ error: 'Facebook OAuth not configured' });
    }

    if (!apiPublicUrl) {
      return res.status(500).json({ error: 'API_PUBLIC_URL not configured' });
    }

    const redirectUri = `${apiPublicUrl}/api/integrations/facebook/callback`;
    const config = { appId, appSecret, redirectUri };

    // Use userId as state for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');

    console.log(`🔗 Facebook auth request from user: ${userId.substring(0, 8)}...`);

    const authUrl = getFacebookAuthUrl(config, state);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('Facebook auth URL generation failed:', err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err.message : 'Authentication service error'
    });
  }
});

// Facebook OAuth callback - handles redirect from Facebook
app.get("/api/integrations/facebook/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;

  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}/?oauth_error=facebook&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?oauth_error=facebook&message=${encodeURIComponent('Missing authorization code')}`);
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      userId = stateData.userId;

      // Check state isn't too old (10 minute max)
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return res.redirect(`${frontendUrl}/?oauth_error=facebook&message=${encodeURIComponent('Authorization expired, please try again')}`);
      }
    } catch {
      return res.redirect(`${frontendUrl}/?oauth_error=facebook&message=${encodeURIComponent('Invalid state parameter')}`);
    }

    const {
      exchangeFacebookCode,
      exchangeForLongLivedToken,
      getFacebookProfile,
      getFacebookPages,
      storeFacebookConnection
    } = await import('./oauth/facebook.js');

    const appId = process.env.FACEBOOK_APP_ID || '';
    const appSecret = process.env.FACEBOOK_APP_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/facebook/callback`;

    const config = { appId, appSecret, redirectUri };

    // Exchange code for short-lived token
    const shortLivedTokens = await exchangeFacebookCode(config, code as string);

    // Exchange for long-lived token (60 days)
    const tokens = await exchangeForLongLivedToken(config, shortLivedTokens.accessToken);

    // Get user profile
    const profile = await getFacebookProfile(tokens.accessToken);

    // Get user's pages
    const pages = await getFacebookPages(tokens.accessToken);

    // Store connection with first page selected by default (if any)
    const defaultPage = pages.length > 0 ? pages[0] : undefined;
    await storeFacebookConnection(userId, tokens, profile, defaultPage);

    console.log(`✅ Facebook connected for user: ${userId.substring(0, 8)}... (${profile.name}, ${pages.length} pages)`);

    // Redirect back to frontend settings page
    return res.redirect(`${frontendUrl}/?oauth=facebook`);
  } catch (err: any) {
    console.error('Facebook callback failed:', err);
    return res.redirect(`${frontendUrl}/?oauth_error=facebook&message=${encodeURIComponent(err.message || 'Connection failed')}`);
  }
});

// Get Facebook connection status
app.get("/api/integrations/facebook/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getFacebookConnection, isTokenExpired } = await import('./oauth/facebook.js');

    const connection = await getFacebookConnection(userId);

    if (!connection) {
      return res.json({ connected: false });
    }

    // Safely format expiresAt
    let expiresAtStr: string | null = null;
    try {
      if (connection.tokenExpiresAt && !isNaN(connection.tokenExpiresAt.getTime())) {
        expiresAtStr = connection.tokenExpiresAt.toISOString();
      }
    } catch {
      // Invalid date - leave as null
    }

    return res.json({
      connected: true,
      accountName: connection.accountName,
      accountId: connection.accountId,
      tokenExpired: isTokenExpired(connection.tokenExpiresAt),
      expiresAt: expiresAtStr,
      selectedPage: connection.selectedPage ? {
        id: connection.selectedPage.id,
        name: connection.selectedPage.name,
      } : null,
    });
  } catch (err: any) {
    console.error('Facebook status check failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get user's Facebook pages
app.get("/api/integrations/facebook/pages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getFacebookConnection, getFacebookPages } = await import('./oauth/facebook.js');

    const connection = await getFacebookConnection(userId);

    if (!connection) {
      return res.status(400).json({ error: 'Facebook not connected' });
    }

    const pages = await getFacebookPages(connection.accessToken);

    return res.json({ pages });
  } catch (err: any) {
    console.error('Facebook pages fetch failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Select Facebook page for posting
app.post("/api/integrations/facebook/select-page", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { pageId } = req.body;

    if (!pageId) {
      return res.status(400).json({ error: 'Page ID is required' });
    }

    const { getFacebookConnection, getFacebookPages, updateSelectedFacebookPage } = await import('./oauth/facebook.js');

    const connection = await getFacebookConnection(userId);

    if (!connection) {
      return res.status(400).json({ error: 'Facebook not connected' });
    }

    // Get fresh pages list to get the page access token
    const pages = await getFacebookPages(connection.accessToken);
    const selectedPage = pages.find(p => p.id === pageId);

    if (!selectedPage) {
      return res.status(400).json({ error: 'Page not found or you do not have access' });
    }

    await updateSelectedFacebookPage(userId, selectedPage);

    console.log(`📄 Facebook page selected for user: ${userId.substring(0, 8)}... (${selectedPage.name})`);

    return res.json({
      success: true,
      selectedPage: {
        id: selectedPage.id,
        name: selectedPage.name,
      }
    });
  } catch (err: any) {
    console.error('Facebook page selection failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Disconnect Facebook
app.delete("/api/integrations/facebook/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeFacebookConnection } = await import('./oauth/facebook.js');

    await removeFacebookConnection(userId);

    console.log(`🔌 Facebook disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'Facebook disconnected' });
  } catch (err: any) {
    console.error('Facebook disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Post to Facebook Page
app.post("/api/integrations/facebook/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { content, link } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const { getFacebookConnection, getValidFacebookPageToken, postToFacebookPage } = await import('./oauth/facebook.js');

    const connection = await getFacebookConnection(userId);

    if (!connection) {
      return res.status(400).json({ error: 'Facebook not connected. Please connect your account first.' });
    }

    if (!connection.selectedPage) {
      return res.status(400).json({ error: 'No Facebook page selected. Please select a page first.' });
    }

    // Get valid page token
    const { pageId, pageAccessToken } = await getValidFacebookPageToken(connection);

    // Post to Facebook Page
    const result = await postToFacebookPage(pageAccessToken, pageId, content.trim(), {
      link,
    });

    console.log(`📤 Facebook post created for user: ${userId.substring(0, 8)}... (postId: ${result.postId})`);

    return res.json({
      success: true,
      postId: result.postId,
      postUrl: result.postUrl,
    });
  } catch (err: any) {
    console.error('Facebook post failed:', err);

    // Handle token expiration
    if (err.message.includes('expired') || err.message.includes('reconnect')) {
      return res.status(401).json({
        error: 'Facebook session expired. Please reconnect your account.',
        reconnectRequired: true,
      });
    }

    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// X OAUTH ENDPOINTS (Social Media Posting)
// Uses OAuth 2.0 with PKCE (Proof Key for Code Exchange)
// ============================================================================

app.get("/api/integrations/x/auth-url", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const {
      getTwitterAuthUrl,
      generateCodeVerifier,
      generateCodeChallenge,
      storeOAuthState
    } = await import('./oauth/twitter.js');

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'X OAuth not configured' });
    }

    if (!apiPublicUrl) {
      return res.status(500).json({ error: 'API_PUBLIC_URL not configured' });
    }

    const redirectUri = `${apiPublicUrl}/api/integrations/x/callback`;
    const config = { clientId, clientSecret, redirectUri };

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Generate state with userId
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');

    // Store state and code verifier for callback
    await storeOAuthState(userId, state, codeVerifier);

    console.log(`🔗 X auth request from user: ${userId.substring(0, 8)}...`);

    const authUrl = getTwitterAuthUrl(config, state, codeChallenge);
    return res.json({ authUrl });
  } catch (err: any) {
    console.error('X auth URL generation failed:', err);
    return res.status(500).json({
      error: backendEnv.isDevelopment ? err.message : 'Authentication service error'
    });
  }
});

// X OAuth callback - handles redirect from X
app.get("/api/integrations/x/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;

  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('X OAuth error:', error, error_description);
      return res.redirect(`${frontendUrl}/?oauth_error=x&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?oauth_error=x&message=${encodeURIComponent('Missing authorization code')}`);
    }

    const {
      getOAuthState,
      exchangeTwitterCode,
      getTwitterProfile,
      storeTwitterConnection
    } = await import('./oauth/twitter.js');

    // Get stored state and code verifier
    const storedState = await getOAuthState(state as string);
    if (!storedState) {
      return res.redirect(`${frontendUrl}/?oauth_error=x&message=${encodeURIComponent('Invalid or expired state. Please try again.')}`);
    }

    const { userId, codeVerifier } = storedState;

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/x/callback`;

    const config = { clientId, clientSecret, redirectUri };

    // Exchange code for tokens using PKCE
    const tokens = await exchangeTwitterCode(config, code as string, codeVerifier);

    // Get user profile
    const profile = await getTwitterProfile(tokens.accessToken);

    // Store connection
    await storeTwitterConnection(userId, tokens, profile);

    console.log(`✅ X connected for user: ${userId.substring(0, 8)}... (@${profile.username})`);

    // Redirect back to frontend settings page
    return res.redirect(`${frontendUrl}/?oauth=x`);
  } catch (err: any) {
    console.error('X callback failed:', err);
    return res.redirect(`${frontendUrl}/?oauth_error=x&message=${encodeURIComponent(err.message || 'Connection failed')}`);
  }
});

// Get X connection status
app.get("/api/integrations/x/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getTwitterConnection, isTokenExpired } = await import('./oauth/twitter.js');

    const connection = await getTwitterConnection(userId);

    if (!connection) {
      return res.json({ connected: false });
    }

    // Safely format expiresAt
    let expiresAtStr: string | null = null;
    try {
      if (connection.tokenExpiresAt && !isNaN(connection.tokenExpiresAt.getTime())) {
        expiresAtStr = connection.tokenExpiresAt.toISOString();
      }
    } catch {
      // Invalid date - leave as null
    }

    return res.json({
      connected: true,
      accountName: connection.accountName,
      username: connection.username,
      accountId: connection.accountId,
      tokenExpired: isTokenExpired(connection.tokenExpiresAt),
      expiresAt: expiresAtStr,
    });
  } catch (err: any) {
    console.error('X status check failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Disconnect X
app.delete("/api/integrations/x/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeTwitterConnection } = await import('./oauth/twitter.js');

    await removeTwitterConnection(userId);

    console.log(`🔌 X disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'X disconnected' });
  } catch (err: any) {
    console.error('X disconnect failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Post to X
app.post("/api/integrations/x/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { content, replyToTweetId, quoteTweetId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    // X has a 280 character limit
    if (content.trim().length > 280) {
      return res.status(400).json({ error: 'Post exceeds 280 character limit' });
    }

    const { getTwitterConnection, getValidTwitterToken, postTweet } = await import('./oauth/twitter.js');

    const connection = await getTwitterConnection(userId);

    if (!connection) {
      return res.status(400).json({ error: 'X not connected. Please connect your account first.' });
    }

    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';
    const apiPublicUrl = process.env.API_PUBLIC_URL || '';
    const redirectUri = `${apiPublicUrl}/api/integrations/x/callback`;
    const config = { clientId, clientSecret, redirectUri };

    // Get valid token (refresh if needed)
    const accessToken = await getValidTwitterToken(config, connection);

    // Post tweet
    const result = await postTweet(accessToken, content.trim(), {
      replyToTweetId,
      quoteTweetId,
    });

    console.log(`📤 X post created for user: ${userId.substring(0, 8)}... (tweetId: ${result.tweetId})`);

    return res.json({
      success: true,
      postId: result.tweetId,
      postUrl: result.tweetUrl,
    });
  } catch (err: any) {
    console.error('X post failed:', err);

    // Handle token expiration
    if (err.message.includes('expired') || err.message.includes('reconnect')) {
      return res.status(401).json({
        error: 'X session expired. Please reconnect your account.',
        reconnectRequired: true,
      });
    }

    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// MEDIUM INTEGRATION (Token-based, not OAuth)
// ============================================================================

app.post("/api/integrations/medium/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Integration token is required' });
    }

    const { validateMediumToken, storeMediumConnection } = await import('./oauth/medium.js');

    // Validate token by fetching user profile
    const profile = await validateMediumToken(token);

    // Store connection
    await storeMediumConnection(userId, token, profile);

    console.log(`✅ Medium connected for user: ${userId.substring(0, 8)}... (username: ${profile.username})`);

    return res.json({
      success: true,
      message: 'Medium account connected successfully!',
      profile: {
        name: profile.name,
        username: profile.username,
      },
    });
  } catch (err: any) {
    console.error('Medium connection failed:', err);

    return res.status(400).json({
      message: err.message || 'Failed to connect Medium account',
    });
  }
});

app.get("/api/integrations/medium/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { getMediumConnection } = await import('./oauth/medium.js');

    const connection = await getMediumConnection(userId);

    if (!connection) {
      return res.json({
        status: { connected: false },
      });
    }

    return res.json({
      status: {
        connected: true,
        accountName: connection.accountName,
        username: connection.username,
        userId: connection.accountId,
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch Medium status:', err);
    return res.status(500).json({ error: 'Failed to fetch Medium status' });
  }
});

app.delete("/api/integrations/medium/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeMediumConnection } = await import('./oauth/medium.js');

    await removeMediumConnection(userId);

    console.log(`🔌 Medium disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'Medium account disconnected' });
  } catch (err: any) {
    console.error('Failed to disconnect Medium:', err);
    return res.status(500).json({ error: 'Failed to disconnect Medium account' });
  }
});

app.post("/api/integrations/medium/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { title, content, contentFormat = 'markdown' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const { getMediumConnection, createMediumPost } = await import('./oauth/medium.js');

    const connection = await getMediumConnection(userId);
    if (!connection) {
      return res.status(401).json({ error: 'Medium account not connected' });
    }

    const result = await createMediumPost(connection.accessToken, connection.accountId, {
      title: title.substring(0, 300),
      content,
      contentFormat,
      publishStatus: 'public',
    });

    console.log(`📤 Medium post created for user: ${userId.substring(0, 8)}... (postId: ${result.id})`);

    return res.json({
      success: true,
      postId: result.id,
      postUrl: result.url,
    });
  } catch (err: any) {
    console.error('Medium post failed:', err);

    return res.status(500).json({ error: err.message || 'Failed to publish to Medium' });
  }
});

// ============================================================================
// SENDGRID INTEGRATION (API Key-based)
// ============================================================================

app.post("/api/integrations/sendgrid/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const apiKey = String(req.body?.apiKey ?? "").trim();

    if (!apiKey) {
      return res.status(400).json({ error: "Missing apiKey" });
    }

    if (!looksLikeSendGridKey(apiKey)) {
      return res.status(400).json({ error: "Invalid SendGrid API key format. Keys should start with 'SG.'" });
    }

    // Validate key via GET /user/account
    const v = await validateSendGridKey(apiKey);

    // Fetch selectable resources so the UI can populate dropdowns
    const [lists, templates] = await Promise.all([
      fetchSendGridLists(apiKey).catch(() => []),
      fetchSendGridTemplates(apiKey).catch(() => []),
    ]);

    // Also fetch verified senders
    const { getSendGridSenders } = await import('./oauth/sendgrid.js');
    const senders = await getSendGridSenders(apiKey).catch(() => []);

    // Auto-select first verified sender as default
    const defaultSender = senders.find((s: any) => s.verified) || senders[0] || null;

    const now = new Date().toISOString();

    // Store connection in connected_accounts (upsert by user+provider)
    const { error } = await supabaseAdmin!
      .from("connected_accounts")
      .upsert({
        user_id: userId,
        provider: "sendgrid",
        provider_user_id: v.profile.username,
        access_token: apiKey,
        refresh_token: null,
        expires_at: null,
        scopes: ["mail.send", "marketing.read", "templates.read"],
        profile: {
          username: v.profile.username,
          email: v.profile.email,
          firstName: v.profile.firstName,
          lastName: v.profile.lastName,
        },
        status: "connected",
        metadata: {
          senders,
          defaultSender: defaultSender ? { email: defaultSender.email, name: defaultSender.name } : null,
          templates,
          lists,
          lastVerifiedAt: now,
        },
        updated_at: now,
      }, { onConflict: "user_id,provider" });

    if (error) throw new Error(error.message);

    console.log(`✅ SendGrid connected for user: ${userId.substring(0, 8)}... (account: ${v.accountName})`);

    return res.json({
      success: true,
      message: "SendGrid account connected successfully!",
      profile: {
        username: v.profile.username,
        email: v.profile.email,
      },
    });
  } catch (err: any) {
    console.error("SendGrid connection failed:", err);
    return res.status(400).json({
      error: err.message || "Failed to connect SendGrid account",
    });
  }
});

app.get("/api/integrations/sendgrid/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin!
      .from("connected_accounts")
      .select("provider, provider_user_id, profile, metadata, updated_at")
      .eq("user_id", userId)
      .eq("provider", "sendgrid")
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      return res.json({ status: { connected: false } });
    }

    return res.json({
      status: {
        connected: true,
        email: data.profile?.email || "",
        username: data.profile?.username || data.provider_user_id || "",
        senders: data.metadata?.senders || [],
        defaultSender: data.metadata?.defaultSender || null,
        templates: data.metadata?.templates || [],
        lists: data.metadata?.lists || [],
        lastVerifiedAt: data.metadata?.lastVerifiedAt || null,
      },
    });
  } catch (err: any) {
    console.error("Failed to fetch SendGrid status:", err);
    return res.status(500).json({ error: "Failed to fetch SendGrid status" });
  }
});

app.post("/api/integrations/sendgrid/default-sender", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Sender email is required' });
    }

    const { updateSendGridDefaultSender } = await import('./oauth/sendgrid.js');

    await updateSendGridDefaultSender(userId, { email, name: name || '' });

    console.log(`📧 SendGrid default sender updated for user: ${userId.substring(0, 8)}... (${email})`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update SendGrid default sender:', err);
    return res.status(500).json({ error: err.message || 'Failed to update default sender' });
  }
});

app.post("/api/integrations/sendgrid/refresh-senders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { refreshSendGridSenders } = await import('./oauth/sendgrid.js');

    const senders = await refreshSendGridSenders(userId);

    console.log(`🔄 SendGrid senders refreshed for user: ${userId.substring(0, 8)}... (${senders.length} senders)`);

    return res.json({ success: true, senders });
  } catch (err: any) {
    console.error('Failed to refresh SendGrid senders:', err);
    return res.status(500).json({ error: err.message || 'Failed to refresh senders' });
  }
});

app.delete("/api/integrations/sendgrid/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { removeSendGridConnection } = await import('./oauth/sendgrid.js');

    await removeSendGridConnection(userId);

    console.log(`🔌 SendGrid disconnected for user: ${userId.substring(0, 8)}...`);

    return res.json({ success: true, message: 'SendGrid account disconnected' });
  } catch (err: any) {
    console.error('Failed to disconnect SendGrid:', err);
    return res.status(500).json({ error: 'Failed to disconnect SendGrid account' });
  }
});

app.post("/api/integrations/sendgrid/send", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const { to, subject, html, text, from, replyTo } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient (to) and subject are required' });
    }

    if (!html && !text) {
      return res.status(400).json({ error: 'Email content (html or text) is required' });
    }

    const { getSendGridConnection, sendSendGridEmail } = await import('./oauth/sendgrid.js');

    const connection = await getSendGridConnection(userId);
    if (!connection) {
      return res.status(401).json({ error: 'SendGrid account not connected' });
    }

    const result = await sendSendGridEmail(connection.accessToken, {
      to,
      subject,
      html,
      text,
      from,
      replyTo,
    });

    console.log(`📧 SendGrid email sent for user: ${userId.substring(0, 8)}... (messageId: ${result.messageId})`);

    return res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error('SendGrid send failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

app.get("/api/integrations/sendgrid/lists", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin!
      .from("connected_accounts")
      .select("access_token")
      .eq("user_id", userId)
      .eq("provider", "sendgrid")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.access_token) return res.status(400).json({ error: "SendGrid not connected" });

    const lists = await fetchSendGridLists(String(data.access_token));
    return res.json({ lists });
  } catch (err: any) {
    console.error("SendGrid lists failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load lists" });
  }
});

app.get("/api/integrations/sendgrid/senders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin!
      .from("connected_accounts")
      .select("access_token")
      .eq("user_id", userId)
      .eq("provider", "sendgrid")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.access_token) return res.status(400).json({ error: "SendGrid not connected" });

    const { getSendGridSenders } = await import('./oauth/sendgrid.js');
    const senders = await getSendGridSenders(String(data.access_token));

    return res.json({ senders });
  } catch (err: any) {
    console.error("SendGrid senders failed:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch senders" });
  }
});

app.get("/api/integrations/sendgrid/templates", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin!
      .from("connected_accounts")
      .select("access_token")
      .eq("user_id", userId)
      .eq("provider", "sendgrid")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.access_token) return res.status(400).json({ error: "SendGrid not connected" });

    const templates = await fetchSendGridTemplates(String(data.access_token));
    return res.json({ templates });
  } catch (err: any) {
    console.error("SendGrid templates failed:", err);
    return res.status(500).json({ error: err.message || "Failed to load templates" });
  }
});

// ============================================================================
// EMAIL/CRM INTEGRATIONS (Unified Adapter Layer)
// ============================================================================

const buildMarketingContext = (req: AuthRequest, provider: MarketingProvider) => ({
  userId: getUserId(req),
  provider,
  requestId: (req as any).requestId,
});

app.get("/api/integrations/:provider/auth-url", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  const ctx = buildMarketingContext(req, provider as MarketingProvider);

  await logIntegrationEvent({
    userId: ctx.userId,
    provider,
    eventType: 'auth_start',
    status: 'pending',
    payload: { action: 'auth_url' },
  });

  try {
    const result = await adapter.getAuthUrl(ctx);
    if (!result.supported) {
      await logIntegrationEvent({
        userId: ctx.userId,
        provider,
        eventType: 'auth_failure',
        status: 'failure',
        error: result.message,
      });
      return res.json(result);
    }

    await logIntegrationEvent({
      userId: ctx.userId,
      provider,
      eventType: 'auth_success',
      status: 'success',
      payload: { action: 'auth_url' },
    });

    return res.json({
      supported: true,
      authUrl: result.data.authUrl,
      capabilities: adapter.capabilities,
    });
  } catch (err: any) {
    await logIntegrationEvent({
      userId: ctx.userId,
      provider,
      eventType: 'auth_failure',
      status: 'failure',
      error: err?.message || 'Auth URL failed',
    });
    return res.status(500).json({ error: err?.message || 'Failed to get auth URL' });
  }
});

app.get("/api/integrations/:provider/callback", optionalAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  const userId = req.user?.id || req.query.userId;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const params: Record<string, string> = {};
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (typeof value === 'string') params[key] = value;
  });

  const ctx = { userId, provider: provider as MarketingProvider, requestId: (req as any).requestId };

  try {
    const result = await adapter.handleCallback(ctx, params);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Callback failed' });
  }
});

app.get("/api/integrations/:provider/status", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const status = await adapter.getStatus(buildMarketingContext(req, provider as MarketingProvider));
    return res.json({ status, capabilities: adapter.capabilities });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch status' });
  }
});

app.post("/api/integrations/:provider/disconnect", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.disconnect(buildMarketingContext(req, provider as MarketingProvider));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to disconnect' });
  }
});

app.get("/api/integrations/:provider/audiences", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.listAudiences(buildMarketingContext(req, provider as MarketingProvider));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch audiences' });
  }
});

app.post("/api/integrations/:provider/contacts", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;
  const { email, fields } = req.body || {};

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.upsertContact(buildMarketingContext(req, provider as MarketingProvider), email, fields || {});
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'contact_upsert',
      status: result.supported ? 'success' : 'failure',
      payload: { email },
      error: result.supported ? null : result.message,
    });
    return res.json(result);
  } catch (err: any) {
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'contact_upsert',
      status: 'failure',
      payload: { email },
      error: err?.message || 'Contact upsert failed',
    });
    return res.status(500).json({ error: err?.message || 'Failed to upsert contact' });
  }
});

app.post("/api/integrations/:provider/subscribe", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;
  const { audienceId, email } = req.body || {};

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  if (!audienceId || typeof audienceId !== 'string' || !email || typeof email !== 'string') {
    return res.status(400).json({ error: 'audienceId and email are required' });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.subscribe(buildMarketingContext(req, provider as MarketingProvider), audienceId, email);
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'subscribe',
      status: result.supported ? 'success' : 'failure',
      payload: { email, audienceId },
      error: result.supported ? null : result.message,
    });
    return res.json(result);
  } catch (err: any) {
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'subscribe',
      status: 'failure',
      payload: { email, audienceId },
      error: err?.message || 'Subscribe failed',
    });
    return res.status(500).json({ error: err?.message || 'Failed to subscribe' });
  }
});

app.post("/api/integrations/:provider/tag", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;
  const { email, tag } = req.body || {};

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  if (!email || typeof email !== 'string' || !tag || typeof tag !== 'string') {
    return res.status(400).json({ error: 'email and tag are required' });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.tag(buildMarketingContext(req, provider as MarketingProvider), email, tag);
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'tag',
      status: result.supported ? 'success' : 'failure',
      payload: { email, tag },
      error: result.supported ? null : result.message,
    });
    return res.json(result);
  } catch (err: any) {
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'tag',
      status: 'failure',
      payload: { email, tag },
      error: err?.message || 'Tag failed',
    });
    return res.status(500).json({ error: err?.message || 'Failed to tag contact' });
  }
});

app.post("/api/integrations/:provider/send", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;
  const payload = req.body || {};

  if (!isMarketingProvider(provider)) {
    return res.status(404).json({ error: "Unknown provider" });
  }

  const adapter = getMarketingAdapter(provider);
  if (!adapter) {
    return res.status(404).json({ error: "Provider not supported" });
  }

  try {
    const result = await adapter.sendOrTrigger(buildMarketingContext(req, provider as MarketingProvider), payload);
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: result.supported ? 'send' : 'send_failure',
      status: result.supported ? 'success' : 'failure',
      payload,
      error: result.supported ? null : result.message,
    });
    return res.json(result);
  } catch (err: any) {
    await logIntegrationEvent({
      userId: getUserId(req),
      provider,
      eventType: 'send_failure',
      status: 'failure',
      payload,
      error: err?.message || 'Send failed',
    });
    return res.status(500).json({ error: err?.message || 'Failed to send/trigger' });
  }
});

// ============================================================================
// EMAIL LISTS MANAGEMENT
// ============================================================================

// Get all email lists for the current user
app.get("/api/email-lists", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin
      .from("email_lists")
      .select("id, name, email_count, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (err: any) {
    console.error("Email lists fetch error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch email lists" });
  }
});

// Get a single email list with all emails
app.get("/api/email-lists/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("email_lists")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Email list not found" });

    return res.json(data);
  } catch (err: any) {
    console.error("Email list fetch error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch email list" });
  }
});

// Create a new email list (from CSV data)
app.post("/api/email-lists", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const { name, emails } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "List name is required" });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "At least one email is required" });
    }

    // Validate and clean emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => emailRegex.test(e));

    if (validEmails.length === 0) {
      return res.status(400).json({ error: "No valid email addresses found" });
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(validEmails)];

    const { data, error } = await supabaseAdmin
      .from("email_lists")
      .insert({
        user_id: userId,
        name: name.trim(),
        emails: uniqueEmails,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`📧 Email list created: "${name}" with ${uniqueEmails.length} emails for user ${userId.substring(0, 8)}...`);

    return res.json({
      id: data.id,
      name: data.name,
      email_count: uniqueEmails.length,
      created_at: data.created_at,
    });
  } catch (err: any) {
    console.error("Email list create error:", err);
    return res.status(500).json({ error: err.message || "Failed to create email list" });
  }
});

// Delete an email list
app.delete("/api/email-lists/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = getUserId(req);
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("email_lists")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    console.log(`📧 Email list deleted: ${id} for user ${userId.substring(0, 8)}...`);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Email list delete error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete email list" });
  }
});

// ============================================================================
// SCHEDULED POSTS PUBLISHER (Cloud Scheduler cron job endpoint)
// ============================================================================

app.post("/api/jobs/publish-scheduled", async (req, res) => {
  const secret = req.header("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET || process.env.PUBLISHER_CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET not configured");
    return res.status(500).json({ error: "Publisher not configured" });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn("Unauthorized publish-scheduled request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const summary = await processScheduledPosts();
    return res.json({ ok: true, ...summary });
  } catch (err: any) {
    console.error("Publisher job error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Cron dispatcher (preferred path)
app.post("/api/cron/dispatch-scheduled-posts", async (req, res) => {
  const secret = req.header("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET || process.env.PUBLISHER_CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET not configured");
    return res.status(500).json({ error: "Publisher not configured" });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn("Unauthorized dispatch-scheduled-posts request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const summary = await processScheduledPosts();
    return res.json({ ok: true, ...summary });
  } catch (err: any) {
    console.error("Dispatch job error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Email-only cron executor
app.post("/api/cron/email-dispatch", generalLimiter, async (req, res) => {
  const secret = req.header("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET || process.env.PUBLISHER_CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET not configured");
    return res.status(500).json({ error: "Publisher not configured" });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn("Unauthorized email-dispatch request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const summary = await processEmailScheduledPosts();
    return res.json({ ok: true, ...summary });
  } catch (err: any) {
    console.error("Email dispatch job error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Schedule automation trigger (Mailchimp/Kit)
app.post("/api/email/schedule-automation-trigger", requireAuth, attachPlan, enforceAutomationLimit, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const validation = validateRequest(scheduleAutomationTriggerSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const userId = getUserId(req);
    const {
      scheduledDate,
      provider,
      destinationId,
      automationId,
      audienceId,
      subscriberEmail,
      mergeFields,
      tags,
    } = validation.data;

    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        platform: 'email',
        provider,
        content: `Automation trigger for ${subscriberEmail}`,
        scheduled_date: scheduledDate,
        scheduled_at: scheduledDate,
        status: 'Scheduled',
        meta: {
          emailProvider: provider,
          destinationId,
          automationId,
          audienceId,
          subscriberEmail,
          mergeFields: mergeFields || {},
          tags,
        }
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ scheduled: true, post: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to schedule trigger' });
  }
});

// Trigger: Welcome (server-side or authenticated)
app.post("/api/email/trigger/welcome", optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const validation = validateRequest(scheduleAutomationTriggerSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const userId = getUserId(req);
    const { destinationId, automationId, audienceId, subscriberEmail, mergeFields, tags, provider } = validation.data;

    const scheduledDate = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        platform: 'email',
        provider,
        content: `Automation trigger for ${subscriberEmail}`,
        scheduled_date: scheduledDate,
        scheduled_at: scheduledDate,
        status: 'Scheduled',
        meta: {
          emailProvider: provider,
          destinationId,
          automationId,
          audienceId,
          subscriberEmail,
          mergeFields: mergeFields || {},
          tags,
        }
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ scheduled: true, post: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to trigger welcome' });
  }
});

// Schedule: Newsletter (authenticated)
app.post("/api/email/schedule/newsletter", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const validation = validateRequest(scheduleNewsletterSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: "errors" in validation ? validation.errors : undefined
      });
    }

    const userId = getUserId(req);
    const { scheduledDate, content, destinationId, automationId, transcriptId } = validation.data;

    const { data: connection } = await supabaseAdmin
      .from('connected_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .maybeSingle();

    if (!connection) {
      return res.status(400).json({ error: 'Mailchimp not connected' });
    }

    const { data: destination } = await supabaseAdmin
      .from('email_destinations')
      .select('id, audience_id')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .eq('id', destinationId)
      .maybeSingle();

    if (!destination?.audience_id) {
      return res.status(400).json({ error: 'Mailchimp destination not found' });
    }

    const { data: automation } = await supabaseAdmin
      .from('email_automations')
      .select('id, trigger_value')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .eq('id', automationId)
      .maybeSingle();

    if (!automation?.trigger_value) {
      return res.status(400).json({ error: 'Newsletter automation not found' });
    }

    const tagCheck = await ensureMailchimpTagExists(userId, destination.audience_id, automation.trigger_value);
    if (!tagCheck.ok) {
      if (tagCheck.code === 'missing_tag') {
        return res.status(400).json({ error: 'This tag does not exist in your Mailchimp audience.' });
      }
      if (tagCheck.code === 'revoked') {
        return res.status(400).json({ error: 'Mailchimp access was revoked. Reconnect to continue.' });
      }
      return res.status(400).json({ error: tagCheck.error || 'Mailchimp tag validation failed.' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      return res.status(400).json({ error: 'User email not available' });
    }

    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        transcript_id: transcriptId || null,
        platform: 'email',
        provider: 'mailchimp',
        content: content || 'Newsletter trigger',
        scheduled_date: scheduledDate,
        scheduled_at: scheduledDate,
        status: 'Scheduled',
        meta: {
          emailProvider: 'mailchimp',
          destinationId: destination.id,
          automationId: automation.id,
          audienceId: destination.audience_id,
          subscriberEmail: userData.user.email,
          mergeFields: {},
          tags: [automation.trigger_value],
          retryCount: 0,
          nextRetryAt: null,
        }
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ scheduled: true, post: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to schedule newsletter' });
  }
});

// Trigger: Episode published (authenticated or internal)
app.post("/api/email/trigger/episode-published", optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    const userId = req.user?.id || req.body?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const episodeTitle = req.body?.episodeTitle || 'Episode';

    const { data: destination } = await supabaseAdmin
      .from('email_destinations')
      .select('id, audience_id')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .limit(1)
      .maybeSingle();

    const { data: automation } = await supabaseAdmin
      .from('email_automations')
      .select('id, trigger_value')
      .eq('user_id', userId)
      .eq('provider', 'mailchimp')
      .eq('trigger_value', 'loquihq_episode_published')
      .limit(1)
      .maybeSingle();

    if (!destination?.audience_id || !automation?.trigger_value) {
      return res.json({ skipped: true, reason: 'Mailchimp destination or automation not configured' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      return res.json({ skipped: true, reason: 'User email not available' });
    }

    const scheduledDate = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        platform: 'email',
        provider: 'mailchimp',
        content: `New episode trigger: ${episodeTitle}`,
        scheduled_date: scheduledDate,
        scheduled_at: scheduledDate,
        status: 'Scheduled',
        meta: {
          provider: 'mailchimp',
          destinationId: destination.id,
          audienceId: destination.audience_id,
          subscriberEmail: userData.user.email,
          tags: ['loquihq_episode_published'],
          mergeFields: { EPISODE: episodeTitle },
          automationId: automation.id,
          lastError: null,
        }
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ scheduled: true, post: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to trigger episode published' });
  }
});

async function processScheduledPosts() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase not configured");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date().toISOString();
  const { data: duePosts, error: fetchError } = await supabaseAdmin
    .from("scheduled_posts")
    .select("*")
    .in("platform", ["linkedin", "twitter", "email"])
    .eq("status", "Scheduled")
    .lte("scheduled_at", now)
    .limit(25);

  if (fetchError) {
    console.error("Failed to fetch due posts:", fetchError);
    throw new Error(fetchError.message);
  }

  if (!duePosts?.length) {
    console.log("📅 No scheduled posts due for publishing");
    return { processed: 0, failed: 0, manual: 0, retried: 0 };
  }

  const eligiblePosts = duePosts.filter((post: any) => {
    const nextRetryAt = post?.meta?.nextRetryAt;
    if (!nextRetryAt) return true;
    return new Date(nextRetryAt).getTime() <= Date.now();
  });

  if (!eligiblePosts.length) {
    console.log("📅 No scheduled posts eligible for retry yet");
    return { processed: 0, failed: 0, manual: 0, retried: 0 };
  }

  console.log(`📅 Processing ${eligiblePosts.length} scheduled posts...`);
  let processed = 0;
  let failed = 0;
  let manual = 0;
  let retried = 0;
  for (const post of eligiblePosts) {
    try {
      if (post.platform === 'linkedin') {
        await publishToLinkedIn(post, supabaseAdmin);
      } else if (post.platform === 'twitter') {
        await publishToX(post, supabaseAdmin);
      } else if (post.platform === 'medium') {
        await publishToMedium(post, supabaseAdmin);
      } else if (post.platform === 'email') {
          if (post.provider === 'kit') {
            const result = await publishToKitBroadcast(post, supabaseAdmin);
            if (result === 'NeedsManualSend') {
              manual++;
            }
          } else if (post.provider === 'mailchimp') {
          const result = await dispatchMailchimpAutomation(post, supabaseAdmin);
          if (result === 'NeedsManualSend') {
            manual++;
          }
          if (result === 'RetryScheduled') {
            retried++;
          }
          } else {
            await publishToEmail(post, supabaseAdmin);
          }
        } else {
        throw new Error(`Unsupported platform: ${post.platform}`);
      }

      console.log(`✅ Published post ${post.id} to ${post.platform}`);
      processed++;
    } catch (postError: any) {
      console.error(`❌ Failed to publish post ${post.id}:`, postError.message);

      await supabaseAdmin
        .from("scheduled_posts")
        .update({
          status: "Failed",
          last_error: postError.message,
          metrics: { error: postError.message, failed_at: new Date().toISOString() },
        })
        .eq("id", post.id);

      failed++;
    }
  }

  console.log(`📅 Publisher completed: ${processed} published, ${failed} failed, ${manual} manual, ${retried} retried`);
  return { processed, failed, manual, retried };
}

async function processEmailScheduledPosts() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase not configured");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date().toISOString();
  const { data: duePosts, error: fetchError } = await supabaseAdmin
    .from("scheduled_posts")
    .select("*")
    .eq("platform", "email")
    .eq("status", "Scheduled")
    .lte("scheduled_date", now)
    .limit(50);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!duePosts?.length) {
    return { processed: 0, failed: 0, retried: 0 };
  }

  const eligiblePosts = duePosts.filter((post: any) => {
    const nextRetryAt = post?.meta?.nextRetryAt;
    if (!nextRetryAt) return true;
    return new Date(nextRetryAt).getTime() <= Date.now();
  });

  if (!eligiblePosts.length) {
    return { processed: 0, failed: 0, retried: 0 };
  }

  let processed = 0;
  let failed = 0;
  let retried = 0;
  for (const post of eligiblePosts) {
    try {
      if (post.provider === 'mailchimp') {
        const result = await dispatchMailchimpAutomation(post, supabaseAdmin);
        if (result === 'Failed') {
          failed++;
          continue;
        }
        if (result === 'RetryScheduled') {
          retried++;
          continue;
        }
      } else if (post.provider === 'sendgrid') {
        const result = await dispatchSendGridCampaign(post, supabaseAdmin);
        if (result === 'Failed') {
          failed++;
          continue;
        }
      } else if (post.provider === 'kit') {
        const result = await publishToKitBroadcast(post, supabaseAdmin);
        if (result === 'NeedsManualSend') {
          failed++;
          continue;
        }
      } else {
        await publishToEmail(post, supabaseAdmin);
      }

      processed++;
    } catch (err: any) {
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'Failed',
          meta: { ...(post.meta || {}), lastError: err?.message || 'Email dispatch failed' },
        })
        .eq('id', post.id);
      failed++;
    }
  }

  return { processed, failed, retried };
}

async function dispatchMailchimpAutomation(post: any, supabaseAdmin: any): Promise<'Published' | 'Failed' | 'RetryScheduled' | 'NeedsManualSend'> {
  const meta = post.meta || {};

  const result = await applyMailchimpTags({
    userId: post.user_id,
    audienceId: meta.audienceId,
    email: meta.subscriberEmail,
    tags: meta.tags,
    mergeFields: meta.mergeFields,
  });

  if (!result.ok) {
    if (result.code === 'transient') {
      const retryCount = Number(meta.retryCount || 0);
      const nextRetryAt = getNextRetryAt(retryCount);

      if (!nextRetryAt) {
        await supabaseAdmin
          .from('scheduled_posts')
          .update({
            status: 'Failed',
            provider_account_id: result.accountId,
            meta: { ...meta, lastError: `${result.error} (retries exhausted)` },
          })
          .eq('id', post.id);
        return 'Failed';
      }

      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'Scheduled',
          provider_account_id: result.accountId,
          meta: {
            ...meta,
            lastError: result.error,
            retryCount: retryCount + 1,
            nextRetryAt,
          },
        })
        .eq('id', post.id);

      return 'RetryScheduled';
    }

    await supabaseAdmin
      .from('scheduled_posts')
      .update({
        status: 'Failed',
        provider_account_id: result.accountId,
        meta: { ...meta, lastError: result.error },
      })
      .eq('id', post.id);
    return 'Failed';
  }

  await supabaseAdmin
    .from('scheduled_posts')
    .update({
      status: 'Published',
      published_at: new Date().toISOString(),
      provider_account_id: result.accountId,
    })
    .eq('id', post.id);

  return 'Published';
}

type MailchimpApplyInput = {
  userId: string;
  email?: string;
  audienceId?: string;
  tags?: string[];
  mergeFields?: Record<string, any>;
};

type MailchimpApplyResult =
  | { ok: true; accountId: string | null }
  | { ok: false; error: string; accountId: string | null; code?: 'revoked' | 'transient' | 'unknown' };

async function applyMailchimpTags(input: MailchimpApplyInput): Promise<MailchimpApplyResult> {
  const { userId, email, audienceId, tags, mergeFields } = input;

  if (!audienceId || !email || !Array.isArray(tags) || tags.length === 0) {
    return { ok: false, error: 'Missing audienceId, subscriberEmail, or tags', accountId: null, code: 'unknown' };
  }

  const connection = await getMailchimpConnection(userId);
  if (!connection) {
    return { ok: false, error: 'Mailchimp not connected for this user', accountId: null, code: 'revoked' };
  }

  const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

  const memberResp = await fetch(`${connection.apiEndpoint}/lists/${audienceId}/members/${subscriberHash}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${connection.accessToken}`,
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
      merge_fields: mergeFields || {},
    }),
  });

  if (!memberResp.ok) {
    const json = await memberResp.json().catch(() => ({}));
    if (isMailchimpAuthError(memberResp.status)) {
      await markMailchimpConnectionRevoked(userId);
      return { ok: false, error: 'Mailchimp access was revoked. Reconnect to continue.', accountId: connection.accountId, code: 'revoked' };
    }
    if (isTransientStatus(memberResp.status)) {
      return { ok: false, error: `Mailchimp upsert failed: ${memberResp.status} - ${JSON.stringify(json)}`, accountId: connection.accountId, code: 'transient' };
    }
    return { ok: false, error: `Mailchimp upsert failed: ${memberResp.status} - ${JSON.stringify(json)}`, accountId: connection.accountId, code: 'unknown' };
  }

  const tagResp = await fetch(`${connection.apiEndpoint}/lists/${audienceId}/members/${subscriberHash}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${connection.accessToken}`,
    },
    body: JSON.stringify({
      tags: tags.map((name: string) => ({ name, status: 'active' }))
    }),
  });

  if (!tagResp.ok) {
    const json = await tagResp.json().catch(() => ({}));
    if (isMailchimpAuthError(tagResp.status)) {
      await markMailchimpConnectionRevoked(userId);
      return { ok: false, error: 'Mailchimp access was revoked. Reconnect to continue.', accountId: connection.accountId, code: 'revoked' };
    }
    if (isTransientStatus(tagResp.status)) {
      return { ok: false, error: `Mailchimp tag apply failed: ${tagResp.status} - ${JSON.stringify(json)}`, accountId: connection.accountId, code: 'transient' };
    }
    return { ok: false, error: `Mailchimp tag apply failed: ${tagResp.status} - ${JSON.stringify(json)}`, accountId: connection.accountId, code: 'unknown' };
  }

  return { ok: true, accountId: connection.accountId };
}

async function ensureMailchimpTagExists(userId: string, audienceId: string, tagName: string): Promise<{ ok: true } | { ok: false; error: string; code: 'missing_tag' | 'revoked' | 'unknown' }> {
  const connection = await getMailchimpConnection(userId);
  if (!connection) {
    return { ok: false, error: 'Mailchimp not connected', code: 'revoked' };
  }

  const response = await fetch(`${connection.apiEndpoint}/lists/${audienceId}/segments?count=100`, {
    headers: { 'Authorization': `Bearer ${connection.accessToken}` },
  });

  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (isMailchimpAuthError(response.status)) {
      await markMailchimpConnectionRevoked(userId);
      return { ok: false, error: 'Mailchimp access was revoked. Reconnect to continue.', code: 'revoked' };
    }
    return { ok: false, error: `Mailchimp tags fetch failed: ${response.status} - ${JSON.stringify(json)}`, code: 'unknown' };
  }

  const segments = Array.isArray(json.segments) ? json.segments : [];
  const exists = segments.some((segment: any) => String(segment?.name || '').toLowerCase() === tagName.toLowerCase());
  if (!exists) {
    return { ok: false, error: 'This tag does not exist in your Mailchimp audience.', code: 'missing_tag' };
  }

  return { ok: true };
}

function isMailchimpAuthError(status: number) {
  return status === 401 || status === 403;
}

function isTransientStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function getNextRetryAt(retryCount: number): string | null {
  const retryDelaysMinutes = [5, 15, 60, 360, 1440];
  const delay = retryDelaysMinutes[retryCount];
  if (!delay) return null;
  return new Date(Date.now() + delay * 60 * 1000).toISOString();
}

async function markMailchimpConnectionRevoked(userId: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('connected_accounts')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'mailchimp');
}

// Helper function to publish to LinkedIn
async function publishToLinkedIn(post: any, supabaseAdmin: any) {
  // Get LinkedIn connection for this user
  const { data: connection, error: connError } = await supabaseAdmin
    .from("connected_accounts")
    .select("access_token, expires_at, provider_user_id")
    .eq("user_id", post.user_id)
    .eq("provider", "linkedin")
    .maybeSingle();

  if (connError || !connection) {
    throw new Error("LinkedIn not connected for this user");
  }

  // Check token expiry
  if (connection.expires_at && new Date(connection.expires_at).getTime() < Date.now()) {
    throw new Error("LinkedIn token expired - user must reconnect");
  }

  // Build LinkedIn post body
  const personUrn = `urn:li:person:${connection.provider_user_id}`;
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
      published_at: new Date().toISOString(),
      external_id: postId || null,
      last_error: null,
      metrics: {
        ...(post.metrics || {}),
        linkedin_post_id: postId,
        posted_at: new Date().toISOString(),
      },
    })
    .eq("id", post.id);
}

// Helper function to publish to X
async function publishToX(post: any, supabaseAdmin: any) {
  const { getTwitterConnection, getValidTwitterToken, postTweet } = await import('./oauth/twitter.js');

  // Get X connection for this user
  const connection = await getTwitterConnection(post.user_id);

  if (!connection) {
    throw new Error("X not connected for this user");
  }

  const clientId = process.env.X_CLIENT_ID || '';
  const clientSecret = process.env.X_CLIENT_SECRET || '';
  const apiPublicUrl = process.env.API_PUBLIC_URL || '';
  const redirectUri = `${apiPublicUrl}/api/integrations/x/callback`;
  const config = { clientId, clientSecret, redirectUri };

  // Get valid token (refresh if needed)
  const accessToken = await getValidTwitterToken(config, connection);

  // Post to X
  const result = await postTweet(accessToken, post.content.trim(), {});

  // Update post status to Published
  await supabaseAdmin
    .from("scheduled_posts")
    .update({
      status: "Published",
      metrics: {
        tweet_id: result.tweetId,
        tweet_url: result.tweetUrl,
        posted_at: new Date().toISOString()
      },
    })
    .eq("id", post.id);
}

// Helper function to publish to Medium
async function publishToMedium(post: any, supabaseAdmin: any) {
  const { getMediumConnection, createMediumPost } = await import('./oauth/medium.js');

  // Get Medium connection for this user
  const connection = await getMediumConnection(post.user_id);

  if (!connection) {
    throw new Error("Medium not connected for this user");
  }

  // Post to Medium
  const result = await createMediumPost(connection.accessToken, connection.accountId, {
    title: post.title || post.content.substring(0, 100),
    content: post.content,
    contentFormat: 'markdown',
    publishStatus: 'public',
  });

  // Update post status to Published
  await supabaseAdmin
    .from("scheduled_posts")
    .update({
      status: "Published",
      metrics: {
        medium_post_id: result.id,
        medium_url: result.url,
        posted_at: new Date().toISOString()
      },
    })
    .eq("id", post.id);
}

// Helper function to dispatch SendGrid Single Send campaign
async function dispatchSendGridCampaign(post: any, supabaseAdmin: any): Promise<'Published' | 'Failed'> {
  const meta = post.meta || {};

  // Get SendGrid connection for this user
  const { data: connection, error: connError } = await supabaseAdmin
    .from("connected_accounts")
    .select("access_token, metadata")
    .eq("user_id", post.user_id)
    .eq("provider", "sendgrid")
    .maybeSingle();

  if (connError || !connection?.access_token) {
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "Failed",
        meta: { ...meta, lastError: "SendGrid not connected for this user" },
      })
      .eq("id", post.id);
    return "Failed";
  }

  const listId = meta.listId;
  const templateId = meta.templateId;
  const subject = meta.subject || "Newsletter";

  if (!listId || !templateId) {
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "Failed",
        meta: { ...meta, lastError: "Missing listId or templateId in scheduled post meta" },
      })
      .eq("id", post.id);
    return "Failed";
  }

  // Use the default sender from the connection metadata if available
  const defaultSender = connection.metadata?.defaultSender;

  try {
    const result = await createAndScheduleSendGridSingleSend(connection.access_token, {
      name: `LoquiHQ: ${subject} (${new Date().toISOString().slice(0, 10)})`,
      subject,
      listIds: [listId],
      templateId,
      senderEmail: defaultSender?.email,
      senderName: defaultSender?.name,
    });

    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "Published",
        published_at: new Date().toISOString(),
        external_id: result.id,
        meta: { ...meta, singleSendId: result.id },
      })
      .eq("id", post.id);

    console.log(`📧 SendGrid Single Send dispatched: ${result.id} for post ${post.id}`);
    return "Published";
  } catch (err: any) {
    console.error(`❌ SendGrid dispatch failed for post ${post.id}:`, err.message);
    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "Failed",
        meta: { ...meta, lastError: err.message || "SendGrid dispatch failed" },
      })
      .eq("id", post.id);
    return "Failed";
  }
}

// Helper function to publish email via Gmail
async function publishToEmail(post: any, supabaseAdmin: any) {
  const { getGmailConnection, getValidGmailToken, sendGmailEmail } = await import('./oauth/gmail.js');

  // Get recipients from meta or metrics (meta is the correct column, metrics is legacy fallback)
  // Support both array (recipientEmails) and single email (recipientEmail) for backwards compatibility
  const recipientEmails: string[] = post.meta?.recipientEmails || post.metrics?.recipientEmails || [];
  const singleRecipient = post.meta?.recipientEmail || post.metrics?.recipientEmail;

  // Build final recipient list
  const recipients = recipientEmails.length > 0 ? recipientEmails : (singleRecipient ? [singleRecipient] : []);

  if (recipients.length === 0) {
    throw new Error("No recipient email specified for scheduled email");
  }

  // Get Gmail connection for this user
  const connection = await getGmailConnection(post.user_id);
  if (!connection) {
    throw new Error("Gmail not connected for this user");
  }

  // Get config for token refresh
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const apiPublicUrl = process.env.API_PUBLIC_URL || '';
  const redirectUri = `${apiPublicUrl}/api/integrations/gmail/callback`;
  const config = { clientId, clientSecret, redirectUri };

  // Get valid token (refresh if needed)
  const accessToken = await getValidGmailToken(config, post.user_id);

  // Parse subject and body from content (format: "Subject: {subject}\n\n{body}")
  const content = post.content || '';
  const subjectMatch = content.match(/^Subject:\s*(.+?)(?:\n|$)/);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'Scheduled Email';
  const body = content.replace(/^Subject:\s*.+?\n\n?/, '').trim();

  // Send email to all recipients
  const results: { email: string; messageId?: string; error?: string }[] = [];

  for (const recipientEmail of recipients) {
    try {
      const result = await sendGmailEmail(accessToken, recipientEmail, subject, body);
      results.push({
        email: recipientEmail,
        messageId: result.messageId,
      });
      console.log(`📧 Email sent to ${recipientEmail} (messageId: ${result.messageId})`);
    } catch (err: any) {
      console.error(`📧 Failed to send email to ${recipientEmail}:`, err.message);
      results.push({
        email: recipientEmail,
        error: err.message,
      });
    }
  }

  // Count successes and failures
  const successCount = results.filter(r => r.messageId).length;
  const failureCount = results.filter(r => r.error).length;

  // Update post status to Published (or Failed if all failed)
  const finalStatus = successCount > 0 ? "Published" : "Failed";

  await supabaseAdmin
    .from("scheduled_posts")
    .update({
      status: finalStatus,
      metrics: {
        ...post.metrics,
        results,
        sent_count: successCount,
        failed_count: failureCount,
        sent_to: recipients,
        posted_at: new Date().toISOString()
      },
    })
    .eq("id", post.id);

  if (failureCount > 0 && successCount > 0) {
    console.log(`📧 Email partially sent: ${successCount} succeeded, ${failureCount} failed`);
  } else if (failureCount > 0) {
    throw new Error(`Failed to send email to all ${failureCount} recipients`);
  }
}

// Helper function to publish email via Kit (broadcast)
async function publishToKitBroadcast(post: any, supabaseAdmin: any): Promise<'Published' | 'NeedsManualSend'> {
  let providerAccountId: string | null = null;
  try {
    const kitClientId = process.env.KIT_CLIENT_ID || '';
    const kitClientSecret = process.env.KIT_CLIENT_SECRET || '';
    const kitRedirectUri = process.env.KIT_REDIRECT_URI || '';
    const kitApiBase = 'https://api.kit.com/v4';
    const kitTokenUrl = 'https://api.kit.com/v4/oauth/token';

    if (!kitClientId || !kitClientSecret || !kitRedirectUri) {
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'NeedsManualSend',
          last_error: 'Kit OAuth not configured',
        })
        .eq('id', post.id);
      return 'NeedsManualSend';
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from('connected_accounts')
      .select('access_token, refresh_token, expires_at, profile, provider_user_id')
      .eq('user_id', post.user_id)
      .eq('provider', 'kit')
      .maybeSingle();

    if (connError || !connection?.access_token) {
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'NeedsManualSend',
          last_error: 'Kit not connected for this user',
        })
        .eq('id', post.id);
      return 'NeedsManualSend';
    }

    let accessToken = connection.access_token;
    let refreshToken = connection.refresh_token;
    const isExpired = connection.expires_at && new Date(connection.expires_at).getTime() < Date.now() + 60 * 1000;

    if (isExpired && refreshToken) {
      const refreshResp = await fetch(kitTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: kitClientId,
          client_secret: kitClientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          redirect_uri: kitRedirectUri,
        }),
      });

      const refreshJson: any = await refreshResp.json().catch(() => ({}));
      if (refreshResp.ok && refreshJson.access_token) {
        accessToken = refreshJson.access_token;
        refreshToken = refreshJson.refresh_token || refreshToken;
        const expiresIn = Number(refreshJson.expires_in || 0);
        const newExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

        await supabaseAdmin
          .from('connected_accounts')
          .update({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', post.user_id)
          .eq('provider', 'kit');
      }
    }

    // Parse subject and body from content (format: "Subject: {subject}\n\n{body}")
    const content = post.content || '';
    const subjectMatch = content.match(/^Subject:\s*(.+?)(?:\n|$)/);
    const subject = post.title || (subjectMatch ? subjectMatch[1].trim() : 'Scheduled Email');
    const body = post.content_html || content.replace(/^Subject:\s*.+?\n\n?/, '').trim();
    providerAccountId = connection?.profile?.account?.id?.toString?.() || connection?.provider_user_id || null;

    // Create broadcast (draft) then schedule/send
    const broadcastResp = await fetch(`${kitApiBase}/broadcasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subject,
        content: body,
      }),
    });

    const broadcastJson: any = await broadcastResp.json().catch(() => ({}));
    if (!broadcastResp.ok) {
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'NeedsManualSend',
          last_error: `Kit broadcast create failed: ${broadcastResp.status} - ${JSON.stringify(broadcastJson)}`,
          manual_action_url: 'https://app.kit.com/broadcasts',
          provider_account_id: providerAccountId,
        })
        .eq('id', post.id);
      return 'NeedsManualSend';
    }

    const broadcastId = broadcastJson?.broadcast?.id || broadcastJson?.id;

    // Attempt schedule/send (best-effort)
    const scheduleResp = await fetch(`${kitApiBase}/broadcasts/${broadcastId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        scheduled_at: post.scheduled_at || post.scheduled_date || new Date().toISOString(),
      }),
    });

    if (!scheduleResp.ok) {
      const scheduleJson: any = await scheduleResp.json().catch(() => ({}));
      await supabaseAdmin
        .from('scheduled_posts')
        .update({
          status: 'NeedsManualSend',
          external_id: broadcastId ? String(broadcastId) : null,
          last_error: `Kit schedule/send failed: ${scheduleResp.status} - ${JSON.stringify(scheduleJson)}`,
          manual_action_url: 'https://app.kit.com/broadcasts',
          provider_account_id: providerAccountId,
        })
        .eq('id', post.id);
      return 'NeedsManualSend';
    }

    await supabaseAdmin
      .from('scheduled_posts')
      .update({
        status: 'Published',
        published_at: new Date().toISOString(),
        external_id: broadcastId ? String(broadcastId) : null,
        last_error: null,
        provider_account_id: providerAccountId,
      })
      .eq('id', post.id);

    return 'Published';
  } catch (err: any) {
    await supabaseAdmin
      .from('scheduled_posts')
      .update({
        status: 'NeedsManualSend',
        last_error: err?.message || 'Kit send failed',
        manual_action_url: 'https://app.kit.com/broadcasts',
        provider_account_id: providerAccountId,
      })
      .eq('id', post.id);
    return 'NeedsManualSend';
  }
}

async function getMailchimpConnection(userId: string): Promise<{
  accessToken: string;
  apiEndpoint: string;
  accountId: string | null;
} | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('access_token, profile, provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'mailchimp')
    .maybeSingle();

  if (error || !data?.access_token) return null;

  const apiEndpoint = data.profile?.apiEndpoint as string | undefined;
  if (!apiEndpoint) return null;

  return {
    accessToken: data.access_token,
    apiEndpoint,
    accountId: data.provider_user_id || null,
  };
}


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

app.post("/api/schedule", requireAuth, attachPlan, enforceScheduleLimit, async (req: AuthRequest, res) => {
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

    const { platform, content, scheduledDate, transcriptId } = validation.data;

    const newPost: ScheduledPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId, // Associate with authenticated user
      platform,
      content,
      scheduledDate,
      status: 'scheduled',
      transcriptId,
      createdAt: new Date().toISOString(),
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
      redirectTo: `${process.env.FRONTEND_PUBLIC_URL!}/set-password`,
    });

    if (error) {
      console.log("❌ INVITE ERROR:", error);
      return res.status(400).json({ error: error.message, code: error.name });
    }

    console.log("✅ INVITED:", data?.user?.id, data?.user?.email);

    // Set plan to beta with 30-day trial + 5-day grace
    if (data.user?.id) {
      const now = new Date();
      const betaExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceExpires = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        plan: 'beta',
        beta_started_at: now.toISOString(),
        beta_expires_at: betaExpires.toISOString(),
        grace_expires_at: graceExpires.toISOString(),
        cycle_anchor_at: now.toISOString(),
      }, { onConflict: 'id' });
    }

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

// GET /api/me - Returns authenticated user's plan info
app.get("/api/me", requireAuth, attachPlan, async (req: AuthRequest, res) => {
  const userId = getUserId(req);
  const plan = req.user?.plan ?? 'free';
  const betaExpiresAt = req.user?.betaExpiresAt ?? null;
  const graceExpiresAt = req.user?.graceExpiresAt ?? null;

  let daysRemaining: number | null = null;
  if (plan === 'beta' && betaExpiresAt) {
    const ms = new Date(betaExpiresAt).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  let graceDaysRemaining: number | null = null;
  if (plan === 'beta_grace' && graceExpiresAt) {
    const ms = new Date(graceExpiresAt).getTime() - Date.now();
    graceDaysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  res.json({
    id: userId,
    email: req.user?.email ?? null,
    plan,
    betaExpiresAt,
    graceExpiresAt,
    daysRemaining,
    graceDaysRemaining,
  });
});

// GET /api/me/usage - Returns current cycle usage and limits
app.get("/api/me/usage", requireAuth, attachPlan, async (req: AuthRequest, res) => {
  const userId = getUserId(req);
  const plan = req.user?.plan ?? 'free';
  const planLimits = getLimits(plan);

  const usage = await getUserUsage(userId);

  // Build limits object — null values mean unlimited
  const limits = {
    analysesPerCycle: planLimits.analysesPerCycle,
    scheduledPostsPerCycle: planLimits.scheduledPostsPerCycle,
    activeAutomations: planLimits.activeAutomations,
  };

  const isUnlimited = planLimits.analysesPerCycle === null && planLimits.scheduledPostsPerCycle === null && planLimits.activeAutomations === null;

  const nearLimit = {
    analyses: planLimits.analysesPerCycle !== null && usage.analyses >= Math.floor(planLimits.analysesPerCycle * 0.8),
    scheduledPosts: planLimits.scheduledPostsPerCycle !== null && usage.scheduledPosts >= Math.floor(planLimits.scheduledPostsPerCycle * 0.8),
    automations: planLimits.activeAutomations !== null && usage.activeAutomations >= planLimits.activeAutomations,
  };

  res.json({
    plan,
    usage: {
      analyses: usage.analyses,
      scheduledPosts: usage.scheduledPosts,
      activeAutomations: usage.activeAutomations,
    },
    limits,
    nearLimit,
    isUnlimited,
    cycleStart: usage.cycleStart,
    cycleEnd: usage.cycleEnd,
  });
});

// POST /api/billing/checkout - Creates a Stripe Checkout session for subscription
app.post("/api/billing/checkout", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }

    const userId = getUserId(req);
    const { plan, interval } = req.body as {
      plan: "starter" | "pro" | "growth";
      interval: "monthly" | "yearly";
    };

    if (!plan || !interval) {
      res.status(400).json({ error: "Missing plan or interval" });
      return;
    }

    const frontendUrl = process.env.FRONTEND_PUBLIC_URL;
    if (!frontendUrl) {
      res.status(500).json({ error: "FRONTEND_PUBLIC_URL not configured" });
      return;
    }

    const priceId = getPriceId(plan, interval);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard?billing=success`,
      cancel_url: `${frontendUrl}/dashboard?billing=cancel`,
      client_reference_id: userId,
      metadata: { user_id: userId, plan, interval },
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: userId, plan, interval },
      },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session error:", err?.message || err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /api/billing/portal - Creates a Stripe Customer Portal session
app.post("/api/billing/portal", requireAuth, async (req: AuthRequest, res) => {
  if (!stripe || !supabaseAdmin) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const userId = getUserId(req);

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL
      || process.env.APP_BASE_URL
      || 'https://app.loquihq.com/pricing';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe portal session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/downgrade-expired-betas - Cron job to flip beta → free after grace expires
app.post("/api/cron/downgrade-expired-betas", async (req, res) => {
  const secret = req.header("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET || process.env.PUBLISHER_CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ plan: 'free' })
      .eq('plan', 'beta')
      .not('grace_expires_at', 'is', null)
      .lt('grace_expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Cron downgrade error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    console.log(`Cron: downgraded ${data?.length ?? 0} expired beta users to free`);
    res.json({ downgraded: data?.length ?? 0 });
  } catch (err: any) {
    console.error('Cron downgrade error:', err);
    res.status(500).json({ error: err.message });
  }
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

// DELETE /api/podcast/disconnect - Disconnect podcast and remove all related data
app.delete("/api/podcast/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);

    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Database not configured" });
    }

    // Get the podcast first to confirm it exists
    const { data: podcast, error: findError } = await supabaseAdmin
      .from("podcasts")
      .select("id, title")
      .eq("user_id", userId)
      .single();

    if (findError || !podcast) {
      return res.status(404).json({ error: "No podcast connected" });
    }

    // Delete podcast episodes first (foreign key constraint)
    await supabaseAdmin
      .from("podcast_episodes")
      .delete()
      .eq("podcast_id", podcast.id);

    // Delete podcast metrics
    await supabaseAdmin
      .from("podcast_metrics")
      .delete()
      .eq("podcast_id", podcast.id);

    // Delete podcast projections
    await supabaseAdmin
      .from("podcast_projections")
      .delete()
      .eq("podcast_id", podcast.id);

    // Delete the podcast itself
    const { error: deleteError } = await supabaseAdmin
      .from("podcasts")
      .delete()
      .eq("id", podcast.id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Failed to delete podcast:", deleteError);
      return res.status(500).json({ error: "Failed to disconnect podcast" });
    }

    console.log(`Podcast disconnected: ${podcast.title} (user: ${userId})`);

    res.json({
      success: true,
      message: "Podcast disconnected successfully",
      podcastTitle: podcast.title,
    });
  } catch (err) {
    console.error("Podcast disconnect error:", err);
    res.status(500).json({ error: "Failed to disconnect podcast" });
  }
});

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

// ============================================================================
// AUTO-PUBLISH SCHEDULED POSTS (runs periodically in background)
// ============================================================================
let isPublishingInProgress = false;

async function publishScheduledPosts() {
  // Prevent concurrent publishing attempts
  if (isPublishingInProgress) return;
  
  if (!supabaseAdmin) {
    console.log("⏭️  Skipping auto-publish: Supabase not configured");
    return;
  }

  isPublishingInProgress = true;
  try {
    const now = new Date().toISOString();
    const { data: duePosts, error: fetchError } = await supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("platform", "linkedin")
      .eq("status", "Scheduled")
      .lte("scheduled_date", now)
      .limit(25);

    if (fetchError) {
      console.error("❌ Failed to fetch due posts:", fetchError);
      return;
    }

    if (!duePosts?.length) {
      return; // Silent return if no posts
    }

    console.log(`📤 Auto-publishing ${duePosts.length} scheduled LinkedIn posts...`);
    let processed = 0;
    let failed = 0;

    for (const post of duePosts) {
      try {
        // Get LinkedIn connection for this user
        const { data: connection, error: connError } = await supabaseAdmin
          .from("connected_accounts")
          .select("access_token, expires_at, provider_user_id")
          .eq("user_id", post.user_id)
          .eq("provider", "linkedin")
          .maybeSingle();

        if (connError || !connection) {
          throw new Error("LinkedIn not connected for this user");
        }

        // Check token expiry
        if (connection.expires_at && new Date(connection.expires_at).getTime() < Date.now()) {
          throw new Error("LinkedIn token expired - user must reconnect");
        }

        // Build LinkedIn post body
        const personUrn = `urn:li:person:${connection.provider_user_id}`;
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
            published_at: new Date().toISOString(),
            external_id: postId || null,
            last_error: null,
            metrics: {
              ...(post.metrics || {}),
              linkedin_post_id: postId,
              posted_at: new Date().toISOString(),
            },
          })
          .eq("id", post.id);

        console.log(`✅ Auto-published post ${post.id} to LinkedIn`);
        processed++;
      } catch (postError: any) {
        console.error(`❌ Failed to auto-publish post ${post.id}:`, postError.message);

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

    console.log(`✅ Auto-publishing completed: ${processed} published, ${failed} failed`);
  } catch (err: any) {
    console.error("❌ Auto-publisher error:", err.message);
  } finally {
    isPublishingInProgress = false;
  }
}

// Start periodic auto-publishing (check every 5 minutes for due posts)
let publishInterval: NodeJS.Timeout;

function startAutoPublisher() {
  // Run immediately on startup
  console.log("🚀 Starting auto-publisher for scheduled posts...");
  publishScheduledPosts().catch(err => console.error("Initial auto-publish failed:", err));
  
  // Then run every 5 minutes (300000 ms)
  publishInterval = setInterval(() => {
    publishScheduledPosts().catch(err => console.error("Periodic auto-publish failed:", err));
  }, 5 * 60 * 1000);

  console.log("📅 Auto-publisher will check for due posts every 5 minutes");
}

const server = app.listen(backendEnv.port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${backendEnv.port}`);
  console.log(`   Environment: ${backendEnv.nodeEnv}`);
  console.log(`   CORS Origins: ${backendEnv.cors.allowedOrigins.join(', ')}`);
  
  // Start auto-publisher for scheduled posts
  startAutoPublisher();
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${backendEnv.port} is already in use. Please kill the existing process or change the PORT in .env`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (publishInterval) clearInterval(publishInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
