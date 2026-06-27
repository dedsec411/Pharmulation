
-- 1. Drug bookmarks
CREATE TABLE IF NOT EXISTS public.drug_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, drug_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drug_bookmarks TO authenticated;
GRANT ALL ON public.drug_bookmarks TO service_role;
ALTER TABLE public.drug_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.drug_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.drug_bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Admin role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE public.user_role ADD VALUE 'admin';
  END IF;
END $$;

-- 3. Badges unique + seed
ALTER TABLE public.badges ADD CONSTRAINT badges_name_unique UNIQUE (name);
INSERT INTO public.badges (name, description, icon, condition_type, condition_value) VALUES
  ('First Prescription', 'Complete your first Rx case', '📜', 'mode_rx_count', 1),
  ('Speed Demon', 'Complete a case in under 60 seconds', '⚡', 'fast_case', 60),
  ('Perfect Score', 'Score 100+ on any case', '💯', 'score_min', 100),
  ('Streak Master', 'Maintain a 7-day streak', '🔥', 'streak', 7),
  ('Drug Encyclopedia', 'Read info for 50 drugs', '📚', 'drugs_read', 50),
  ('Emergency Responder', 'Complete 5 emergency cases', '🚨', 'mode_emergency_count', 5),
  ('OTC Expert', 'Complete 10 OTC cases', '💊', 'mode_otc_count', 10),
  ('First Case', 'Completed your first case', '🎓', 'total_cases', 1),
  ('Apprentice', 'Completed 10 cases', '💊', 'total_cases', 10),
  ('Pharmacist', 'Completed 25 cases', '🏆', 'total_cases', 25),
  ('High Roller', 'Scored 200+ in a single case', '🔥', 'score_min', 200)
ON CONFLICT (name) DO NOTHING;

-- 4. Realtime (idempotent)
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scores; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
