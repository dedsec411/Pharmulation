-- A pharmacy warehouse you run, week by week.
--
-- Warehousing was a five-minute timed case: five phases in React state, scored
-- and thrown away. Everything the mode is being rebuilt to teach - a budget you
-- can overspend, stock that expires while you were not looking, what last month
-- sold, whether your licence is still valid - only means something if it
-- survives the session. So the mode gets state.
--
-- Money is stored as integer paisa (100 to the rupee) rather than a float,
-- because these numbers are added and subtracted every week for months of game
-- time and a rounding drift would eventually be visible in the accounts.
--
-- Periods are week numbers, not dates. The simulation advances when the learner
-- closes a week, not when the clock does, so a facility left alone for a month
-- is exactly where it was left.

-- ---------------------------------------------------------------------------
-- 1. The facility
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Pharmacy',
  city text NOT NULL DEFAULT 'Karachi',
  difficulty text NOT NULL DEFAULT 'medium',
  -- The week the facility is currently living in. Advanced only by closing.
  current_period int NOT NULL DEFAULT 1,
  cash_paisa bigint NOT NULL,
  -- How far the account may go under before the facility is insolvent. A
  -- budget you cannot overspend teaches nothing about budgets.
  overdraft_paisa bigint NOT NULL DEFAULT 0,
  -- Seeds the demand curve, so a week always replays identically and an
  -- educator can check a result rather than take it on trust.
  seed text NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_facilities_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT wh_facilities_status CHECK (status IN ('running', 'insolvent', 'retired')),
  CONSTRAINT wh_facilities_period CHECK (current_period >= 1)
);

-- One live facility each. A learner who goes under starts a new one; the old
-- one is kept, because the post-mortem is the lesson.
CREATE UNIQUE INDEX IF NOT EXISTS wh_facilities_one_running
  ON public.wh_facilities (user_id) WHERE status = 'running';

CREATE OR REPLACE FUNCTION public.owns_facility(uid uuid, facility uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wh_facilities f
    WHERE f.id = facility AND f.user_id = uid
  );
$$;

-- An educator may read a facility belonging to a student in one of their own
-- classes, and nothing else. Same rule the rest of the platform uses.
CREATE OR REPLACE FUNCTION public.can_read_facility(uid uuid, facility uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wh_facilities f
    WHERE f.id = facility
      AND (f.user_id = uid
           OR public.teaches_student(uid, f.user_id)
           OR public.is_admin(uid))
  );
$$;

GRANT EXECUTE ON FUNCTION public.owns_facility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_facility(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Licences
--
-- A Drug Sale Licence is issued by the provincial health authority and has to
-- be renewed. Narcotics need a separate permit, and without one the controlled
-- medicines simply cannot be ordered - which is the point.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  issued_period int NOT NULL DEFAULT 1,
  expires_period int NOT NULL,
  fee_paisa bigint NOT NULL DEFAULT 0,
  CONSTRAINT wh_licences_kind CHECK (kind IN ('drug_sale', 'narcotics')),
  CONSTRAINT wh_licences_status CHECK (status IN ('active', 'expired', 'pending', 'refused'))
);
CREATE INDEX IF NOT EXISTS wh_licences_facility_idx ON public.wh_licences (facility_id, kind);

-- ---------------------------------------------------------------------------
-- 3. Stock, held per batch
--
-- Per batch rather than per medicine, because everything interesting happens
-- at batch level: expiry dates differ, a recall names a batch, and cost of
-- goods depends which one you shipped.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  batch_no text NOT NULL,
  qty int NOT NULL DEFAULT 0,
  expires_period int NOT NULL,
  unit_cost_paisa bigint NOT NULL,
  location text NOT NULL DEFAULT 'ambient',
  received_period int NOT NULL DEFAULT 1,
  CONSTRAINT wh_stock_qty CHECK (qty >= 0),
  CONSTRAINT wh_stock_location CHECK (
    location IN ('ambient', 'cold-chain', 'cd-safe', 'flammables', 'quarantine'))
);
CREATE INDEX IF NOT EXISTS wh_stock_facility_idx ON public.wh_stock (facility_id, drug_id);
CREATE INDEX IF NOT EXISTS wh_stock_expiry_idx ON public.wh_stock (facility_id, expires_period);

-- ---------------------------------------------------------------------------
-- 4. Purchase orders
--
-- An order is placed in one week and arrives in another. That gap is the whole
-- reason a reorder point exists.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  placed_period int NOT NULL,
  eta_period int NOT NULL,
  status text NOT NULL DEFAULT 'placed',
  total_paisa bigint NOT NULL DEFAULT 0,
  -- Distributors here sell on terms; the cash leaves later than the stock
  -- arrives, which is exactly how a pharmacy gets into trouble.
  payment_due_period int NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_orders_status CHECK (status IN ('placed', 'delivered', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS wh_orders_facility_idx ON public.wh_orders (facility_id, status);

CREATE TABLE IF NOT EXISTS public.wh_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wh_orders(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  packs int NOT NULL,
  unit_price_paisa bigint NOT NULL,
  -- What actually turned up. A short delivery is a supplier problem the
  -- learner has to notice on the three-way match.
  received_packs int,
  CONSTRAINT wh_order_lines_packs CHECK (packs > 0)
);
CREATE INDEX IF NOT EXISTS wh_order_lines_order_idx ON public.wh_order_lines (order_id);

-- ---------------------------------------------------------------------------
-- 5. The weekly result
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  revenue_paisa bigint NOT NULL DEFAULT 0,
  cogs_paisa bigint NOT NULL DEFAULT 0,
  wastage_paisa bigint NOT NULL DEFAULT 0,
  purchases_paisa bigint NOT NULL DEFAULT 0,
  overheads_paisa bigint NOT NULL DEFAULT 0,
  opening_cash_paisa bigint NOT NULL DEFAULT 0,
  closing_cash_paisa bigint NOT NULL DEFAULT 0,
  demanded int NOT NULL DEFAULT 0,
  sold int NOT NULL DEFAULT 0,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, period_no)
);
CREATE INDEX IF NOT EXISTS wh_periods_facility_idx
  ON public.wh_periods (facility_id, period_no DESC);

-- ---------------------------------------------------------------------------
-- 6. Cash, itemised
--
-- The period table says what happened; this says why. Without it a learner
-- whose cash fell has no way to find out what took it.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  kind text NOT NULL,
  -- Signed: money in is positive, money out is negative.
  amount_paisa bigint NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_ledger_kind CHECK (
    kind IN ('sale', 'purchase', 'overhead', 'write-off', 'licence', 'penalty'))
);
CREATE INDEX IF NOT EXISTS wh_ledger_facility_idx
  ON public.wh_ledger (facility_id, period_no DESC);

-- ---------------------------------------------------------------------------
-- 7. What the week threw at you
--
-- Recalls, cold-chain excursions and inspections. Kept as rows rather than
-- generated on the fly so that an unresolved recall is still unresolved when
-- the learner comes back tomorrow.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wh_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  period_no int NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wh_events_kind CHECK (
    kind IN ('recall', 'excursion', 'inspection', 'shortage', 'licence-expiry'))
);
CREATE INDEX IF NOT EXISTS wh_events_open_idx
  ON public.wh_events (facility_id, resolved, period_no DESC);

-- ---------------------------------------------------------------------------
-- 8. Isolation
--
-- A facility is one learner's. An educator may read one belonging to a student
-- in their own class and may never write to it; nobody else sees it at all.
-- Enforced here rather than in the interface, as everywhere else.
-- ---------------------------------------------------------------------------

ALTER TABLE public.wh_facilities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_licences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_stock       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_periods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_ledger      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wh_events      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wh_facilities_own ON public.wh_facilities;
CREATE POLICY wh_facilities_own ON public.wh_facilities
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wh_facilities_teacher_read ON public.wh_facilities;
CREATE POLICY wh_facilities_teacher_read ON public.wh_facilities
  FOR SELECT USING (public.teaches_student(auth.uid(), user_id) OR public.is_admin(auth.uid()));

-- The child tables all hang off the same question: whose facility is this.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['wh_licences', 'wh_stock', 'wh_orders', 'wh_periods',
                           'wh_ledger', 'wh_events']
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

-- Order lines reach the facility through their order.
DROP POLICY IF EXISTS wh_order_lines_own ON public.wh_order_lines;
CREATE POLICY wh_order_lines_own ON public.wh_order_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.wh_orders o
    WHERE o.id = order_id AND public.owns_facility(auth.uid(), o.facility_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wh_orders o
    WHERE o.id = order_id AND public.owns_facility(auth.uid(), o.facility_id)));

DROP POLICY IF EXISTS wh_order_lines_read ON public.wh_order_lines;
CREATE POLICY wh_order_lines_read ON public.wh_order_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.wh_orders o
    WHERE o.id = order_id AND public.can_read_facility(auth.uid(), o.facility_id)));
