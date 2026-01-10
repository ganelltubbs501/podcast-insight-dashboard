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

const allSupportedMimeTypes = [...supportedImageTypes, ...supportedAudioTypes] as const;

// Content input can be text or media (image/audio)
const contentInputSchema = z.union([
  // Text transcript
  z.string().min(10, 'Content must be at least 10 characters').max(50000, 'Content too large (max 50,000 characters)'),

  // Media file (base64 encoded)
  z.object({
    inlineData: z.object({
      mimeType: z.enum(allSupportedMimeTypes, {
        message: 'Unsupported file type. Supported: images (PNG, JPEG, WebP) and audio (MP3, WAV, M4A)'
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
  includeTimestamps: z.boolean().optional(),
  generateSEO: z.boolean().optional(),
}).strict().optional();

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
  platform: z.enum(['linkedin', 'twitter', 'tiktok', 'youtube', 'email', 'medium', 'newsletter']),
  scheduledDate: z.string().datetime({ message: 'Invalid date format. Use ISO 8601' }),
  transcriptId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

export type UpdateScheduledPost = z.infer<typeof updateScheduledPostSchema>;

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
