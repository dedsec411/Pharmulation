-- The paperwork half of running a pharmacy.
--
-- Licensing, stock and money were already here. What was missing is the part a
-- drug inspector actually asks for: the controlled drugs register and the
-- fridge temperature log. Both are deliberately things the learner has to
-- keep, not things the simulation keeps for them - a register that reconciles
-- itself teaches nothing, because in a real pharmacy the shelf moves whether
-- the paperwork was written up or not, and the gap between the two is the
-- entire reason the register exists.

-- ---------------------------------------------------------------------------
-- 1. The controlled drugs register
--
-- One running balance per controlled medicine. It moves only when the learner
-- posts the week's entries. The shelf moves regardless, so a learner who
-- leaves the register unposted for three weeks will find it claims stock that
-- was dispensed - and under the Control of Narcotic Substances Act that is not
-- a stock variance.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_cd_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  balance int NOT NULL DEFAULT 0,
  -- The last week whose receipts and issues have been written into the
  -- register. Anything after this is on the shelf but not in the book.
  posted_through_period int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_cd_register_balance CHECK (balance >= 0),
  UNIQUE (facility_id, drug_id)
);
CREATE INDEX IF NOT EXISTS wh_cd_register_facility_idx
  ON public.wh_cd_register (facility_id);

-- ---------------------------------------------------------------------------
-- 2. The weekly records
--
-- A row means the record was kept for that week. A missing row means it was
-- not, which is exactly what an inspector finds.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_paperwork (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_paperwork_kind CHECK (kind IN ('temperature-log', 'cd-register')),
  UNIQUE (facility_id, period_no, kind)
);
CREATE INDEX IF NOT EXISTS wh_paperwork_facility_idx
  ON public.wh_paperwork (facility_id, period_no DESC);

-- ---------------------------------------------------------------------------
-- 3. Being closed down
--
-- An inspection that finds something serious enough does not fine a pharmacy,
-- it shuts it. That is temporary and recoverable - you close, you put it
-- right, you reopen - so it is a week number rather than a facility status:
-- the run continues, and the weeks of no takings are the punishment.
-- ---------------------------------------------------------------------------

ALTER TABLE public.wh_facilities
  ADD COLUMN IF NOT EXISTS suspended_until_period int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- What this particular shop costs to run
--
-- Rent and working capital are worked out from the catalogue the facility
-- actually got, because every facility gets a different one: a rent that
-- squeezed a forty-line pharmacy would be pocket change to one selling twice
-- as much, and a budget that cannot bite teaches nothing about budgets. So the
-- figure is stored per facility rather than read from a table of constants.
-- ---------------------------------------------------------------------------

ALTER TABLE public.wh_facilities
  ADD COLUMN IF NOT EXISTS weekly_overheads_paisa bigint NOT NULL DEFAULT 0;

-- What the facility opened with, so week one's report has an opening balance
-- that is not simply whatever the cash happened to be when it was written.
ALTER TABLE public.wh_facilities
  ADD COLUMN IF NOT EXISTS opening_cash_paisa bigint NOT NULL DEFAULT 0;

-- Fines and licence fees belong in the weekly result, or the period report
-- does not add up. Kept apart, because a learner reading a week where the cash
-- fell should be able to tell a renewal they chose to pay from a fine they did
-- not.
ALTER TABLE public.wh_periods
  ADD COLUMN IF NOT EXISTS penalties_paisa bigint NOT NULL DEFAULT 0;
ALTER TABLE public.wh_periods
  ADD COLUMN IF NOT EXISTS fees_paisa bigint NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 4. Isolation, on the same terms as the rest of the facility
-- ---------------------------------------------------------------------------

ALTER TABLE public.wh_cd_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_paperwork   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['wh_cd_register', 'wh_paperwork']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_own ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY %1$s_own ON public.%1$s FOR ALL
         USING (public.owns_facility(auth.uid(), facility_id))
         WITH CHECK (public.owns_facility(auth.uid(), facility_id))', t);

    EXECUTE format('DROP POLICY IF EXISTS %1$s_read ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY %1$s_read ON public.%1$s FOR SELECT
         USING (public.can_read_facility(auth.uid(), facility_id))', t);
  END LOOP;
END $$;
