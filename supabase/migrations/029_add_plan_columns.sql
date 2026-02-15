-- 029_add_plan_columns.sql
-- Adds plan management columns to profiles table.
-- Beta users get 30 days full access + 5-day grace period, then downgrade to free.
-- Usage limits use signup-anchored rolling monthly cycles (not calendar months).
-- cycle_anchor_at never changes on upgrade/downgrade.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'beta'
    CHECK (plan IN ('beta','free','starter','pro','growth')),
  ADD COLUMN IF NOT EXISTS beta_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_anchor_at timestamptz;

-- Backfill all existing users as 'beta' with 30-day trial + 5-day grace from their created_at
UPDATE public.profiles
  SET plan = 'beta',
      beta_started_at = created_at,
      beta_expires_at = created_at + interval '30 days',
      grace_expires_at = created_at + interval '35 days',
      cycle_anchor_at = created_at
  WHERE plan = 'free' OR plan IS NULL;

-- Backfill cycle_anchor_at for any users that already have a plan set
UPDATE public.profiles
  SET cycle_anchor_at = created_at
  WHERE cycle_anchor_at IS NULL;
