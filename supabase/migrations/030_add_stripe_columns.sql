-- 030_add_stripe_columns.sql
-- Adds Stripe customer and subscription tracking to profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
