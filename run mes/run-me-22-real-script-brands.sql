-- Brands read off a real prescription that the shelf could not name.
--
-- A Lahore script for "Breast Ca / HTN" was scanned and came back with three
-- medicines confidently named. Two of them were wrong, and one was wrong by an
-- entire drug class:
--
--   written            app said        actually is
--   Dulan 30           Duloxetine      Duloxetine      (right, but a guess)
--   Caragin 50         Diclofenac      Lamotrigine
--   Lamant/Lamnet 50   Diclofenac      Lamotrigine
--
-- Item three is written "Caragin 50 / Lamnet 50" - a prescriber offering two
-- brands of the same molecule, which is ordinary practice and reads as
-- gibberish to a catalogue that knows neither. With no brand to match, the
-- model's alternative reading won and an anticonvulsant was dispensed to the
-- trainee as an analgesic. The diagnosis line on that same page says "head
-- symptom / spasm", which is exactly what lamotrigine is doing there.
--
-- Each of these was checked against Pakistani drug listings rather than
-- inferred:
--   Dulan      duloxetine,  Hilton Pharma
--   Caragin    lamotrigine, Caraway Pharmaceuticals
--   Lamnet     lamotrigine, Searle Pakistan
--   Ramipace   ramipril,    PharmEvo
--
-- The first medicine on that script - read as "Ramadrin" or "Ramacorin" - is
-- deliberately NOT here. No Pakistani listing matches either spelling, so
-- either the reading is wrong or the brand is one I could not confirm, and
-- guessing it is the exact failure this migration exists to correct. It stays
-- an assumption in the app, and the preview says so.
--
-- Needs a pharmacist against the DRAP register before it is taught from, like
-- the rest of the catalogue.

INSERT INTO public.drug_brands (drug_id, brand, market, manufacturer)
SELECT d.id, v.brand, 'PK', v.manufacturer
FROM (VALUES
  ('Dulan',    'Duloxetine',  'Hilton Pharma'),
  ('Caragin',  'Lamotrigine', 'Caraway Pharmaceuticals'),
  ('Lamnet',   'Lamotrigine', 'Searle Pakistan'),
  ('Ramipace', 'Ramipril',    'PharmEvo')
) AS v(brand, generic, manufacturer)
JOIN public.drugs d ON lower(d.name) = lower(v.generic)
ON CONFLICT (drug_id, brand, market) DO NOTHING;
