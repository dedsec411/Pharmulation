-- The four OTC medicines that existed only as generated catalogue entries.
--
-- Senna, bisacodyl, aluminium hydroxide and magnesium hydroxide are correct
-- answers in the OTC case bank, but had no row in `drugs` - so they carried the
-- synthetic placeholder data every generated entry shares ("GI upset,
-- Headache, Dizziness") rather than anything true about them, and could not
-- hold a real brand.
--
-- Every other medicine the game actually uses is already complete: all 30 Rx
-- template drugs and the other 7 OTC answers have real doses, indications,
-- side effects, contraindications and interactions. These four close that set.
--
-- Clinical content is standard practice and should still be signed off by a
-- pharmacist before showcase, as with the rest of the case bank.

INSERT INTO public.drugs
  (name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
SELECT v.* FROM (VALUES
  (
    'Senna', 'Sennosides', 'Stimulant Laxative', 'GI',
    'Adult: 7.5-15mg PO at night. Onset 8-12h, so dose before bed.',
    ARRAY['Constipation', 'Opioid-induced constipation'],
    ARRAY['Abdominal cramps', 'Diarrhoea', 'Electrolyte disturbance with prolonged use', 'Yellow-brown discolouration of urine'],
    ARRAY['Intestinal obstruction', 'Undiagnosed abdominal pain', 'Acute inflammatory bowel disease'],
    ARRAY['Diuretics: additive hypokalaemia', 'Digoxin: hypokalaemia increases toxicity risk'],
    false
  ),
  (
    'Bisacodyl', 'Bisacodyl', 'Stimulant Laxative', 'GI',
    'Adult: 5-10mg PO at night, or 10mg suppository PR in the morning.',
    ARRAY['Constipation', 'Bowel preparation'],
    ARRAY['Abdominal cramps', 'Diarrhoea', 'Rectal irritation with suppository'],
    ARRAY['Intestinal obstruction', 'Acute inflammatory bowel disease', 'Severe dehydration'],
    ARRAY['Antacids and milk: do not take within 1 hour of enteric-coated tablets', 'Diuretics: additive hypokalaemia'],
    false
  ),
  (
    'Aluminium Hydroxide', 'Aluminium Hydroxide', 'Antacid', 'GI',
    'Adult: 10-20mL PO after meals and at bedtime, up to four times daily.',
    ARRAY['Heartburn', 'Dyspepsia', 'Hyperphosphataemia'],
    ARRAY['Constipation', 'Hypophosphataemia with prolonged use'],
    ARRAY['Severe renal impairment', 'Hypophosphataemia'],
    ARRAY['Tetracyclines and quinolones: reduced absorption, separate doses by 2 hours', 'Iron salts: reduced absorption'],
    false
  ),
  (
    'Magnesium Hydroxide', 'Magnesium Hydroxide', 'Antacid / Osmotic Laxative', 'GI',
    'Antacid: 5-15mL PO as required. Laxative: 30-45mL PO.',
    ARRAY['Heartburn', 'Dyspepsia', 'Constipation'],
    ARRAY['Diarrhoea', 'Abdominal cramps', 'Hypermagnesaemia in renal impairment'],
    ARRAY['Severe renal impairment', 'Intestinal obstruction'],
    ARRAY['Tetracyclines and quinolones: reduced absorption, separate doses by 2 hours'],
    false
  )
) AS v(name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
WHERE NOT EXISTS (SELECT 1 FROM public.drugs d WHERE lower(d.name) = lower(v.name));

-- Single-ingredient brands only. Combination antacids such as Maalox contain
-- both salts, so attaching them to one ingredient would be misleading.
INSERT INTO public.drug_brands (drug_id, brand, market)
SELECT d.id, v.brand, v.market
FROM (VALUES
  ('Senna',               'Senokot',           'US'),
  ('Senna',               'Senokot',           'UK'),
  ('Bisacodyl',           'Dulcolax',          'US'),
  ('Bisacodyl',           'Dulcolax',          'UK'),
  ('Aluminium Hydroxide', 'Amphojel',          'US'),
  ('Magnesium Hydroxide', 'Milk of Magnesia',  'US'),
  ('Magnesium Hydroxide', 'Milk of Magnesia',  'UK')
) AS v(generic, brand, market)
JOIN public.drugs d ON lower(d.name) = lower(v.generic)
ON CONFLICT (drug_id, brand, market) DO NOTHING;
