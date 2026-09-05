-- Medicines a real prescription lands on that the shelf did not stock.
--
-- Found while chasing why Prescription Lens gives up on some scripts. The
-- reading was fine; the build was not. buildLensCase can only keep a medicine
-- it can resolve against `drugs`, so anything not on the shelf is dropped, and
-- a script where nothing resolves is refused outright with "none of those
-- medicines are in the training catalogue yet".
--
-- Checking a list of routinely-prescribed medicines against the live 881 rows
-- turned up these gaps. Most are ordinary in South Asian and UK practice, and
-- several are the second drug on a diabetes or hypertension script - exactly
-- the prescriptions this feature is pointed at:
--
--   Gliclazide, Glibenclamide  the two sulfonylureas in daily use
--   Empagliflozin, Vildagliptin  the SGLT2 and DPP-4 on modern T2DM scripts
--   Indapamide, Ivabradine  routine cardiovascular
--   Itopride, Drotaverine, Hyoscine Butylbromide, Racecadotril  routine GI
--   Piperacillin-Tazobactam  the workhorse inpatient IV antibiotic
--   Desloratadine  see below
--
-- Desloratadine is a correctness fix as much as a gap. With no row of its own,
-- the resolver's substring pass matched it to Loratadine - a different
-- medicine - so a script saying desloratadine dispensed loratadine. The
-- resolver now requires a word boundary, and this row gives it the right
-- answer to find.
--
-- Clinical content here is standard practice and carries needs_review = true,
-- like the rest of the catalogue. It wants a pharmacist's sign-off before it
-- is taught from.

INSERT INTO public.drugs
  (name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
SELECT v.* FROM (VALUES
  (
    'Gliclazide', 'Gliclazide', 'Sulfonylurea', 'Antidiabetic',
    'Adult: 40-80mg PO once daily with breakfast, titrated to max 320mg daily in divided doses. Modified release 30-120mg PO once daily.',
    ARRAY['Type 2 diabetes mellitus'],
    ARRAY['Hypoglycaemia', 'Weight gain', 'GI upset', 'Rash', 'Rarely blood dyscrasias'],
    ARRAY['Type 1 diabetes', 'Diabetic ketoacidosis', 'Severe renal or hepatic impairment', 'Breastfeeding'],
    ARRAY['Alcohol: increased hypoglycaemia risk', 'Beta-blockers: mask hypoglycaemic warning signs', 'Fluconazole and miconazole: raise gliclazide levels', 'NSAIDs and sulfonamides: potentiate hypoglycaemia'],
    true
  ),
  (
    'Glibenclamide', 'Glibenclamide', 'Sulfonylurea', 'Antidiabetic',
    'Adult: 5mg PO once daily with breakfast, titrated to max 15mg daily. Long acting, so avoid in the elderly and in renal impairment.',
    ARRAY['Type 2 diabetes mellitus'],
    ARRAY['Hypoglycaemia, often prolonged', 'Weight gain', 'GI upset', 'Cholestatic jaundice'],
    ARRAY['Type 1 diabetes', 'Diabetic ketoacidosis', 'Renal impairment', 'Hepatic impairment', 'Porphyria'],
    ARRAY['Alcohol: increased hypoglycaemia risk', 'Beta-blockers: mask hypoglycaemic warning signs', 'Ciprofloxacin: increased hypoglycaemia risk', 'Rifampicin: reduced effect'],
    true
  ),
  (
    'Empagliflozin', 'Empagliflozin', 'SGLT2 Inhibitor', 'Antidiabetic',
    'Adult: 10mg PO once daily in the morning, increased to 25mg once daily if required and tolerated.',
    ARRAY['Type 2 diabetes mellitus', 'Chronic heart failure', 'Chronic kidney disease'],
    ARRAY['Genital mycotic infection', 'Urinary tract infection', 'Volume depletion and dizziness', 'Euglycaemic diabetic ketoacidosis'],
    ARRAY['Diabetic ketoacidosis', 'Severe renal impairment for glycaemic benefit', 'Known hypersensitivity'],
    ARRAY['Diuretics: additive volume depletion', 'Insulin and sulfonylureas: increased hypoglycaemia, consider dose reduction'],
    true
  ),
  (
    'Vildagliptin', 'Vildagliptin', 'DPP-4 Inhibitor', 'Antidiabetic',
    'Adult: 50mg PO twice daily. 50mg once daily when combined with a sulfonylurea. Check liver function before starting and periodically.',
    ARRAY['Type 2 diabetes mellitus'],
    ARRAY['Headache', 'Dizziness', 'Nasopharyngitis', 'Peripheral oedema', 'Rarely hepatic dysfunction', 'Rarely pancreatitis'],
    ARRAY['Hepatic impairment', 'Known hypersensitivity'],
    ARRAY['Sulfonylureas: increased hypoglycaemia risk', 'ACE inhibitors: increased risk of angioedema'],
    true
  ),
  (
    'Indapamide', 'Indapamide', 'Thiazide-like Diuretic', 'Cardiovascular',
    'Adult: 2.5mg PO once daily in the morning. Modified release 1.5mg PO once daily.',
    ARRAY['Hypertension', 'Oedema in heart failure'],
    ARRAY['Hypokalaemia', 'Hyponatraemia', 'Hyperuricaemia and gout', 'Dizziness', 'Photosensitivity'],
    ARRAY['Severe renal impairment', 'Severe hepatic impairment', 'Hypokalaemia', 'Sulfonamide hypersensitivity'],
    ARRAY['Lithium: reduced clearance and toxicity', 'Digoxin: hypokalaemia increases toxicity risk', 'QT-prolonging drugs: additive risk with hypokalaemia', 'NSAIDs: reduced antihypertensive effect'],
    true
  ),
  (
    'Ivabradine', 'Ivabradine', 'If Channel Inhibitor', 'Cardiovascular',
    'Adult: 5mg PO twice daily with food, adjusted after two weeks to 7.5mg twice daily. Start at 2.5mg twice daily if 75 years or older.',
    ARRAY['Chronic heart failure with reduced ejection fraction', 'Chronic stable angina where beta-blockers are unsuitable'],
    ARRAY['Phosphenes, transient luminous visual phenomena', 'Bradycardia', 'Atrial fibrillation', 'Headache'],
    ARRAY['Resting heart rate below 70 bpm before treatment', 'Sick sinus syndrome or heart block', 'Cardiogenic shock', 'Severe hypotension', 'Use with strong CYP3A4 inhibitors'],
    ARRAY['Diltiazem and verapamil: additive bradycardia, avoid', 'Clarithromycin and azole antifungals: raise ivabradine levels', 'Grapefruit juice: raises exposure'],
    true
  ),
  (
    'Itopride', 'Itopride', 'Prokinetic', 'GI',
    'Adult: 50mg PO three times daily before meals.',
    ARRAY['Functional dyspepsia', 'Non-ulcer dyspepsia with bloating and early satiety'],
    ARRAY['Diarrhoea', 'Abdominal pain', 'Headache', 'Rash', 'Raised prolactin'],
    ARRAY['Gastrointestinal haemorrhage', 'Mechanical obstruction or perforation', 'Known hypersensitivity'],
    ARRAY['Anticholinergics: reduced prokinetic effect', 'Antipsychotics: additive extrapyramidal risk'],
    true
  ),
  (
    'Drotaverine', 'Drotaverine', 'Antispasmodic', 'GI',
    'Adult: 40-80mg PO three times daily. 40-80mg IM or slow IV for acute colic.',
    ARRAY['Smooth muscle spasm', 'Biliary and renal colic', 'Dysmenorrhoea', 'Irritable bowel spasm'],
    ARRAY['Dizziness', 'Hypotension', 'Palpitations', 'Nausea', 'Headache'],
    ARRAY['Severe hepatic impairment', 'Severe renal impairment', 'Severe cardiac failure', 'Atrioventricular block'],
    ARRAY['Levodopa: reduced antiparkinsonian effect', 'Antihypertensives: additive hypotension'],
    true
  ),
  (
    'Hyoscine Butylbromide', 'Hyoscine Butylbromide', 'Antimuscarinic Antispasmodic', 'GI',
    'Adult: 20mg PO four times daily. 20mg IM or slow IV for acute spasm, repeated after 30 minutes if needed.',
    ARRAY['Abdominal cramp and colic', 'Irritable bowel syndrome', 'Renal and biliary colic'],
    ARRAY['Dry mouth', 'Blurred vision', 'Tachycardia', 'Constipation', 'Urinary retention'],
    ARRAY['Myasthenia gravis', 'Megacolon', 'Narrow-angle glaucoma', 'Paralytic ileus', 'Prostatic enlargement with retention'],
    ARRAY['Other antimuscarinics: additive effects', 'Metoclopramide and domperidone: mutually antagonistic', 'Tricyclic antidepressants: additive antimuscarinic load'],
    true
  ),
  (
    'Racecadotril', 'Racecadotril', 'Antisecretory Antidiarrhoeal', 'GI',
    'Adult: 100mg PO three times daily with meals, for no more than 7 days. An adjunct to oral rehydration, never a replacement for it.',
    ARRAY['Acute watery diarrhoea, alongside oral rehydration'],
    ARRAY['Headache', 'Rash', 'Rarely angioedema'],
    ARRAY['Known hypersensitivity', 'Bloody or febrile diarrhoea where antibiotics are indicated'],
    ARRAY['ACE inhibitors: increased risk of angioedema'],
    true
  ),
  (
    'Piperacillin-Tazobactam', 'Piperacillin with Tazobactam', 'Beta-lactam with Beta-lactamase Inhibitor', 'Antibiotic',
    'Adult: 4.5g IV every 8 hours, increased to every 6 hours in severe infection. Dose reduced in renal impairment.',
    ARRAY['Hospital acquired pneumonia', 'Complicated intra-abdominal infection', 'Neutropenic sepsis', 'Complicated skin and soft tissue infection'],
    ARRAY['Diarrhoea including Clostridioides difficile', 'Rash', 'Thrombocytopenia', 'Raised liver enzymes', 'Hypokalaemia'],
    ARRAY['Penicillin or beta-lactam hypersensitivity', 'History of severe reaction to a cephalosporin'],
    ARRAY['Methotrexate: reduced clearance and toxicity', 'Vancomycin: increased risk of acute kidney injury', 'Probenecid: prolonged levels', 'Aminoglycosides: inactivation if mixed in the same line'],
    true
  ),
  (
    'Desloratadine', 'Desloratadine', 'Second-generation Antihistamine', 'Antihistamine',
    'Adult: 5mg PO once daily.',
    ARRAY['Allergic rhinitis', 'Chronic urticaria'],
    ARRAY['Headache', 'Dry mouth', 'Fatigue', 'Rarely tachycardia'],
    ARRAY['Known hypersensitivity to desloratadine or loratadine'],
    ARRAY['Alcohol and CNS depressants: additive sedation in susceptible people', 'Ketoconazole and erythromycin: raised levels without clinical sedation in trials'],
    true
  )
) AS v(name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
WHERE NOT EXISTS (SELECT 1 FROM public.drugs d WHERE lower(d.name) = lower(v.name));

-- Brands, so these behave like the rest of the shelf in the branding step.
INSERT INTO public.drug_brands (drug_id, brand, market, manufacturer)
SELECT d.id, v.brand, v.market, v.manufacturer
FROM (VALUES
  ('Gliclazide',              'Diamicron',   'UK', 'Servier'),
  ('Glibenclamide',           'Daonil',      'UK', 'Sanofi'),
  ('Empagliflozin',           'Jardiance',   'UK', 'Boehringer Ingelheim'),
  ('Empagliflozin',           'Jardiance',   'US', 'Boehringer Ingelheim'),
  ('Vildagliptin',            'Galvus',      'UK', 'Novartis'),
  ('Indapamide',              'Natrilix',    'UK', 'Servier'),
  ('Ivabradine',              'Procoralan',  'UK', 'Servier'),
  ('Ivabradine',              'Corlanor',    'US', 'Amgen'),
  ('Hyoscine Butylbromide',   'Buscopan',    'UK', 'Sanofi'),
  ('Racecadotril',            'Hidrasec',    'UK', 'Bioprojet'),
  ('Piperacillin-Tazobactam', 'Tazocin',     'UK', 'Pfizer'),
  ('Piperacillin-Tazobactam', 'Zosyn',       'US', 'Pfizer'),
  ('Desloratadine',           'Neoclarityn', 'UK', 'Organon'),
  ('Desloratadine',           'Clarinex',    'US', 'Organon')
) AS v(generic, brand, market, manufacturer)
JOIN public.drugs d ON lower(d.name) = lower(v.generic)
ON CONFLICT (drug_id, brand, market) DO NOTHING;
