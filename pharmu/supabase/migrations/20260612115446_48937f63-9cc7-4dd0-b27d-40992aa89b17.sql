ALTER TYPE public.case_mode ADD VALUE IF NOT EXISTS 'industry';
ALTER TYPE public.case_mode ADD VALUE IF NOT EXISTS 'warehousing';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS formula_json jsonb,
  ADD COLUMN IF NOT EXISTS shipment_json jsonb;

INSERT INTO public.badges (name, description, icon)
VALUES
  ('Master Manufacturer', 'Complete 5 Industry cases with 0 QC errors', '🏭'),
  ('Cold Chain Guardian', 'Correctly identify 5 temperature excursions', '❄️'),
  ('FEFO Expert', 'Complete 10 correct FEFO dispatches', '📦'),
  ('Batch Perfectionist', 'Release a batch with 100% score', '✨')
ON CONFLICT (name) DO NOTHING;
