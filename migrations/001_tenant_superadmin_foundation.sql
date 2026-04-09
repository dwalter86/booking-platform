-- ============================================================
-- Migration: 001_tenant_superadmin_foundation
-- Description: Tenant profile expansion, super-admin user support,
--              and plan seed data for all tiers including trial
-- Date: 2026-04-09
-- Apply with: psql -h 127.0.0.1 -U booking_app -d booking_platform -f 001_tenant_superadmin_foundation.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TENANTS TABLE — add profile and configuration columns
-- ============================================================

-- Trading/display name (may differ from legal name)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS display_name text NULL;

-- Primary contact email for platform communications
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS contact_email text NULL;

-- Public-facing branding
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_url text NULL;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS brand_colour text NULL;

-- Public booking controls
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS public_booking_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS booking_confirmation_message text NULL;

-- Fix timezone default from UTC to Europe/London
ALTER TABLE public.tenants
  ALTER COLUMN timezone SET DEFAULT 'Europe/London';

-- Update any existing tenants still on UTC default
-- (safe to run — only updates rows where timezone was never explicitly set)
UPDATE public.tenants
  SET timezone = 'Europe/London'
  WHERE timezone = 'UTC';


-- ============================================================
-- 2. USERS TABLE — super-admin support
-- ============================================================

-- Add super-admin flag
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Make tenant_id nullable to support super-admin users
-- who sit outside the tenant hierarchy
ALTER TABLE public.users
  ALTER COLUMN tenant_id DROP NOT NULL;

-- Partial unique index: prevent duplicate emails among super-admin accounts
-- (tenant users are already covered by the existing (tenant_id, email) unique index)
CREATE UNIQUE INDEX IF NOT EXISTS users_super_admin_email_unique
  ON public.users (email)
  WHERE is_super_admin = true;

-- Super-admin users should not have a tenant_id
-- Enforce this as a check constraint
ALTER TABLE public.users
  ADD CONSTRAINT users_super_admin_no_tenant
  CHECK (
    (is_super_admin = true AND tenant_id IS NULL) OR
    (is_super_admin = false AND tenant_id IS NOT NULL)
  );


-- ============================================================
-- 3. PLAN SEED DATA
-- ============================================================
-- Plans are inserted with ON CONFLICT DO UPDATE so this migration
-- is safe to re-run. sort_order controls display ordering in the UI.
-- ============================================================

-- ------------------------------------------------------------
-- 3a. Plan records
-- ------------------------------------------------------------

INSERT INTO public.plans (id, code, name, description, is_active, sort_order)
VALUES
  (
    gen_random_uuid(),
    'trial',
    'Trial',
    'Full Pro-equivalent access for evaluation. Time-limited.',
    true,
    0
  ),
  (
    gen_random_uuid(),
    'basic',
    'Basic',
    'For small operators and single use-case setups.',
    true,
    1
  ),
  (
    gen_random_uuid(),
    'growth',
    'Growth',
    'For growing businesses with multiple resources.',
    true,
    2
  ),
  (
    gen_random_uuid(),
    'pro',
    'Pro',
    'For high-usage and operational businesses.',
    true,
    3
  ),
  (
    gen_random_uuid(),
    'enterprise',
    'Enterprise',
    'Custom limits and dedicated support for large-scale clients.',
    true,
    4
  )
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active   = EXCLUDED.is_active,
  sort_order  = EXCLUDED.sort_order,
  updated_at  = now();


-- ------------------------------------------------------------
-- 3b. Plan limits
-- Helper: reference plans by code to avoid hardcoding UUIDs
-- NULL limit_value = unlimited
-- period: 'absolute' = hard cap on count, 'monthly' = rolling window
-- ------------------------------------------------------------

-- BASIC limits
INSERT INTO public.plan_limits (id, plan_id, metric_key, limit_value, period)
SELECT gen_random_uuid(), p.id, l.metric_key, l.limit_value, l.period
FROM public.plans p
CROSS JOIN (VALUES
  ('resources_count',           2::bigint,    'absolute'),
  ('admin_users_count',         1::bigint,    'absolute'),
  ('calendar_connections_count',0::bigint,    'absolute'),
  ('bookings_per_month',        300::bigint,  'monthly'),
  ('api_calls_per_month',       0::bigint,    'monthly')
) AS l(metric_key, limit_value, period)
WHERE p.code = 'basic'
ON CONFLICT (plan_id, metric_key, period) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  updated_at  = now();

-- GROWTH limits
INSERT INTO public.plan_limits (id, plan_id, metric_key, limit_value, period)
SELECT gen_random_uuid(), p.id, l.metric_key, l.limit_value, l.period
FROM public.plans p
CROSS JOIN (VALUES
  ('resources_count',           10::bigint,   'absolute'),
  ('admin_users_count',         5::bigint,    'absolute'),
  ('calendar_connections_count',3::bigint,    'absolute'),
  ('bookings_per_month',        5000::bigint, 'monthly'),
  ('api_calls_per_month',       10000::bigint,'monthly')
) AS l(metric_key, limit_value, period)
WHERE p.code = 'growth'
ON CONFLICT (plan_id, metric_key, period) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  updated_at  = now();

-- PRO limits
INSERT INTO public.plan_limits (id, plan_id, metric_key, limit_value, period)
SELECT gen_random_uuid(), p.id, l.metric_key, l.limit_value, l.period
FROM public.plans p
CROSS JOIN (VALUES
  ('resources_count',           20::bigint,    'absolute'),
  ('admin_users_count',         10::bigint,    'absolute'),
  ('calendar_connections_count',10::bigint,    'absolute'),
  ('bookings_per_month',        10000::bigint, 'monthly'),
  ('api_calls_per_month',       100000::bigint,'monthly')
) AS l(metric_key, limit_value, period)
WHERE p.code = 'pro'
ON CONFLICT (plan_id, metric_key, period) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  updated_at  = now();

-- ENTERPRISE limits — NULL = unlimited
INSERT INTO public.plan_limits (id, plan_id, metric_key, limit_value, period)
SELECT gen_random_uuid(), p.id, l.metric_key, l.limit_value, l.period
FROM public.plans p
CROSS JOIN (VALUES
  ('resources_count',           NULL::bigint, 'absolute'),
  ('admin_users_count',         NULL::bigint, 'absolute'),
  ('calendar_connections_count',NULL::bigint, 'absolute'),
  ('bookings_per_month',        NULL::bigint, 'monthly'),
  ('api_calls_per_month',       NULL::bigint, 'monthly')
) AS l(metric_key, limit_value, period)
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, metric_key, period) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  updated_at  = now();

-- TRIAL limits — mirrors Pro exactly
INSERT INTO public.plan_limits (id, plan_id, metric_key, limit_value, period)
SELECT gen_random_uuid(), trial.id, pl.metric_key, pl.limit_value, pl.period
FROM public.plans trial
JOIN public.plans pro ON pro.code = 'pro'
JOIN public.plan_limits pl ON pl.plan_id = pro.id
WHERE trial.code = 'trial'
ON CONFLICT (plan_id, metric_key, period) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  updated_at  = now();


-- ------------------------------------------------------------
-- 3c. Plan features
-- is_enabled: whether the feature is available on this plan
-- config: jsonb for feature-specific settings (e.g. api access level)
-- ------------------------------------------------------------

-- BASIC features
INSERT INTO public.plan_features (id, plan_id, feature_key, is_enabled, config)
SELECT gen_random_uuid(), p.id, f.feature_key, f.is_enabled, f.config::jsonb
FROM public.plans p
CROSS JOIN (VALUES
  ('booking_mode_free',           true,  '{}'),
  ('booking_mode_availability',   false, '{}'),
  ('booking_mode_hybrid',         false, '{}'),
  ('availability_rules',          false, '{}'),
  ('calendar_integrations',       false, '{}'),
  ('api_access',                  false, '{"level": "none"}'),
  ('webhooks',                    false, '{}'),
  ('email_notifications',         false, '{}'),
  ('audit_log_access',            false, '{}'),
  ('advanced_reporting',          false, '{}'),
  ('custom_branding',             false, '{}'),
  ('priority_processing',         false, '{}'),
  ('advanced_policy_controls',    false, '{}')
) AS f(feature_key, is_enabled, config)
WHERE p.code = 'basic'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  config     = EXCLUDED.config,
  updated_at = now();

-- GROWTH features
INSERT INTO public.plan_features (id, plan_id, feature_key, is_enabled, config)
SELECT gen_random_uuid(), p.id, f.feature_key, f.is_enabled, f.config::jsonb
FROM public.plans p
CROSS JOIN (VALUES
  ('booking_mode_free',           true,  '{}'),
  ('booking_mode_availability',   true,  '{}'),
  ('booking_mode_hybrid',         true,  '{}'),
  ('availability_rules',          true,  '{}'),
  ('calendar_integrations',       true,  '{}'),
  ('api_access',                  true,  '{"level": "basic"}'),
  ('webhooks',                    false, '{}'),
  ('email_notifications',         true,  '{}'),
  ('audit_log_access',            false, '{}'),
  ('advanced_reporting',          false, '{}'),
  ('custom_branding',             false, '{}'),
  ('priority_processing',         false, '{}'),
  ('advanced_policy_controls',    false, '{}')
) AS f(feature_key, is_enabled, config)
WHERE p.code = 'growth'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  config     = EXCLUDED.config,
  updated_at = now();

-- PRO features
INSERT INTO public.plan_features (id, plan_id, feature_key, is_enabled, config)
SELECT gen_random_uuid(), p.id, f.feature_key, f.is_enabled, f.config::jsonb
FROM public.plans p
CROSS JOIN (VALUES
  ('booking_mode_free',           true,  '{}'),
  ('booking_mode_availability',   true,  '{}'),
  ('booking_mode_hybrid',         true,  '{}'),
  ('availability_rules',          true,  '{}'),
  ('calendar_integrations',       true,  '{}'),
  ('api_access',                  true,  '{"level": "full"}'),
  ('webhooks',                    true,  '{}'),
  ('email_notifications',         true,  '{}'),
  ('audit_log_access',            true,  '{}'),
  ('advanced_reporting',          true,  '{}'),
  ('custom_branding',             true,  '{}'),
  ('priority_processing',         true,  '{}'),
  ('advanced_policy_controls',    true,  '{}')
) AS f(feature_key, is_enabled, config)
WHERE p.code = 'pro'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  config     = EXCLUDED.config,
  updated_at = now();

-- ENTERPRISE features — everything on, with enterprise-level config
INSERT INTO public.plan_features (id, plan_id, feature_key, is_enabled, config)
SELECT gen_random_uuid(), p.id, f.feature_key, f.is_enabled, f.config::jsonb
FROM public.plans p
CROSS JOIN (VALUES
  ('booking_mode_free',           true,  '{}'),
  ('booking_mode_availability',   true,  '{}'),
  ('booking_mode_hybrid',         true,  '{}'),
  ('availability_rules',          true,  '{}'),
  ('calendar_integrations',       true,  '{}'),
  ('api_access',                  true,  '{"level": "full"}'),
  ('webhooks',                    true,  '{}'),
  ('email_notifications',         true,  '{}'),
  ('audit_log_access',            true,  '{}'),
  ('advanced_reporting',          true,  '{}'),
  ('custom_branding',             true,  '{}'),
  ('priority_processing',         true,  '{}'),
  ('advanced_policy_controls',    true,  '{}')
) AS f(feature_key, is_enabled, config)
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  config     = EXCLUDED.config,
  updated_at = now();

-- TRIAL features — mirrors Pro exactly
INSERT INTO public.plan_features (id, plan_id, feature_key, is_enabled, config)
SELECT gen_random_uuid(), trial.id, pf.feature_key, pf.is_enabled, pf.config
FROM public.plans trial
JOIN public.plans pro ON pro.code = 'pro'
JOIN public.plan_features pf ON pf.plan_id = pro.id
WHERE trial.code = 'trial'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  config     = EXCLUDED.config,
  updated_at = now();


-- ============================================================
-- 4. VERIFICATION QUERIES
-- Run these after applying to confirm everything looks right.
-- ============================================================

-- Check new tenant columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name IN (
    'display_name', 'contact_email', 'logo_url',
    'brand_colour', 'public_booking_enabled',
    'booking_confirmation_message'
  )
ORDER BY column_name;

-- Check users table changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('is_super_admin', 'tenant_id')
ORDER BY column_name;

-- Check plans seeded correctly
SELECT code, name, is_active, sort_order FROM public.plans ORDER BY sort_order;

-- Check plan limits per plan
SELECT p.code, pl.metric_key, pl.limit_value, pl.period
FROM public.plan_limits pl
JOIN public.plans p ON p.id = pl.plan_id
ORDER BY p.sort_order, pl.metric_key;

-- Check plan features per plan
SELECT p.code, pf.feature_key, pf.is_enabled, pf.config
FROM public.plan_features pf
JOIN public.plans p ON p.id = pf.plan_id
ORDER BY p.sort_order, pf.feature_key;

COMMIT;
