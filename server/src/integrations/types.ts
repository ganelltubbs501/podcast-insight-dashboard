import { SupabaseClient } from '@supabase/supabase-js';

export const marketingProviders = [
  'kit',
  'mailchimp',
  'sendgrid',
  'beehiiv',
  'gohighlevel',
] as const;

export type MarketingProvider = typeof marketingProviders[number];

export type EmailAutomationProvider = 'mailchimp' | 'kit' | 'beehiiv' | 'gohighlevel';

export type EmailAutomationConnector = {
  provider: EmailAutomationProvider;
  account_id: string;
  audience_id: string;
  trigger_tag: string;
  connected_at: string;
  token_expires_at: string | null;
};

export type IntegrationStatus = {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  scopes?: string[];
  tokenExpired?: boolean;
  expiresAt?: string;
  status?: 'connected' | 'error' | 'disconnected';
};

export type NormalizedAnalytics = {
  impressions?: number;
  clicks?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  opens?: number;
  openRate?: number;
  clickRate?: number;
  deliveries?: number;
  unsubscribes?: number;
  bounces?: number;
};

export type ProviderCapabilities = {
  auth: boolean;
  audiences: boolean;
  upsertContact: boolean;
  subscribe: boolean;
  tag: boolean;
  sendOrTrigger: boolean;
};

export type AdapterContext = {
  userId: string;
  provider: MarketingProvider;
  supabaseAdmin?: SupabaseClient | null;
  requestId?: string;
};

export type AdapterResult<T> =
  | { supported: true; data: T }
  | { supported: false; fallback: 'manual' | 'not_configured'; message: string };

export interface ProviderAdapter {
  provider: MarketingProvider;
  capabilities: ProviderCapabilities;

  getAuthUrl(ctx: AdapterContext): Promise<AdapterResult<{ authUrl: string }>>;
  handleCallback(ctx: AdapterContext, params: Record<string, string>): Promise<AdapterResult<{ connected: boolean }>>;
  getStatus(ctx: AdapterContext): Promise<IntegrationStatus>;
  disconnect(ctx: AdapterContext): Promise<AdapterResult<{ disconnected: boolean }>>;

  listAudiences(ctx: AdapterContext): Promise<AdapterResult<{ audiences: any[] }>>;
  upsertContact(ctx: AdapterContext, email: string, fields?: Record<string, any>): Promise<AdapterResult<{ contactId?: string }>>;
  subscribe(ctx: AdapterContext, audienceId: string, email: string): Promise<AdapterResult<{ subscribed: boolean }>>;
  tag(ctx: AdapterContext, email: string, tag: string): Promise<AdapterResult<{ tagged: boolean }>>;
  sendOrTrigger(ctx: AdapterContext, payload: Record<string, any>): Promise<AdapterResult<{ id?: string }>>;
}
