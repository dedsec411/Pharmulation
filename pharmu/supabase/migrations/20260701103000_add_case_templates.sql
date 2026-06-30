CREATE TABLE IF NOT EXISTS public.case_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode public.case_mode NOT NULL,
  difficulty public.case_difficulty NOT NULL DEFAULT 'easy',
  template_name TEXT,
  base_scenario JSONB NOT NULL,
  variation_rules JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.case_templates TO authenticated, anon;
GRANT ALL ON public.case_templates TO service_role;
ALTER TABLE public.case_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "case_templates_select_all"
  ON public.case_templates FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.user_seen_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.case_mode NOT NULL,
  template_id UUID REFERENCES public.case_templates(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  generated_seed TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (template_id IS NOT NULL OR case_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS user_seen_cases_user_mode_seen_idx
  ON public.user_seen_cases (user_id, mode, last_seen_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_seen_cases_generated_unique_idx
  ON public.user_seen_cases (user_id, template_id, generated_seed)
  WHERE template_id IS NOT NULL AND generated_seed IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_seen_cases_static_unique_idx
  ON public.user_seen_cases (user_id, case_id)
  WHERE case_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.user_seen_cases TO authenticated;
GRANT ALL ON public.user_seen_cases TO service_role;
ALTER TABLE public.user_seen_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_seen_cases_select_own"
  ON public.user_seen_cases FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user_seen_cases_insert_own"
  ON public.user_seen_cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_seen_cases_update_own"
  ON public.user_seen_cases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

WITH antibiotic_drugs AS (
  SELECT jsonb_agg(id) AS ids
  FROM public.drugs
  WHERE name IN ('Nitrofurantoin', 'Cefixime', 'Ciprofloxacin', 'Co-amoxiclav', 'Amoxicillin', 'Azithromycin')
),
patients AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name', 'Sara Khan', 'age_range', jsonb_build_array(22, 34), 'gender', 'female', 'allergies', jsonb_build_array()),
    jsonb_build_object('name', 'Ayesha Malik', 'age_range', jsonb_build_array(30, 48), 'gender', 'female', 'allergies', jsonb_build_array('penicillin')),
    jsonb_build_object('name', 'Mariam Ali', 'age_range', jsonb_build_array(45, 68), 'gender', 'female', 'allergies', jsonb_build_array())
  ) AS pool
)
INSERT INTO public.case_templates (mode, difficulty, template_name, base_scenario, variation_rules)
SELECT
  'rx',
  'easy',
  'UTI antibiotic Rx selection',
  jsonb_build_object(
    'title', 'Uncomplicated UTI prescription',
    'explanation', 'Select an appropriate antibiotic for uncomplicated UTI and counsel on completing the course.',
    'mentor_tip', 'Check allergy status before dispensing antibiotics.',
    'patient_info_json', jsonb_build_object('complaint', 'Dysuria and urinary frequency for 2 days', 'diagnosis', 'Uncomplicated UTI'),
    'electronic_prescription_json', jsonb_build_object('prescriber', 'Dr. Ahmed', 'items', jsonb_build_array()),
    'correct_answer_json', jsonb_build_object('labels', jsonb_build_object())
  ),
  jsonb_build_object(
    'patient_pool', patients.pool,
    'drug_pool', COALESCE(antibiotic_drugs.ids, '[]'::jsonb),
    'dose_range', jsonb_build_object('min', 100, 'max', 500, 'unit', 'mg'),
    'allergy_variants', jsonb_build_array(
      jsonb_build_object('allergy', 'penicillin', 'avoid_names', jsonb_build_array('Amoxicillin', 'Co-amoxiclav'), 'prefer_names', jsonb_build_array('Nitrofurantoin', 'Ciprofloxacin'))
    )
  )
FROM antibiotic_drugs, patients
WHERE jsonb_array_length(COALESCE(antibiotic_drugs.ids, '[]'::jsonb)) > 0
ON CONFLICT DO NOTHING;

WITH otc_drugs AS (
  SELECT jsonb_agg(id) AS ids
  FROM public.drugs
  WHERE name IN ('Paracetamol', 'Ibuprofen', 'Naproxen', 'Cetirizine', 'Loratadine', 'Omeprazole')
),
patients AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name', 'Bilal Ahmed', 'age_range', jsonb_build_array(20, 45), 'gender', 'male', 'allergies', jsonb_build_array()),
    jsonb_build_object('name', 'Hina Yusuf', 'age_range', jsonb_build_array(28, 55), 'gender', 'female', 'allergies', jsonb_build_array('NSAID')),
    jsonb_build_object('name', 'Omar Shah', 'age_range', jsonb_build_array(35, 70), 'gender', 'male', 'allergies', jsonb_build_array())
  ) AS pool
)
INSERT INTO public.case_templates (mode, difficulty, template_name, base_scenario, variation_rules)
SELECT
  'otc',
  'easy',
  'OTC pain management',
  jsonb_build_object(
    'title', 'OTC headache and body pain',
    'explanation', 'Screen for red flags, choose a safe OTC analgesic, and counsel on dose limits.',
    'mentor_tip', 'OTC analgesic choice depends on contraindications, age, and current medicines.',
    'patient_info_json', jsonb_build_object('complaint', 'Mild headache and body pain since yesterday'),
    'correct_answer_json', jsonb_build_object(
      'complaint', 'I have mild headache and body pain since yesterday.',
      'questions', jsonb_build_array(
        jsonb_build_object('q', 'What would you ask first?', 'choices', jsonb_build_array('Any severe symptoms or red flags?', 'What brand do you prefer?', 'Do you want tablets or syrup?'), 'correct', 0),
        jsonb_build_object('q', 'What else matters before recommending?', 'choices', jsonb_build_array('Allergies and current medicines', 'Favorite flavor', 'Nearest clinic'), 'correct', 0)
      ),
      'dose_options', jsonb_build_array('500 mg every 6 hours as needed', '2 tablets every hour', 'Once weekly'),
      'correct_dose', '500 mg every 6 hours as needed',
      'advice_options', jsonb_build_array('Do not exceed the daily dose and seek help if symptoms worsen', 'Take as many as needed', 'Stop all other medicines'),
      'correct_advice', 'Do not exceed the daily dose and seek help if symptoms worsen',
      'correct_quantity', 1
    )
  ),
  jsonb_build_object(
    'patient_pool', patients.pool,
    'drug_pool', COALESCE(otc_drugs.ids, '[]'::jsonb),
    'allergy_variants', jsonb_build_array(
      jsonb_build_object('allergy', 'NSAID', 'avoid_names', jsonb_build_array('Ibuprofen', 'Naproxen'), 'prefer_names', jsonb_build_array('Paracetamol'))
    )
  )
FROM otc_drugs, patients
WHERE jsonb_array_length(COALESCE(otc_drugs.ids, '[]'::jsonb)) > 0
ON CONFLICT DO NOTHING;

WITH clinical_drugs AS (
  SELECT jsonb_agg(id) AS ids
  FROM public.drugs
  WHERE name IN ('Amlodipine', 'Losartan', 'Lisinopril', 'Metformin', 'Gliclazide', 'Atorvastatin')
),
patients AS (
  SELECT jsonb_build_array(
    jsonb_build_object('name', 'Mr. Rahman', 'age_range', jsonb_build_array(48, 72), 'gender', 'male', 'allergies', jsonb_build_array()),
    jsonb_build_object('name', 'Mrs. Saeed', 'age_range', jsonb_build_array(52, 76), 'gender', 'female', 'allergies', jsonb_build_array('ACE inhibitor cough')),
    jsonb_build_object('name', 'Mr. Iqbal', 'age_range', jsonb_build_array(55, 80), 'gender', 'male', 'allergies', jsonb_build_array())
  ) AS pool
)
INSERT INTO public.case_templates (mode, difficulty, template_name, base_scenario, variation_rules)
SELECT
  'hospital',
  'medium',
  'Clinical hypertension review',
  jsonb_build_object(
    'title', 'Hypertension medicines review',
    'explanation', 'Review vitals, allergies, and current medicines before building the clinical order.',
    'mentor_tip', 'Match the order to diagnosis and patient-specific risks.',
    'patient_info_json', jsonb_build_object(
      'diagnosis', 'Hypertension review',
      'labs', jsonb_build_object('eGFR', 82, 'Cr', 86),
      'current_meds', jsonb_build_array('Lifestyle advice documented')
    ),
    'correct_answer_json', jsonb_build_object('drugs', jsonb_build_array(), 'remove', jsonb_build_array())
  ),
  jsonb_build_object(
    'patient_pool', patients.pool,
    'drug_pool', COALESCE(clinical_drugs.ids, '[]'::jsonb),
    'dose_range', jsonb_build_object('min', 5, 'max', 50, 'unit', 'mg'),
    'allergy_variants', jsonb_build_array(
      jsonb_build_object('allergy', 'ACE inhibitor cough', 'avoid_names', jsonb_build_array('Lisinopril'), 'prefer_names', jsonb_build_array('Losartan', 'Amlodipine'))
    )
  )
FROM clinical_drugs, patients
WHERE jsonb_array_length(COALESCE(clinical_drugs.ids, '[]'::jsonb)) > 0
ON CONFLICT DO NOTHING;
