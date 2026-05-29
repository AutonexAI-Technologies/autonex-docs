-- ═══════════════════════════════════════════════════════════════════════════
-- AUTONEX AI — MIGRATION V2 PATCH
-- Run this FIRST, before SUPABASE_MIGRATION_V2.sql
-- Fixes: clients.status values + clients.service_type alias
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Normalize existing status values to lowercase pipeline format
--    (Old app used 'Lead', 'Active' — pipeline uses 'lead', 'active')
UPDATE public.clients SET status = 'lead'             WHERE status ILIKE 'lead';
UPDATE public.clients SET status = 'proposal_sent'    WHERE status ILIKE 'proposal sent' OR status ILIKE 'proposal_sent';
UPDATE public.clients SET status = 'contract_signed'  WHERE status ILIKE 'contract signed' OR status ILIKE 'contract_signed' OR status ILIKE 'signed';
UPDATE public.clients SET status = 'active'           WHERE status ILIKE 'active' OR status ILIKE 'onboarding';
UPDATE public.clients SET status = 'review'           WHERE status ILIKE 'review' OR status ILIKE 'in review';
UPDATE public.clients SET status = 'completed'        WHERE status ILIKE 'completed' OR status ILIKE 'done';
UPDATE public.clients SET status = 'paused'           WHERE status ILIKE 'paused' OR status ILIKE 'on hold';

-- Set anything else to 'lead' as safe default
UPDATE public.clients
SET status = 'lead'
WHERE status NOT IN (
  'lead','proposal_sent','contract_signed',
  'active','review','completed','paused','cancelled'
);

-- 2. Add service_type as an alias column (copies from existing 'service' column)
--    The internal app uses 'service', projects table will use 'service_type'
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS service_type TEXT;

UPDATE public.clients
SET service_type = service
WHERE service_type IS NULL AND service IS NOT NULL;

-- 3. Add columns the new features need on existing clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS website         TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS gst_number      TEXT,
  ADD COLUMN IF NOT EXISTS pan_number      TEXT,
  ADD COLUMN IF NOT EXISTS payment_link    TEXT,
  ADD COLUMN IF NOT EXISTS portal_access   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarded_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. Add updated_at trigger so it auto-updates on every edit
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Verify existing tables are intact
SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS col_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
