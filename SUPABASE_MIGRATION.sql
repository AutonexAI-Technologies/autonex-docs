-- ═══════════════════════════════════════════════════════════
-- AUTONEX AI — ADDITIONAL TABLES (run in Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════
-- Your existing 4 tables (clients, departments, roles, team_members)
-- are CORRECT. Run ONLY this file to add the 2 missing tables.
-- ═══════════════════════════════════════════════════════════

-- ── TABLE 5: activity_logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name   TEXT        NOT NULL DEFAULT 'System',
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,   -- 'client' | 'invoice' | 'document' | 'team' | 'settings'
  entity_id   UUID,
  entity_name TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated"
  ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── TABLE 6: notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','error')),
  read       BOOLEAN     NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── ALSO: add invoices + retainers tables if not already created ──

CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID        REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number TEXT        NOT NULL UNIQUE,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  due_date       DATE,
  issued_date    DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.retainers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID        REFERENCES public.clients(id) ON DELETE CASCADE,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  billing_cycle  TEXT        NOT NULL DEFAULT 'monthly'
                   CHECK (billing_cycle IN ('weekly','monthly','quarterly','yearly')),
  next_due_date  DATE,
  status         TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paused','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated"
  ON public.retainers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── VERIFY all tables exist ────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
