import type { AdapterContext, AdapterResult, IntegrationStatus, ProviderAdapter, ProviderCapabilities, MarketingProvider } from '../types.js';
import { getConnectedAccount, disconnectAccount } from '../store.js';

const defaultCapabilities: ProviderCapabilities = {
  auth: true,
  audiences: false,
  upsertContact: false,
  subscribe: false,
  tag: false,
  sendOrTrigger: false,
};

const notConfigured = (provider: MarketingProvider, action: string): AdapterResult<any> => ({
  supported: false,
  fallback: 'not_configured',
  message: `${provider} ${action} is not configured yet.`,
});

const notSupported = (provider: MarketingProvider, action: string): AdapterResult<any> => ({
  supported: false,
  fallback: 'manual',
  message: `${provider} does not support ${action} in this integration.`,
});

export class BasicMarketingAdapter implements ProviderAdapter {
  provider: MarketingProvider;
  capabilities: ProviderCapabilities;

  constructor(provider: MarketingProvider, capabilities?: Partial<ProviderCapabilities>) {
    this.provider = provider;
    this.capabilities = { ...defaultCapabilities, ...capabilities };
  }

  async getAuthUrl(_ctx: AdapterContext): Promise<AdapterResult<{ authUrl: string }>> {
    return notConfigured(this.provider, 'auth');
  }

  async handleCallback(_ctx: AdapterContext, _params: Record<string, string>): Promise<AdapterResult<{ connected: boolean }>> {
    return notConfigured(this.provider, 'callback');
  }

  async getStatus(ctx: AdapterContext): Promise<IntegrationStatus> {
    const account = await getConnectedAccount(ctx.userId, this.provider);

    if (!account) {
      return { connected: false, status: 'disconnected' };
    }

    const isExpired = account.expires_at ? new Date(account.expires_at) < new Date() : false;

    return {
      connected: account.status !== 'disconnected' && !isExpired,
      accountName: account.profile?.name || account.profile?.email || account.provider_user_id || undefined,
      accountId: account.provider_user_id || undefined,
      scopes: account.scopes || undefined,
      tokenExpired: isExpired,
      expiresAt: account.expires_at || undefined,
      status: (account.status as IntegrationStatus['status']) || 'connected',
    };
  }

  async disconnect(ctx: AdapterContext): Promise<AdapterResult<{ disconnected: boolean }>> {
    await disconnectAccount(ctx.userId, this.provider);
    return { supported: true, data: { disconnected: true } };
  }

  async listAudiences(_ctx: AdapterContext): Promise<AdapterResult<{ audiences: any[] }>> {
    return notSupported(this.provider, 'audiences');
  }

  async upsertContact(_ctx: AdapterContext, _email: string, _fields?: Record<string, any>): Promise<AdapterResult<{ contactId?: string }>> {
    return notSupported(this.provider, 'contact upsert');
  }

  async subscribe(_ctx: AdapterContext, _audienceId: string, _email: string): Promise<AdapterResult<{ subscribed: boolean }>> {
    return notSupported(this.provider, 'subscribe');
  }

  async tag(_ctx: AdapterContext, _email: string, _tag: string): Promise<AdapterResult<{ tagged: boolean }>> {
    return notSupported(this.provider, 'tagging');
  }

  async sendOrTrigger(_ctx: AdapterContext, _payload: Record<string, any>): Promise<AdapterResult<{ id?: string }>> {
    return notSupported(this.provider, 'send/trigger');
  }
}
