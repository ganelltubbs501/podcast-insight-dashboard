import { createClient } from '@supabase/supabase-js';
import type { MarketingProvider } from './types.js';

export type IntegrationEventInput = {
  userId: string;
  provider: MarketingProvider;
  eventType:
    | 'auth_start'
    | 'auth_success'
    | 'auth_failure'
    | 'token_refresh'
    | 'token_refresh_failure'
    | 'api_call'
    | 'api_error'
    | 'sync_start'
    | 'sync_success'
    | 'sync_failure'
    | 'contact_upsert'
    | 'subscribe'
    | 'unsubscribe'
    | 'tag'
    | 'send'
    | 'send_failure';
  status: 'success' | 'failure' | 'pending';
  payload?: Record<string, any>;
  error?: string | null;
};

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

export async function logIntegrationEvent(event: IntegrationEventInput): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();
    if (!supabase) return;

    await supabase
      .from('integration_events')
      .insert({
        user_id: event.userId,
        provider: event.provider,
        event_type: event.eventType,
        status: event.status,
        payload: event.payload || {},
        error: event.error || null,
      });
  } catch {
    // Avoid throwing on logging failures
  }
}
