-- The brand names a Pakistani prescriber actually writes.
--
-- Five real scripts from Karachi, Lahore and Peshawar settled where
-- Prescription Lens was failing, and it was not the handwriting. Nineteen
-- medicine names taken off those pages - Airtal, Gabica, Ceporex, Xanax,
-- Flagyl, Risek and the rest - produced zero matches against `drugs`. Doctors
-- write the brand. The catalogue only knew generics, and drug_brands held only
-- US, UK and GLOBAL rows, so a perfectly-read script still came back "none of
-- those medicines are in the training catalogue yet".
--
-- No amount of better reading fixes that. It is a formulary gap, so this fills
-- it: the brands in common use in Pakistani practice, mapped to the generic
-- already on the shelf, under a new PK market.
--
-- Deliberately the well-known core rather than the whole register. DRAP lists
-- dozens of registered brands per molecule - aceclofenac alone runs past fifty
-- - and importing all of them is a data job with a proper source, not a
-- hand-written migration. These are the ones that actually turn up on scripts.
--
-- NEEDS PHARMACIST SIGN-OFF before it is taught from, like the rest of the
-- catalogue. A wrong brand-to-generic mapping here dispenses the wrong
-- medicine, so this list wants checking against the DRAP register by someone
-- qualified rather than trusted because it is written down.

-- ---------------------------------------------------------------------------
-- 1. Three generics these brands need, which the shelf did not stock
-- ---------------------------------------------------------------------------

INSERT INTO public.drugs
  (name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
SELECT v.* FROM (VALUES
  (
    'Aceclofenac', 'Aceclofenac', 'NSAID', 'Analgesic',
    'Adult: 100mg PO twice daily with or after food. Use the lowest effective dose for the shortest time.',
    ARRAY['Osteoarthritis', 'Rheumatoid arthritis', 'Ankylosing spondylitis', 'Acute musculoskeletal and back pain', 'Dental pain'],
    ARRAY['Dyspepsia', 'Abdominal pain', 'Nausea', 'Diarrhoea', 'Dizziness', 'Raised liver enzymes'],
    ARRAY['Active gastrointestinal ulceration or bleeding', 'Severe heart failure', 'Severe renal or hepatic impairment', 'Third trimester of pregnancy', 'Hypersensitivity to aspirin or other NSAIDs'],
    ARRAY['Anticoagulants: increased bleeding risk', 'Other NSAIDs including aspirin: additive GI toxicity', 'ACE inhibitors and diuretics: reduced renal function', 'Lithium and methotrexate: reduced clearance', 'SSRIs: increased GI bleeding risk'],
    true
  ),
  (
    'Cephradine', 'Cephradine', 'First-generation Cephalosporin', 'Antibiotic',
    'Adult: 250-500mg PO four times daily, or 500mg-1g twice daily. Up to 1g four times daily in severe infection.',
    ARRAY['Skin and soft tissue infection', 'Upper and lower respiratory tract infection', 'Urinary tract infection', 'Otitis media'],
    ARRAY['Diarrhoea', 'Nausea', 'Rash', 'Vaginal candidiasis', 'Rarely Clostridioides difficile colitis'],
    ARRAY['Cephalosporin hypersensitivity', 'Caution with a history of severe penicillin allergy'],
    ARRAY['Probenecid: prolonged levels', 'Aminoglycosides: additive nephrotoxicity', 'Warfarin: enhanced anticoagulant effect'],
    true
  ),
  (
    'Bromazepam', 'Bromazepam', 'Benzodiazepine', 'Anxiolytic',
    'Adult: 1.5-3mg PO three times daily. Short-term use only, ideally under 4 weeks including tapering.',
    ARRAY['Short-term relief of severe anxiety'],
    ARRAY['Drowsiness', 'Ataxia', 'Confusion', 'Anterograde amnesia', 'Dependence and withdrawal on stopping'],
    ARRAY['Myasthenia gravis', 'Severe respiratory insufficiency', 'Sleep apnoea syndrome', 'Severe hepatic impairment', 'Acute narrow-angle glaucoma'],
    ARRAY['Alcohol and CNS depressants: additive sedation', 'Opioids: risk of profound sedation and respiratory depression', 'CYP3A4 inhibitors: raised levels'],
    true
  )
) AS v(name, generic_name, drug_class, category, dosage, indications, side_effects, contraindications, interactions, needs_review)
WHERE NOT EXISTS (SELECT 1 FROM public.drugs d WHERE lower(d.name) = lower(v.name));

-- ---------------------------------------------------------------------------
-- 2. The brands themselves
--
-- market = 'PK' sits alongside the existing US, UK and GLOBAL rows rather than
-- replacing them: the same molecule is Lasix in one market and something else
-- in another, and the branding step should teach whichever market the learner
-- is training for.
-- ---------------------------------------------------------------------------

INSERT INTO public.drug_brands (drug_id, brand, market, manufacturer)
SELECT d.id, v.brand, 'PK', v.manufacturer
FROM (VALUES
  ('Panadol', 'Paracetamol', 'GSK'),
  ('Calpol', 'Paracetamol', 'GSK'),
  ('Provas', 'Paracetamol', 'Martin Dow'),
  ('Brufen', 'Ibuprofen', 'Abbott'),
  ('Ibucon', 'Ibuprofen', 'Hilton Pharma'),
  ('Ponstan', 'Mefenamic Acid', 'Pfizer'),
  ('Mefnac', 'Mefenamic Acid', 'Sami'),
  ('Voltral', 'Diclofenac', 'Novartis'),
  ('Dicloran', 'Diclofenac', 'Sami'),
  ('Synflex', 'Naproxen', 'Searle'),
  ('Airtal', 'Aceclofenac', 'Highnoon'),
  ('Disprin', 'Aspirin', 'Reckitt Benckiser'),
  ('Loprin', 'Aspirin', 'Highnoon'),
  ('Tramal', 'Tramadol', 'Searle'),
  ('Celebrex', 'Celecoxib', 'Pfizer'),
  ('Risek', 'Omeprazole', 'Getz Pharma'),
  ('Losec', 'Omeprazole', 'AstraZeneca'),
  ('Nexum', 'Esomeprazole', 'Getz Pharma'),
  ('Zoltar', 'Esomeprazole', 'Hilton Pharma'),
  ('Pantop', 'Pantoprazole', 'Sami'),
  ('Motilium', 'Domperidone', 'Janssen'),
  ('Gravinate', 'Dimenhydrinate', 'Searle'),
  ('Buscopan', 'Hyoscine Butylbromide', 'Sanofi'),
  ('Flagyl', 'Metronidazole', 'Sanofi'),
  ('Zofran', 'Ondansetron', 'GSK'),
  ('Onset', 'Ondansetron', 'Hilton Pharma'),
  ('Duphalac', 'Lactulose', 'Abbott'),
  ('Augmentin', 'Co-amoxiclav', 'GSK'),
  ('Amoxil', 'Amoxicillin', 'GSK'),
  ('Velosef', 'Cephradine', 'Bristol-Myers Squibb'),
  ('Ceporex', 'Cephradine', 'GSK'),
  ('Cefspan', 'Cefixime', 'Barrett Hodgson'),
  ('Zinacef', 'Cefuroxime', 'GSK'),
  ('Rocephin', 'Ceftriaxone', 'Roche'),
  ('Ciproxin', 'Ciprofloxacin', 'Bayer'),
  ('Novidat', 'Ciprofloxacin', 'Sami'),
  ('Leflox', 'Levofloxacin', 'Getz Pharma'),
  ('Zithromax', 'Azithromycin', 'Pfizer'),
  ('Azomax', 'Azithromycin', 'Getz Pharma'),
  ('Klaricid', 'Clarithromycin', 'Abbott'),
  ('Vibramycin', 'Doxycycline', 'Pfizer'),
  ('Diflucan', 'Fluconazole', 'Pfizer'),
  ('Tazocin', 'Piperacillin-Tazobactam', 'Pfizer'),
  ('Vancocin', 'Vancomycin', 'Amoun'),
  ('Norvasc', 'Amlodipine', 'Pfizer'),
  ('Amlogen', 'Amlodipine', 'Genix'),
  ('Tenormin', 'Atenolol', 'AstraZeneca'),
  ('Concor', 'Bisoprolol', 'Merck'),
  ('Dilatrend', 'Carvedilol', 'Roche'),
  ('Zestril', 'Lisinopril', 'AstraZeneca'),
  ('Tritace', 'Ramipril', 'Sanofi'),
  ('Cozaar', 'Losartan', 'MSD'),
  ('Micardis', 'Telmisartan', 'Boehringer Ingelheim'),
  ('Diovan', 'Valsartan', 'Novartis'),
  ('Lasix', 'Furosemide', 'Sanofi'),
  ('Aldactone', 'Spironolactone', 'Pfizer'),
  ('Lipitor', 'Atorvastatin', 'Pfizer'),
  ('Lipiget', 'Atorvastatin', 'Getz Pharma'),
  ('Crestor', 'Rosuvastatin', 'AstraZeneca'),
  ('Plavix', 'Clopidogrel', 'Sanofi'),
  ('Clopid', 'Clopidogrel', 'Hilton Pharma'),
  ('Clexane', 'Enoxaparin', 'Sanofi'),
  ('Glucophage', 'Metformin', 'Merck'),
  ('Neophage', 'Metformin', 'Sami'),
  ('Amaryl', 'Glimepiride', 'Sanofi'),
  ('Getryl', 'Glimepiride', 'Getz Pharma'),
  ('Diamicron', 'Gliclazide', 'Servier'),
  ('Daonil', 'Glibenclamide', 'Sanofi'),
  ('Januvia', 'Sitagliptin', 'MSD'),
  ('Jardiance', 'Empagliflozin', 'Boehringer Ingelheim'),
  ('Galvus', 'Vildagliptin', 'Novartis'),
  ('Thyronorm', 'Levothyroxine', 'Abbott'),
  ('Deltacortril', 'Prednisolone', 'Pfizer'),
  ('Decadron', 'Dexamethasone', 'MSD'),
  ('Ventolin', 'Salbutamol', 'GSK'),
  ('Singulair', 'Montelukast', 'MSD'),
  ('Montiget', 'Montelukast', 'Getz Pharma'),
  ('Softin', 'Cetirizine', 'Hilton Pharma'),
  ('Zyrtec', 'Cetirizine', 'UCB'),
  ('Telfast', 'Fexofenadine', 'Sanofi'),
  ('Rigix', 'Cetirizine', 'Sami'),
  ('Xanax', 'Alprazolam', 'Pfizer'),
  ('Lexotanil', 'Bromazepam', 'Roche'),
  ('Rivotril', 'Clonazepam', 'Roche'),
  ('Zoloft', 'Sertraline', 'Pfizer'),
  ('Cipralex', 'Escitalopram', 'Lundbeck'),
  ('Gabica', 'Pregabalin', 'Getz Pharma'),
  ('Lyrica', 'Pregabalin', 'Pfizer'),
  ('Neurontin', 'Gabapentin', 'Pfizer'),
  ('Tegral', 'Carbamazepine', 'Novartis'),
  ('Epival', 'Valproate', 'Abbott'),
  ('Risperdal', 'Risperidone', 'Janssen'),
  ('Zyprexa', 'Olanzapine', 'Eli Lilly')
) AS v(brand, generic, manufacturer)
JOIN public.drugs d ON lower(d.name) = lower(v.generic)
ON CONFLICT (drug_id, brand, market) DO NOTHING;
