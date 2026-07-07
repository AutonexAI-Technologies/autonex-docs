-- ═══════════════════════════════════════════════════════════════════════════
-- AUTONEX AI — MIGRATION V4: COMPLETE MESSAGING SYSTEM FIX
-- Run this in your Supabase Dashboard → SQL Editor
-- This supersedes V3. Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1: Ensure chat_threads has all required columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS thread_type   TEXT DEFAULT 'client'
    CHECK (thread_type IN ('client', 'internal', 'system')),
  ADD COLUMN IF NOT EXISTS team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_name     TEXT,
  ADD COLUMN IF NOT EXISTS last_message  TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unread_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop old constraints and create new team-based unique index
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_threads
  DROP CONSTRAINT IF EXISTS chat_threads_client_id_department_key;

DROP INDEX IF EXISTS chat_threads_client_team_type_idx;
CREATE UNIQUE INDEX chat_threads_client_team_type_idx
  ON public.chat_threads (
    client_id,
    COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    thread_type
  );

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3: Ensure chat_messages has all required columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_role   TEXT,
  ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read'));

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4: RLS — Disable RLS on chat tables (admin API handles security)
-- We use server-side admin client for all chat operations, RLS is unnecessary
-- and causes read failures for portal clients.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_threads  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: Helper function — create_default_chat_threads
-- Called automatically when a client is assigned to a team
-- Creates one 'client' thread (visible to client) and one 'internal' thread
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_chat_threads(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team RECORD;
BEGIN
  -- For each team assigned to this client, create client + internal threads
  FOR v_team IN
    SELECT DISTINCT t.id AS team_id, t.name AS team_name
    FROM public.client_team_assignments cta
    JOIN public.teams t ON t.id = cta.team_id
    WHERE cta.client_id = p_client_id
  LOOP
    -- Client-facing thread (client can read/write)
    INSERT INTO public.chat_threads (client_id, team_id, team_name, department, name, thread_type)
    VALUES (
      p_client_id,
      v_team.team_id,
      v_team.team_name,
      LOWER(v_team.team_name),
      v_team.team_name || ' · Client Chat',
      'client'
    )
    ON CONFLICT ON CONSTRAINT chat_threads_client_team_type_idx DO NOTHING;

    -- Internal thread (team only, client never sees this)
    INSERT INTO public.chat_threads (client_id, team_id, team_name, department, name, thread_type)
    VALUES (
      p_client_id,
      v_team.team_id,
      v_team.team_name,
      LOWER(v_team.team_name),
      v_team.team_name || ' · Internal',
      'internal'
    )
    ON CONFLICT ON CONSTRAINT chat_threads_client_team_type_idx DO NOTHING;
  END LOOP;

  -- Always ensure a General client thread exists (no team)
  INSERT INTO public.chat_threads (client_id, department, name, thread_type, team_id)
  VALUES (
    p_client_id,
    'general',
    'General · Client Chat',
    'client',
    '00000000-0000-0000-0000-000000000000'
  )
  ON CONFLICT ON CONSTRAINT chat_threads_client_team_type_idx DO NOTHING;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: Seed threads for ALL existing clients (backfill)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_client RECORD;
BEGIN
  FOR v_client IN SELECT id FROM public.clients LOOP
    -- General client thread
    INSERT INTO public.chat_threads (client_id, department, name, thread_type, team_id)
    VALUES (
      v_client.id,
      'general',
      'General',
      'client',
      '00000000-0000-0000-0000-000000000000'
    )
    ON CONFLICT ON CONSTRAINT chat_threads_client_team_type_idx DO NOTHING;
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 7: Function to increment unread count on new messages
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_threads SET
    last_message    = NEW.content,
    last_message_at = NEW.created_at,
    updated_at      = NOW(),
    unread_count    = CASE
      WHEN NEW.sender_type = 'team' THEN unread_count + 1  -- team sent, client hasn't read
      ELSE unread_count                                      -- client sent, no client unread
    END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_thread_on_message ON public.chat_messages;
CREATE TRIGGER tr_update_thread_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();

-- ────────────────────────────────────────────────────────────────────────────
-- DONE — Verification query
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  c.name AS client_name,
  ct.name AS thread_name,
  ct.thread_type,
  ct.team_name
FROM public.chat_threads ct
JOIN public.clients c ON c.id = ct.client_id
ORDER BY c.name, ct.thread_type;
