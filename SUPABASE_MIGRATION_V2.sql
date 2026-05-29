-- ═══════════════════════════════════════════════════════════════════════════
-- AUTONEX AI — MIGRATION V2
-- Run this entire file in Supabase SQL Editor AFTER the original migration.
-- Creates: projects, milestones, chat, files, onboarding, support,
--          referrals, feedback, announcements, portal users, notes,
--          deliverables, health — all with RLS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: user_type function (reads JWT claim set during login)
-- Internal team users have app_metadata->>'user_type' = 'team'
-- Portal users have app_metadata->>'user_type' = 'client'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_type()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_type'),
    'team'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'client_id')::uuid;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: portal_users  (client-side accounts — linked to a client row)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL DEFAULT '',
  email          TEXT        NOT NULL,
  phone          TEXT,
  avatar_url     TEXT,
  portal_role    TEXT        NOT NULL DEFAULT 'client_viewer'
                   CHECK (portal_role IN ('client_admin','client_manager','client_viewer')),
  invited_by     UUID        REFERENCES public.portal_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

-- Team can see all portal users
CREATE POLICY "team_all_portal_users"
  ON public.portal_users FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- Portal user can see only users in their client company
CREATE POLICY "portal_user_own_company"
  ON public.portal_users FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- Portal admin can insert/update for their own company
CREATE POLICY "portal_admin_manage_company"
  ON public.portal_users FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: portal_invites  (pending invite tokens for portal access)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  portal_role TEXT        NOT NULL DEFAULT 'client_viewer'
                CHECK (portal_role IN ('client_admin','client_manager','client_viewer')),
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID        REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.portal_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_portal_invites"
  ON public.portal_invites FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- Allow unauthenticated invite token lookup (for accept-invite page)
CREATE POLICY "anon_read_invite_token"
  ON public.portal_invites FOR SELECT
  TO anon
  USING (accepted = false AND expires_at > NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: projects  (one project per client engagement)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  service_type    TEXT        NOT NULL DEFAULT 'Custom',
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('planning','active','review','completed','paused','cancelled')),
  start_date      DATE,
  target_end_date DATE,
  actual_end_date DATE,
  description     TEXT,
  progress        INTEGER     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_project"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: project_milestones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  description    TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed','blocked')),
  estimated_date DATE,
  actual_date    DATE,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_milestones"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: client_health  (RAG status per client project)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_health (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  rag_status   TEXT        NOT NULL DEFAULT 'green'
                 CHECK (rag_status IN ('red','amber','green')),
  notes        TEXT,
  updated_by   UUID        REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_health"
  ON public.client_health FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: internal_notes  (team-only private notes per client)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES auth.users(id),
  author_name TEXT        NOT NULL DEFAULT 'Team',
  content     TEXT        NOT NULL,
  pinned      BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_internal_notes"
  ON public.internal_notes FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: chat_threads
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  department   TEXT        NOT NULL DEFAULT 'general'
                 CHECK (department IN ('general','design','tech','social','billing')),
  name         TEXT        NOT NULL DEFAULT 'General',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, department)
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_threads"
  ON public.chat_threads FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_threads"
  ON public.chat_threads FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: chat_messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID        NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_id    UUID        NOT NULL REFERENCES auth.users(id),
  sender_name  TEXT        NOT NULL DEFAULT 'Unknown',
  sender_role  TEXT,
  sender_type  TEXT        NOT NULL DEFAULT 'team'
                 CHECK (sender_type IN ('team','client')),
  content      TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent','delivered','read')),
  has_attachment BOOLEAN   NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime on chat_messages
ALTER publication supabase_realtime ADD TABLE public.chat_messages;

CREATE POLICY "team_all_messages"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_messages"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: message_attachments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  file_size    BIGINT      NOT NULL DEFAULT 0,
  file_type    TEXT        NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_msg_attachments"
  ON public.message_attachments FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_msg_attachments"
  ON public.message_attachments FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: files  (both team-uploaded and client-uploaded)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.files (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by   UUID        REFERENCES auth.users(id),
  uploader_name TEXT        NOT NULL DEFAULT 'Unknown',
  uploader_type TEXT        NOT NULL DEFAULT 'team'
                  CHECK (uploader_type IN ('team','client')),
  file_name     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL DEFAULT 0,
  file_type     TEXT        NOT NULL DEFAULT 'application/octet-stream',
  storage_path  TEXT        NOT NULL,
  is_deliverable BOOLEAN    NOT NULL DEFAULT false,
  approval_status TEXT      DEFAULT NULL
                   CHECK (approval_status IN ('pending','approved','changes_requested') OR approval_status IS NULL),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Enable Realtime on files
ALTER publication supabase_realtime ADD TABLE public.files;

CREATE POLICY "team_all_files"
  ON public.files FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_files"
  ON public.files FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: file_access_log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.file_access_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID        NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  accessed_by UUID        REFERENCES auth.users(id),
  action      TEXT        NOT NULL DEFAULT 'download'
                CHECK (action IN ('download','preview','delete')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.file_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_file_logs"
  ON public.file_access_log FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: onboarding_checklists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_checklists"
  ON public.onboarding_checklists FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_checklist"
  ON public.onboarding_checklists FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: onboarding_tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id   UUID        NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  action_type    TEXT        NOT NULL DEFAULT 'none'
                   CHECK (action_type IN ('upload','message','external','none')),
  action_url     TEXT,
  is_blocking    BOOLEAN     NOT NULL DEFAULT false,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','completed','skipped')),
  completed_at   TIMESTAMPTZ,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_tasks"
  ON public.onboarding_tasks FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_tasks"
  ON public.onboarding_tasks FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: support_tickets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  raised_by     UUID        REFERENCES auth.users(id),
  raiser_name   TEXT        NOT NULL DEFAULT 'Client',
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  ticket_type   TEXT        NOT NULL DEFAULT 'general'
                  CHECK (ticket_type IN ('general','billing','technical','delivery','other')),
  urgency       TEXT        NOT NULL DEFAULT 'medium'
                  CHECK (urgency IN ('low','medium','high','critical')),
  status        TEXT        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER publication supabase_realtime ADD TABLE public.support_tickets;

CREATE POLICY "team_all_tickets"
  ON public.support_tickets FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_tickets"
  ON public.support_tickets FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: ticket_responses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_responses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id    UUID        REFERENCES auth.users(id),
  author_name  TEXT        NOT NULL DEFAULT 'Team',
  author_type  TEXT        NOT NULL DEFAULT 'team'
                 CHECK (author_type IN ('team','client')),
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER publication supabase_realtime ADD TABLE public.ticket_responses;

CREATE POLICY "team_all_ticket_responses"
  ON public.ticket_responses FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_ticket_responses"
  ON public.ticket_responses FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: referrals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id UUID     NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  referral_code   TEXT        NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  referred_name   TEXT,
  referred_email  TEXT,
  referred_client_id UUID     REFERENCES public.clients(id),
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','signed_up','converted')),
  credit_amount   NUMERIC     NOT NULL DEFAULT 5000,
  credit_applied  BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_referrals"
  ON public.referrals FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND referrer_client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: feedback
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_by     UUID        REFERENCES auth.users(id),
  rating           INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  what_went_well   TEXT,
  what_to_improve  TEXT,
  would_refer      TEXT        NOT NULL DEFAULT 'maybe'
                     CHECK (would_refer IN ('yes','maybe','no')),
  is_public        BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_feedback"
  ON public.feedback FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_feedback"
  ON public.feedback FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: announcements  (broadcast from team to all portal clients)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  author_id    UUID        REFERENCES auth.users(id),
  author_name  TEXT        NOT NULL DEFAULT 'Autonex AI',
  pinned       BOOLEAN     NOT NULL DEFAULT false,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER publication supabase_realtime ADD TABLE public.announcements;

CREATE POLICY "team_all_announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

-- All portal clients can read announcements
CREATE POLICY "client_read_announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (public.get_user_type() = 'client');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: client_satisfaction  (per-phase quick rating)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_satisfaction (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  milestone_id   UUID        REFERENCES public.project_milestones(id),
  rating         TEXT        NOT NULL DEFAULT 'neutral'
                   CHECK (rating IN ('happy','neutral','unhappy')),
  submitted_by   UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_satisfaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_all_satisfaction"
  ON public.client_satisfaction FOR ALL
  TO authenticated
  USING (public.get_user_type() = 'team')
  WITH CHECK (public.get_user_type() = 'team');

CREATE POLICY "client_own_satisfaction"
  ON public.client_satisfaction FOR ALL
  TO authenticated
  USING (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  )
  WITH CHECK (
    public.get_user_type() = 'client'
    AND client_id = public.get_my_client_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime on existing tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER publication supabase_realtime ADD TABLE public.project_milestones;
ALTER publication supabase_realtime ADD TABLE public.invoices;
ALTER publication supabase_realtime ADD TABLE public.notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_client_id ON public.project_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_client_id ON public.chat_threads(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON public.chat_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_files_client_id ON public.files(client_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON public.ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_client_id ON public.internal_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_client_id ON public.onboarding_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_client_id ON public.portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_client_id ON public.feedback(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default onboarding tasks template (call per client after onboarding)
-- ─────────────────────────────────────────────────────────────────────────────
-- Usage: Call this function from your API after creating a client
CREATE OR REPLACE FUNCTION public.create_default_onboarding(p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_checklist_id UUID;
BEGIN
  INSERT INTO public.onboarding_checklists (client_id)
  VALUES (p_client_id)
  ON CONFLICT (client_id) DO NOTHING
  RETURNING id INTO v_checklist_id;

  IF v_checklist_id IS NULL THEN
    SELECT id INTO v_checklist_id FROM public.onboarding_checklists WHERE client_id = p_client_id;
  END IF;

  INSERT INTO public.onboarding_tasks (checklist_id, client_id, title, description, action_type, is_blocking, sort_order)
  VALUES
    (v_checklist_id, p_client_id, 'Complete your profile', 'Add your name, phone number, and profile photo to your portal account.', 'none', false, 1),
    (v_checklist_id, p_client_id, 'Review and sign your contract', 'Your contract has been shared. Please review and sign it at your earliest.', 'external', true, 2),
    (v_checklist_id, p_client_id, 'Pay your deposit invoice', 'Your 50% deposit invoice is ready. Complete payment to begin the project.', 'none', true, 3),
    (v_checklist_id, p_client_id, 'Share brand assets', 'Upload your logo (SVG/PNG), brand guidelines, and any reference materials.', 'upload', false, 4),
    (v_checklist_id, p_client_id, 'Share access credentials', 'Send any platform access needed (hosting, domain, social accounts) via the secure messages channel.', 'message', false, 5),
    (v_checklist_id, p_client_id, 'Review onboarding document', 'Read through the welcome guide we''ve shared in your Documents section.', 'none', false, 6);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default chat threads for a client (call after client creation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_chat_threads(p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.chat_threads (client_id, department, name)
  VALUES
    (p_client_id, 'general', 'General'),
    (p_client_id, 'design',  'Design Team'),
    (p_client_id, 'tech',    'Tech Team'),
    (p_client_id, 'social',  'Social Media Team'),
    (p_client_id, 'billing', 'Billing')
  ON CONFLICT (client_id, department) DO NOTHING;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Default project for a client (call after client creation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_default_project(
  p_client_id UUID,
  p_name TEXT,
  p_service_type TEXT DEFAULT 'Custom'
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_project_id UUID;
BEGIN
  INSERT INTO public.projects (client_id, name, service_type, status)
  VALUES (p_client_id, p_name, p_service_type, 'active')
  RETURNING id INTO v_project_id;

  -- Default milestones
  INSERT INTO public.project_milestones (project_id, client_id, name, status, sort_order)
  VALUES
    (v_project_id, p_client_id, 'Onboarding & Discovery',  'pending', 1),
    (v_project_id, p_client_id, 'Strategy & Planning',     'pending', 2),
    (v_project_id, p_client_id, 'Design & Development',    'pending', 3),
    (v_project_id, p_client_id, 'Review & Revisions',      'pending', 4),
    (v_project_id, p_client_id, 'Launch & Handover',       'pending', 5);

  -- Default health
  INSERT INTO public.client_health (client_id, rag_status)
  VALUES (p_client_id, 'green')
  ON CONFLICT (client_id) DO NOTHING;

  RETURN v_project_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
