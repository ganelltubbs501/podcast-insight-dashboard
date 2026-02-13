import { z } from 'zod';

/**
 * Input validation schemas for API endpoints
 * Using Zod for runtime type checking and validation
 */

// Base64 regex pattern (allows standard base64 characters)
const base64Pattern = /^[A-Za-z0-9+/=]+$/;

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Supported MIME types for media uploads
const supportedImageTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

const supportedAudioTypes = [
  'audio/mp3',
  'audio/wav',
  'audio/mpeg',
  'audio/x-wav',
  'audio/x-m4a',
] as const;

const supportedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const allSupportedMimeTypes = [...supportedImageTypes, ...supportedAudioTypes, ...supportedDocumentTypes] as const;

// Content input can be text or media (image/audio)
const contentInputSchema = z.union([
  // Text transcript
  z.string().min(10, 'Content must be at least 10 characters').max(50000, 'Content too large (max 50,000 characters)'),

  // Media file (base64 encoded)
  z.object({
    inlineData: z.object({
      mimeType: z.enum(allSupportedMimeTypes, {
        message: 'Unsupported file type. Supported: images (PNG, JPEG, WebP), audio (MP3, WAV, M4A), and documents (PDF, DOC, DOCX)'
      }),
      // Validate base64 format and size (max ~25MB base64 = ~18.75MB file)
      data: z.string()
        .regex(base64Pattern, 'Invalid base64 encoding')
        .max(25 * 1024 * 1024, 'File too large (max 25MB)')
    })
  })
]);

// Analysis settings
const analysisSettingsSchema = z.object({
  accuracyLevel: z.enum(['Standard', 'High', 'Maximum']).optional(),
  outputFormat: z.enum(['JSON', 'Markdown']).optional(),
}).passthrough();

// POST /api/analyze - Analyze podcast transcript
export const analyzeRequestSchema = z.object({
  contentInput: contentInputSchema,
  settings: analysisSettingsSchema,
}).strict();

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Repurpose content types
const repurposeTypeSchema = z.enum([
  'email_series',
  'social_calendar',
  'linkedin_article',
  'facebook_post',
  'image_prompts',
  'newsletter_teaser',
  'twitter_thread',
  'tiktok_script',
  'youtube_description',
]);

// POST /api/repurpose - Repurpose content
export const repurposeRequestSchema = z.object({
  type: repurposeTypeSchema,
  context: z.string().min(10, 'Context must be at least 10 characters').max(10000, 'Context too large'),
}).strict();

export type RepurposeRequest = z.infer<typeof repurposeRequestSchema>;

// POST /api/chat - Chat with AI assistant
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long (max 2000 characters)'),
  context: z.object({
    page: z.string().optional(),
    transcriptId: z.string().uuid().optional(),
    userName: z.string().optional(),
  }).optional(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).max(20, 'Conversation history too long').optional(),
}).strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// POST /api/research/sponsors - Get sponsor recommendations
export const sponsorRequestSchema = z.object({
  transcript: z.string().min(10).max(10000),
  topics: z.array(z.string()).min(1).max(20).optional(),
  niche: z.string().max(100).optional(),
}).strict();

export type SponsorRequest = z.infer<typeof sponsorRequestSchema>;

// POST /api/research/metrics - Get podcast metrics
export const metricsRequestSchema = z.object({
  podcastName: z.string().min(1).max(200),
  keywords: z.array(z.string()).max(10).optional(),
}).strict();

export type MetricsRequest = z.infer<typeof metricsRequestSchema>;

// POST /api/scheduled-posts - Create scheduled post
export const createScheduledPostSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content too long'),
  platform: z.enum([
    'linkedin',
    'twitter',
    'tiktok',
    'youtube',
    'facebook',
    'medium',
    'teaser',
    'email',
    'kit',
    'mailchimp',
    'sendgrid',
    'beehiiv',
    'gohighlevel',
  ]),
  provider: z.string().optional(),
  scheduledDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601' }),
  transcriptId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type CreateScheduledPost = z.infer<typeof createScheduledPostSchema>;

// PATCH /api/scheduled-posts/:id - Update scheduled post
export const updateScheduledPostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  scheduledDate: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'published', 'failed', 'cancelled']).optional(),
  metrics: z.object({
    impressions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    likes: z.number().int().min(0).optional(),
    shares: z.number().int().min(0).optional(),
  }).optional(),
}).strict();

// POST /api/email/schedule-automation-trigger - Schedule automation trigger
export const scheduleAutomationTriggerSchema = z.object({
  scheduledDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601' }),
  provider: z.enum(['mailchimp', 'kit']),
  destinationId: z.string().uuid(),
  automationId: z.string().uuid().optional(),
  audienceId: z.string(),
  subscriberEmail: z.string().email(),
  mergeFields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).min(1),
}).strict();

export type ScheduleAutomationTrigger = z.infer<typeof scheduleAutomationTriggerSchema>;

// POST /api/email/schedule/newsletter - Schedule newsletter trigger
export const scheduleNewsletterSchema = z.object({
  scheduledDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601' }),
  content: z.string().optional(),
  destinationId: z.string().uuid(),
  automationId: z.string().uuid(),
  transcriptId: z.string().optional(),
}).strict();

export type ScheduleNewsletter = z.infer<typeof scheduleNewsletterSchema>;

export type UpdateScheduledPost = z.infer<typeof updateScheduledPostSchema>;

// ============================================================================
// PODCAST ANALYTICS SCHEMAS
// ============================================================================

// Supported podcast hosting providers
const podcastProviderSchema = z.enum([
  'unknown',
  'buzzsprout',
  'libsyn',
  'anchor',
  'podbean',
  'spreaker',
  'transistor',
  'captivate',
  'simplecast',
  'megaphone',
  'acast',
  'spotify',
  'apple',
]);

// POST /api/podcast/connect-rss - Connect podcast via RSS
export const connectRssSchema = z.object({
  rssUrl: z.string().url('Invalid RSS URL format'),
}).strict();

export type ConnectRssRequest = z.infer<typeof connectRssSchema>;

// Country metric for top countries
const countryMetricSchema = z.object({
  country: z.string().min(1).max(100),
  percentage: z.number().min(0).max(100),
});

// POST /api/podcast/analytics/manual - Submit manual metrics
// Both downloads_30d_total AND avg_downloads_per_episode_30d are REQUIRED per DB schema
export const manualMetricsSchema = z.object({
  downloads30dTotal: z.number().int().min(0, 'Total downloads must be a non-negative number'),
  avgDownloadsPerEpisode30d: z.number().int().min(0, 'Average downloads per episode is required'),
  followersTotal: z.number().int().min(0).optional(),
  topCountries: z.array(countryMetricSchema).max(10).optional(),
}).strict();

export type ManualMetricsInput = z.infer<typeof manualMetricsSchema>;

// POST /api/podcast/projections/recompute - Recompute with new assumptions
export const projectionsAssumptionsSchema = z.object({
  fillRate: z.number().min(0).max(1).default(0.35),
  adSlots: z.number().int().min(1).max(6).default(2),
  cpmLow: z.number().min(0).default(15),
  cpmMid: z.number().min(0).default(25),
  cpmHigh: z.number().min(0).default(40),
  episodesPerMonth: z.number().int().min(1).max(31).optional(),
}).strict();

export type ProjectionsAssumptions = z.infer<typeof projectionsAssumptionsSchema>;

// POST /api/podcast/analytics/connect-provider - Connect provider API
export const connectProviderSchema = z.object({
  provider: podcastProviderSchema,
  apiKey: z.string().optional(),
  showId: z.string().optional(),
}).strict();

export type ConnectProviderRequest = z.infer<typeof connectProviderSchema>;

// ============================================================================
// TEAM COLLABORATION SCHEMAS
// ============================================================================

// Team roles (matches database constraint)
export const teamRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type TeamRole = z.infer<typeof teamRoleSchema>;

// Invite roles (owner cannot be invited, only creator gets owner)
export const inviteRoleSchema = z.enum(['admin', 'editor', 'viewer']);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

// POST /api/team - Create a new team
export const createTeamSchema = z.object({
  name: z.string()
    .min(1, 'Team name is required')
    .max(100, 'Team name must be 100 characters or less')
    .trim(),
}).strict();

export type CreateTeam = z.infer<typeof createTeamSchema>;

// PATCH /api/team/:teamId - Update team
export const updateTeamSchema = z.object({
  name: z.string()
    .min(1, 'Team name is required')
    .max(100, 'Team name must be 100 characters or less')
    .trim()
    .optional(),
}).strict();

export type UpdateTeam = z.infer<typeof updateTeamSchema>;

// POST /api/team/:teamId/invites - Create invite
export const createInviteSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  role: inviteRoleSchema.default('viewer'),
}).strict();

export type CreateInvite = z.infer<typeof createInviteSchema>;

// PATCH /api/team/:teamId/members/:userId - Update member role
export const updateMemberRoleSchema = z.object({
  role: inviteRoleSchema, // Can't change to owner via API
}).strict();

export type UpdateMemberRole = z.infer<typeof updateMemberRoleSchema>;

// POST /api/team/invites/accept - Accept invite
export const acceptInviteSchema = z.object({
  token: z.string()
    .min(1, 'Invite token is required')
    .max(256, 'Invalid token format'),
}).strict();

export type AcceptInvite = z.infer<typeof acceptInviteSchema>;

/**
 * Validation helper - validates request body and returns typed result
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((err: z.ZodIssue) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}
