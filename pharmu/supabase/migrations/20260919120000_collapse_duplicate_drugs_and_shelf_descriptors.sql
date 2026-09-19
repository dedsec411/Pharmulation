-- One row per medicine, and brand names that are actually brand names.
--
-- The 2026-09-19 data audit found three things in the medicine tables that a
-- learner can see on the dispensing shelf.
--
-- Seven medicines are in `drugs` twice - levetiracetam, tolnaftate, ampicillin,
-- tobramycin, brivaracetam, etomidate and cefotaxime - each pair identical in
-- name, category and class, and each pair carrying an identical set of brands.
-- Every one of the fourteen rows is flagged needs_review, so they arrived from
-- an import that ran twice rather than from anyone's judgement.
--
-- Six rows in `drug_brands` are not brands at all. "Pain Reliever", "Pain
-- Relief" and "Pain Relief Extra Strength" are what a US shelf label says, not
-- what a box says, and they sit on Acetaminophen - which shares its generic
-- name with Paracetamol, so the dispensing shelf offers them when a learner
-- reaches for Panadol. "Aloe Vera Gel" and "Sunburn Relief Gel" are consumer
-- topicals sitting on Lidocaine Hcl, and reach the shelf the same way when a
-- learner dispenses Lidocaine. "Antifungal" on Clotrimazole is the same kind of
-- descriptor. Only three brands are ever offered for a medicine, so a learner
-- can be shown three of these and no real brand at all.
--
-- And Lidocaine Hcl sits under Cardiovascular while the Lidocaine row it
-- duplicates sits under Anesthetic. Lidocaine really is both - a local
-- anaesthetic and an antiarrhythmic - but this catalogue gives a molecule one
-- shelf, and the row the application keeps is the Anesthetic one.
--
-- NOTHING HERE IS A BLIND DELETE. A bookmark is a student's study list, so
-- bookmarks pointing at a discarded row are MOVED to the row that survives and
-- only dropped when that student already has the survivor. Brands are moved
-- the same way. The duplicate detection insists rows match on name AND
-- category AND class, so it can never collapse two medicines that differ in
-- any way that shows.
--
-- drug_bookmarks.drug_ref is text, not a uuid foreign key: 20260828160000
-- widened it so the client-generated half of the catalogue, whose ids look
-- like "catalog-ibuprofen", can be bookmarked at all. That is why there is no
-- foreign key here and why nothing would have cascaded. So every comparison
-- against it casts the uuid TO text, never the column to uuid. That direction
-- is not a style choice - "catalog-ibuprofen"::uuid raises 22P02 and takes the
-- whole migration down, and only on databases that have such a bookmark. Cast
-- this way and a text value that names no row here simply fails to match,
-- which is exactly what should happen to it.
--
-- The application already tolerates all of this: canonicalDrugKey folds the
-- spellings and prepareDrugCatalog keys by molecule, which is why the
-- catalogue reports 881 medicines from 896 rows. This migration makes the
-- table agree with what the application shows. Applying it does not change
-- that 881, because the folding already hid these rows.
--
-- APPLY THIS BY HAND. It edits live rows in `drugs`, `drug_brands` and
-- `drug_bookmarks`. Read the verification queries at the bottom first, run
-- them before and after, and take a backup.

BEGIN;

-- 1. The seven duplicated medicines -----------------------------------------

CREATE TEMP TABLE dup_drug ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    lower(btrim(name))                      AS name_key,
    lower(btrim(coalesce(category, '')))    AS cat_key,
    lower(btrim(coalesce(drug_class, '')))  AS class_key,
    row_number() OVER (
      PARTITION BY
        lower(btrim(name)),
        lower(btrim(coalesce(category, ''))),
        lower(btrim(coalesce(drug_class, '')))
      -- Oldest wins, id breaks the tie, so the choice is deterministic.
      ORDER BY created_at, id
    ) AS rn
  FROM public.drugs
),
keeper AS (
  SELECT name_key, cat_key, class_key, id
  FROM ranked
  WHERE rn = 1
)
SELECT r.id AS loser_id, k.id AS keeper_id
FROM ranked r
JOIN keeper k
  ON k.name_key = r.name_key
 AND k.cat_key = r.cat_key
 AND k.class_key = r.class_key
WHERE r.rn > 1;

-- Move a student's bookmark onto the row that survives.
UPDATE public.drug_bookmarks b
SET drug_ref = d.keeper_id::text
FROM dup_drug d
WHERE b.drug_ref = d.loser_id::text
  AND NOT EXISTS (
    SELECT 1
    FROM public.drug_bookmarks x
    WHERE x.user_id = b.user_id
      AND x.drug_ref = d.keeper_id::text
  );

-- What is left pointed at a discarded row is a bookmark that student already
-- holds against the survivor.
DELETE FROM public.drug_bookmarks b
USING dup_drug d
WHERE b.drug_ref = d.loser_id::text;

-- Same for brands: move the ones the survivor does not already carry.
UPDATE public.drug_brands b
SET drug_id = d.keeper_id
FROM dup_drug d
WHERE b.drug_id = d.loser_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.drug_brands x
    WHERE x.drug_id = d.keeper_id
      AND lower(btrim(x.brand)) = lower(btrim(b.brand))
  );

DELETE FROM public.drug_brands b
USING dup_drug d
WHERE b.drug_id = d.loser_id;

DELETE FROM public.drugs g
USING dup_drug d
WHERE g.id = d.loser_id;

-- 2. Shelf descriptions that are not brand names ----------------------------
-- Scoped to the medicine as well as the text, so a genuine brand that happens
-- to share one of these words somewhere else is untouched.

DELETE FROM public.drug_brands b
USING public.drugs d
WHERE b.drug_id = d.id
  AND (
       (lower(btrim(d.name)) = 'acetaminophen'
        AND lower(btrim(b.brand)) IN ('pain reliever', 'pain relief', 'pain relief extra strength'))
    OR (lower(btrim(d.name)) = 'clotrimazole'
        AND lower(btrim(b.brand)) = 'antifungal')
    OR (lower(btrim(d.name)) = 'lidocaine hcl'
        AND lower(btrim(b.brand)) IN ('aloe vera gel', 'sunburn relief gel'))
  );

-- 3. One molecule, one shelf ------------------------------------------------

UPDATE public.drugs
SET category = 'Anesthetic'
WHERE lower(btrim(name)) = 'lidocaine hcl'
  AND category = 'Cardiovascular';

COMMIT;

-- Verification -------------------------------------------------------------
-- Run before and after. Expected after: the first returns no rows, the second
-- returns no rows, the third returns 0, and the fourth is 889 rows of `drugs`
-- (896 less the seven duplicates).
--
--   SELECT lower(btrim(name)) AS name, count(*)
--   FROM public.drugs GROUP BY 1 HAVING count(*) > 1;
--
--   SELECT b.brand, d.name FROM public.drug_brands b JOIN public.drugs d
--   ON d.id = b.drug_id WHERE lower(btrim(b.brand)) IN
--   ('pain reliever','pain relief','pain relief extra strength','antifungal',
--    'aloe vera gel','sunburn relief gel');
--
--   -- The regex keeps the generated "catalog-..." bookmarks out of the count:
--   -- those legitimately name no row in `drugs` and always will not.
--   SELECT count(*) FROM public.drug_bookmarks b
--   LEFT JOIN public.drugs d ON d.id::text = b.drug_ref
--   WHERE d.id IS NULL AND b.drug_ref ~ '^[0-9a-fA-F-]{36}
--
--   SELECT count(*) FROM public.drugs;
;
--
--   SELECT count(*) FROM public.drugs;
