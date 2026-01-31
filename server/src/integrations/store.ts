import { createClient } from '@supabase/supabase-js';
import type { MarketingProvider } from './types.js';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

export type ConnectedAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string[] | null;
  profile: any;
  status: 'connected' | 'error' | 'disconnected' | null;
  last_sync_at: string | null;
  metadata: any;
};

export async function getConnectedAccount(userId: string, provider: MarketingProvider): Promise<ConnectedAccountRow | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch connected account: ${error.message}`);
  }

  return data as ConnectedAccountRow;
}

export async function disconnectAccount(userId: string, provider: MarketingProvider): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    throw new Error(`Failed to disconnect account: ${error.message}`);
  }
}
