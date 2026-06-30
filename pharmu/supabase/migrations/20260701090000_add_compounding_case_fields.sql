ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS requires_compounding BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compound_type TEXT,
  ADD COLUMN IF NOT EXISTS compound_data JSONB;
