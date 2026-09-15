-- What this particular pharmacy sells, and on what terms.
--
-- The facility tables landed without this and they needed it. `drugs` holds
-- clinical data - class, dosage, interactions - and no commercial data at all:
-- no price, no shelf life, no lead time, no idea whether a medicine needs a
-- fridge. A warehouse simulation is entirely about those things.
--
-- It also has to be per facility rather than global. Two learners running two
-- pharmacies should not share a price list, a demand curve or a supplier, or
-- the second one is playing back the first one's game.
--
-- A medicine stays on this list when its stock reaches zero. That is the
-- difference between "we are out of amoxicillin" and "we do not sell
-- amoxicillin", and the first is the one that costs you a sale.

CREATE TABLE IF NOT EXISTS public.wh_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.wh_facilities(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,

  -- DRAP fixes the Maximum Retail Price and it is printed on the pack. It is
  -- a ceiling handed to the pharmacy, not a lever it pulls.
  --
  -- These figures are SIMULATED. They are derived from the medicine's category
  -- so that the relative economics are sane - an antibiotic course costs more
  -- than a paracetamol pack, insulin more than either - and they are not real
  -- DRAP notified prices. Nothing here should be quoted as one.
  mrp_paisa bigint NOT NULL,
  trade_price_paisa bigint NOT NULL,

  -- Demand, as a base week plus a seasonal swing. Antibiotics peak in winter,
  -- antihistamines in spring, and a learner who orders flat all year feels it.
  base_weekly int NOT NULL DEFAULT 10,
  seasonality numeric(4, 2) NOT NULL DEFAULT 0,
  peak_week int NOT NULL DEFAULT 1,

  shelf_life_weeks int NOT NULL DEFAULT 104,
  lead_time_weeks int NOT NULL DEFAULT 1,

  -- Where a pack is allowed to live. Not a preference: a vaccine in ambient
  -- storage is destroyed stock and a controlled drug outside the safe is a
  -- licence problem.
  storage text NOT NULL DEFAULT 'ambient',
  -- Controlled medicines need the narcotics permit before they can be ordered
  -- at all, and carry a running register that has to reconcile exactly.
  controlled boolean NOT NULL DEFAULT false,

  UNIQUE (facility_id, drug_id),
  CONSTRAINT wh_catalogue_storage CHECK (
    storage IN ('ambient', 'cold-chain', 'cd-safe', 'flammables')),
  CONSTRAINT wh_catalogue_prices CHECK (mrp_paisa > 0 AND trade_price_paisa > 0),
  CONSTRAINT wh_catalogue_peak CHECK (peak_week BETWEEN 1 AND 52)
);

CREATE INDEX IF NOT EXISTS wh_catalogue_facility_idx
  ON public.wh_catalogue (facility_id);

ALTER TABLE public.wh_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wh_catalogue_own ON public.wh_catalogue;
CREATE POLICY wh_catalogue_own ON public.wh_catalogue
  FOR ALL USING (public.owns_facility(auth.uid(), facility_id))
  WITH CHECK (public.owns_facility(auth.uid(), facility_id));

DROP POLICY IF EXISTS wh_catalogue_read ON public.wh_catalogue;
CREATE POLICY wh_catalogue_read ON public.wh_catalogue
  FOR SELECT USING (public.can_read_facility(auth.uid(), facility_id));
