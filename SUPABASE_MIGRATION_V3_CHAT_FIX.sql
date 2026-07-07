-- ═══════════════════════════════════════════════════════════════════════════
-- AUTONEX AI — MIGRATION V3 CHAT FIX
-- Run this in your Supabase Dashboard SQL Editor
-- Fixes: Drop old static department-uniqueness constraint, enable team-based client/internal routing
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop the old unique constraint on (client_id, department)
ALTER TABLE public.chat_threads 
  DROP CONSTRAINT IF EXISTS chat_threads_client_id_department_key;

-- 2. Ensure columns for team-based routing exist
ALTER TABLE public.chat_threads 
  ADD COLUMN IF NOT EXISTS thread_type  TEXT DEFAULT 'client' 
    CHECK (thread_type IN ('client', 'internal', 'system')),
  ADD COLUMN IF NOT EXISTS team_id      UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_name    TEXT;

-- 3. Add a new unique constraint on (client_id, team_id, thread_type)
-- If team_id is null (e.g. for general/system channels), this constraint allows multiple nulls in standard PG.
-- To enforce uniqueness including nulls, we use a unique index:
CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_client_team_type_idx 
  ON public.chat_threads (client_id, COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid), thread_type);

-- 4. Update the SELECT RLS policy for client users to prevent reading internal threads
DROP POLICY IF EXISTS "client_own_threads" ON public.chat_threads;
CREATE POLICY "client_own_threads"
  ON public.chat_threads FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
    AND thread_type = 'client'
  );
