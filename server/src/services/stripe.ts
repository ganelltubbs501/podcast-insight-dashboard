import Stripe from 'stripe';
export type { Stripe };

const secretKey = process.env.STRIPE_SECRET_KEY;

// Stripe client — only initialized if key is configured
export const stripe = secretKey
  ? new Stripe(secretKey)
  : null;

// Price ID lookup: plan_interval → Stripe price ID
export const PRICE_MAP: Record<string, string> = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  growth_monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || '',
  growth_yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY || '',
};

// Reverse lookup: Stripe price ID → plan name ('starter' | 'pro' | 'growth')
export const PRICE_TO_PLAN: Record<string, string> = {};
for (const [key, priceId] of Object.entries(PRICE_MAP)) {
  if (priceId) {
    PRICE_TO_PLAN[priceId] = key.split('_')[0];
  }
}

// Set of all valid price IDs for validation
export const VALID_PRICE_IDS = new Set(Object.values(PRICE_MAP).filter(Boolean));

// Helper: resolve (plan, interval) → Stripe price ID
export function getPriceId(plan: string, interval: string): string {
  const key = `${plan}_${interval}`;
  const priceId = PRICE_MAP[key];
  if (!priceId) throw new Error(`Unknown plan/interval: ${key}`);
  return priceId;
}
