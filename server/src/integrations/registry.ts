import { BasicMarketingAdapter } from './adapters/basicMarketing.js';
import { marketingProviders, type MarketingProvider, type ProviderAdapter } from './types.js';

const adapters: Record<MarketingProvider, ProviderAdapter> = {
  kit: new BasicMarketingAdapter('kit', {
    audiences: true,
    upsertContact: true,
    subscribe: true,
    tag: true,
    sendOrTrigger: true,
  }),
  mailchimp: new BasicMarketingAdapter('mailchimp', {
    audiences: true,
    upsertContact: true,
    subscribe: true,
    tag: true,
    sendOrTrigger: true,
  }),
  sendgrid: new BasicMarketingAdapter('sendgrid', {
    audiences: true,
    upsertContact: true,
    subscribe: true,
    tag: false,
    sendOrTrigger: true,
  }),
  beehiiv: new BasicMarketingAdapter('beehiiv', {
    audiences: true,
    upsertContact: true,
    subscribe: true,
    tag: false,
    sendOrTrigger: true,
  }),
  gohighlevel: new BasicMarketingAdapter('gohighlevel', {
    audiences: true,
    upsertContact: true,
    subscribe: true,
    tag: true,
    sendOrTrigger: true,
  }),
};

export function isMarketingProvider(provider: string): provider is MarketingProvider {
  return (marketingProviders as readonly string[]).includes(provider);
}

export function getMarketingAdapter(provider: string): ProviderAdapter | null {
  if (!isMarketingProvider(provider)) return null;
  return adapters[provider];
}
