
CREATE TYPE public.user_role AS ENUM ('student','graduate','pharmd');
CREATE TYPE public.case_mode AS ENUM ('rx','otc','hospital','oncology','cosmetic','emergency');
CREATE TYPE public.case_difficulty AS ENUM ('easy','medium','hard');

CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  total_cases_completed INT NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_time_per_case NUMERIC(8,2) NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  last_active DATE,
  cpd_hours_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  drug_class TEXT,
  indications TEXT[] DEFAULT '{}',
  dosage TEXT,
  side_effects TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  interactions TEXT[] DEFAULT '{}',
  category TEXT,
  is_bookmarked_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.drugs TO authenticated;
GRANT SELECT ON public.drugs TO anon;
GRANT ALL ON public.drugs TO service_role;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drugs_select_all" ON public.drugs FOR SELECT USING (true);
CREATE POLICY "drugs_update_auth" ON public.drugs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode public.case_mode NOT NULL,
  difficulty public.case_difficulty NOT NULL DEFAULT 'easy',
  title TEXT,
  prescription_image_url TEXT,
  electronic_prescription_json JSONB,
  drugs_required TEXT[] DEFAULT '{}',
  patient_info_json JSONB,
  correct_answer_json JSONB,
  explanation TEXT,
  mentor_tip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cases TO authenticated, anon;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_select_all" ON public.cases FOR SELECT USING (true);

CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  mode public.case_mode NOT NULL,
  score INT NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken INT NOT NULL DEFAULT 0,
  errors_made INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.scores TO authenticated;
GRANT SELECT ON public.scores TO anon;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_select_all" ON public.scores FOR SELECT USING (true);
CREATE POLICY "scores_insert_own" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_score INT NOT NULL DEFAULT 0,
  alltime_score INT NOT NULL DEFAULT 0,
  mode public.case_mode,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mode)
);
GRANT SELECT ON public.leaderboard TO authenticated, anon;
GRANT INSERT, UPDATE ON public.leaderboard TO authenticated;
GRANT ALL ON public.leaderboard TO service_role;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lb_select_all" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "lb_insert_own" ON public.leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lb_update_own" ON public.leaderboard FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT,
  condition_value INT
);
GRANT SELECT ON public.badges TO authenticated, anon;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT ON public.user_badges TO anon;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ub_select_all" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "ub_insert_own" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cpd_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hours_earned NUMERIC(6,2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_url TEXT
);
GRANT SELECT, INSERT ON public.cpd_certificates TO authenticated;
GRANT ALL ON public.cpd_certificates TO service_role;
ALTER TABLE public.cpd_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpd_select_own" ON public.cpd_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cpd_insert_own" ON public.cpd_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
