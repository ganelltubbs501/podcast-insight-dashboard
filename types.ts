
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  status: 'Active' | 'Revoked';
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggered?: string;
  status: 'Healthy' | 'Failing' | 'Untested';
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'Free' | 'Pro' | 'Business';
  role?: 'Owner' | 'Editor' | 'Viewer';
  avatar?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Contributor' | 'Viewer';
  status: 'Active' | 'Pending';
  lastActive: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export type WorkflowStatus = 'Draft' | 'In Review' | 'Approved' | 'Published';

// Content Calendar Types
export type Platform =
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'medium'
  | 'teaser'
  | 'email'
  | 'kit'
  | 'mailchimp'
  | 'sendgrid'
  | 'beehiiv'
  | 'gohighlevel';

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  impressions: number;
  opens?: number;
  openRate?: number;
  clickRate?: number;
  deliveries?: number;
  unsubscribes?: number;
  bounces?: number;
}

export interface ScheduledPost {
  id: string;
  transcriptId?: string;
  transcriptTitle?: string;
  platform: Platform;
  provider?: string;
  title?: string | null;
  content: string;
  contentHtml?: string | null;
  providerAccountId?: string | null;
  meta?: Record<string, any> | null;
  scheduledDate: string; // ISO String
  scheduledAt?: string;
  publishedAt?: string | null;
  externalId?: string | null;
  lastError?: string | null;
  manualActionUrl?: string | null;
  status: 'Scheduled' | 'Published' | 'Failed' | 'NeedsManualSend';
  metrics?: PostMetrics;
}

// Guest Outreach Types
export interface Guest {
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  status: 'Suggested' | 'Contacted' | 'Booked' | 'Rejected';
  email?: string;
  website?: string;
  notes?: string;
  sourceTranscriptId?: string;
  matchReason?: string;
}

// Repurposing Types
export interface EmailSeriesItem {
  day: number;
  subject: string;
  body: string;
  goal: string;
}

export interface SocialCalendarItem {
  day: number;
  platform: 'LinkedIn' | 'Twitter' | 'Instagram' | 'Facebook' | 'Instagram Stories';
  type: 'Quote' | 'Question' | 'Insight' | 'Clip' | 'Story';
  content: string;
}

export interface RepurposedContent {
  emailSeries?: EmailSeriesItem[];
  socialCalendar?: SocialCalendarItem[];
  linkedinArticle?: string;
  infographicScript?: string;
  imagePrompts?: { quote: string, prompt: string }[];
}

// Help & Support Types
export interface HelpArticle {
  id: string;
  title: string;
  category: 'Getting Started' | 'Features' | 'Account' | 'Best Practices';
  content: string;
}

export interface Tutorial {
  id: string;
  title: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl?: string; // Mock URL
}

export interface SpeakerHighlight {
  name: string;
  role: string;
  contribution: string;
  speakingTimePercent?: number;
  topics?: string[];
}

export interface Quote {
  text: string;
  timestamp: string;
  speaker?: string;
}

export interface BlogPost {
  title: string;
  intro: string;
  sections: {
    heading: string;
    content: string;
  }[];
  conclusion: string;
}

export interface SocialPlatformContent {
  linkedinPost: string;
  twitterThread: string[];
  tiktokScript: string;
  youtubeDescription: string;
  emailNewsletter: {
    subject: string;
    body: string;
  };
  mediumArticle: string;
  newsletterTeaser: {
    subject: string;
    body: string;
  };
  facebookPost: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface KeywordMetric {
  keyword: string;
  count: number;
  density: string;
}

export interface ReadabilityMetric {
  score: number; // Flesch-Kincaid
  level: string; // e.g. "8th Grade"
  suggestions: string[];
}

export interface SEOData {
  metaDescription: string;
  keywords: string[];
  titleVariations: string[];
  keywordAnalysis: KeywordMetric[];
  readability: ReadabilityMetric;
  internalLinks: string[];
}

export interface SentimentTimelineItem {
  timestamp: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  score: number;
}

export interface SentimentData {
  score: number; // 0-100
  label: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
  emotionalKeywords: string[];
  tone?: string;
  audiencePrediction?: string;
  timeline?: SentimentTimelineItem[];
}

// Monetization Types
export interface SponsorRecommendation {
  category: string;
  brands: string[];
  matchReason: string;
  estimatedCPM?: string;
  typicalDeal?: string;
  // Legacy support
  industry?: string;
}

export interface PlatformMonetization {
  priority: 'High' | 'Medium' | 'Low';
  cpmRange: string;
  notes: string;
}

export interface SponsorshipInsights {
  score: number; // 0-100
  reasoning: string;
  suggestedSponsors: SponsorRecommendation[];
  targetAudienceProfile: string;
  potentialAdSpots: string[];

  // New research-backed fields
  platformRecommendations?: {
    podcast: PlatformMonetization;
    youtube: PlatformMonetization;
    newsletter: PlatformMonetization;
  };
  actionableNextSteps?: string[];
  dataSources?: string[];

  // Metadata for transparency
  researchMetadata?: {
    researchPackVersion: string;
    totalSponsorBrands: number;
    marketDataSources: string[];
    liveDataUsed: boolean;
    categoriesMatched: number;
  };

  // Optional enrichment object with provenance and raw signals from external sources
  enrichment?: any;
  enrichmentAttempted?: boolean;
  enrichmentNote?: string;
}

export interface AnalysisSettings {
  accuracyLevel: 'Standard' | 'High' | 'Maximum';
  toneFilter: 'Auto' | 'Formal' | 'Conversational';
  language: string; 
  customKeywords: string[];
  sensitiveContentFilter: boolean;
  dialectContext?: string;
}

export interface AnalysisResult {
  keyTakeaways: string[];
  quotes: Quote[];
  // Backwards compatibility
  socialClips: string[];
  
  // New Fields
  socialContent?: SocialPlatformContent;
  blogPost: BlogPost;
  seo?: SEOData;
  speakers: SpeakerHighlight[];
  sentiment?: SentimentData;
  showNotes?: string;
  faq?: FAQItem[];
  sponsorship?: SponsorshipInsights;
  repurposed?: RepurposedContent;
}

export interface Transcript {
  id: string;
  title: string;
  date: string;
  content: string;
  status: 'Processing' | 'Completed' | 'Failed';
  result?: AnalysisResult;
  settings?: AnalysisSettings;

  // Team collaboration
  teamId?: string | null;

  // Collaboration
  workflowStatus?: WorkflowStatus;
  comments?: Comment[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface UsageMetrics {
  period: string; // "September 2025"
  transcriptsUsed: number;
  transcriptQuota: number;
  totalWordsProcessed: number;
  hoursSaved: number;
  contentGenerated: {
     type: string; // "Blog Post", "Social Clips", "Email"
     count: number;
  }[];
  dailyUsage: { date: string; count: number }[];
  topPerformingType: string;
  quotaResetDate: string;
}