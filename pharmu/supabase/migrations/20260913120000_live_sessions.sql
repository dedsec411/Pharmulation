-- Live cohort sessions: one host, one shared drill, a room full of phones.
--
-- The host opens a session and reads a six-character code off a projector.
-- Everyone joins, the host starts, and every phone plays the identical drill -
-- identical because the questions are generated from a seed stored on the
-- session, not because a set of questions was written down.
--
-- Two things shape the security here.
--
-- A student never selects from live_sessions to join. Turning a code into a
-- session id happens inside join_live_session_by_code, the same pattern
-- join_class_by_code uses, so nobody can enumerate the sessions running in a
-- building by listing the table.
--
-- And the "can I see the other people in my session" check goes through a
-- SECURITY DEFINER function rather than a subquery on live_participants. A
-- policy on that table that selects from that table recurses, and Postgres
-- fails the query rather than the policy.

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  title TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  -- What makes everybody's questions the same questions.
  seed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'running', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score INTEGER,
  errors INTEGER,
  finished_at TIMESTAMPTZ,
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_participants_session_idx
  ON public.live_participants (session_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS live_sessions_host_idx
  ON public.live_sessions (host_id, created_at DESC);

-- Bypasses RLS on purpose: a policy on live_participants cannot ask
-- live_participants a question without recursing.
CREATE OR REPLACE FUNCTION public.is_live_participant(sid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_participants p
    WHERE p.session_id = sid AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_live_host(sid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = sid AND s.host_id = auth.uid()
  );
$$;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.live_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_participants TO authenticated;

DROP POLICY IF EXISTS live_sessions_select ON public.live_sessions;
CREATE POLICY live_sessions_select ON public.live_sessions
  FOR SELECT USING (
    host_id = auth.uid()
    OR public.is_live_participant(public.live_sessions.id)
  );

DROP POLICY IF EXISTS live_sessions_insert ON public.live_sessions;
CREATE POLICY live_sessions_insert ON public.live_sessions
  FOR INSERT WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS live_sessions_update ON public.live_sessions;
CREATE POLICY live_sessions_update ON public.live_sessions
  FOR UPDATE USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS live_participants_select ON public.live_participants;
CREATE POLICY live_participants_select ON public.live_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_live_host(public.live_participants.session_id)
    OR public.is_live_participant(public.live_participants.session_id)
  );

-- Joining goes through the RPC below, which is what actually writes this row.
-- The policy still has to allow it, because the RPC runs as the caller.
DROP POLICY IF EXISTS live_participants_insert ON public.live_participants;
CREATE POLICY live_participants_insert ON public.live_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS live_participants_update ON public.live_participants;
CREATE POLICY live_participants_update ON public.live_participants
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

/**
 * Turn a code into a seat in the room.
 *
 * Returns the session id, so the caller can then read the session it is now a
 * participant of. A session that has ended is not joinable; one that is
 * already running is, because somebody arriving late should be able to sit
 * down rather than be turned away.
 */
CREATE OR REPLACE FUNCTION public.join_live_session_by_code(code TEXT, name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found public.live_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  SELECT * INTO found FROM public.live_sessions s
  WHERE s.code = upper(btrim(join_live_session_by_code.code))
    AND s.status <> 'ended'
  LIMIT 1;

  IF found.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.live_participants (session_id, user_id, display_name)
  VALUES (found.id, auth.uid(), coalesce(nullif(btrim(name), ''), 'Guest'))
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET display_name = EXCLUDED.display_name;

  RETURN found.id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_live_session_by_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_live_session_by_code(TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.is_live_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_participant(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.is_live_host(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_host(UUID) TO authenticated;
