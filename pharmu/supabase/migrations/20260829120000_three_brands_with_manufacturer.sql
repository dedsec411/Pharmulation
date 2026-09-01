-- Three brands per medicine, each with the company that makes it.
--
-- The brand step is where a community pharmacy learner does real work: a
-- prescription is written for a brand, the shelf holds brands, and knowing that
-- Risek is omeprazole is the actual skill. Until now most medicines carried a
-- single brand and none carried a manufacturer, so the step was a list of one.
--
-- Scope is the medicines gameplay actually reaches - the thirty drugs in the Rx
-- case templates and the eleven OTC case answers. Brands elsewhere in the
-- catalogue are left alone rather than invented.
--
-- Pairings mix international originator brands with generics common in local
-- practice, since the product is aimed at both markets. Brand ownership moves
-- with corporate deals more than clinical facts do - Panadol went to Haleon
-- when GSK spun out its consumer arm, Zantac followed the same route - so
-- these should be checked commercially before showcase, the same way the
-- clinical content needs a pharmacist.

-- Replace rather than accumulate, so "exactly three" actually holds.
DELETE FROM public.drug_brands
WHERE drug_id IN (
  SELECT id FROM public.drugs WHERE lower(name) IN (
    'paracetamol','ibuprofen','diclofenac','naproxen','mefenamic acid',
    'amoxicillin','co-amoxiclav','azithromycin','clarithromycin','doxycycline',
    'cetirizine','loratadine','fexofenadine','chlorpheniramine','diphenhydramine',
    'salbutamol','ipratropium','budesonide','montelukast',
    'omeprazole','pantoprazole','ranitidine','domperidone',
    'metformin','glimepiride','sitagliptin',
    'amlodipine','atenolol','metoprolol','losartan',
    'calcium carbonate','aluminium hydroxide','magnesium hydroxide',
    'senna','bisacodyl','clotrimazole cream','ors'
  )
);

INSERT INTO public.drug_brands (drug_id, brand, market, manufacturer)
SELECT d.id, v.brand, 'GLOBAL', v.company
FROM (VALUES
  -- Analgesics
  ('Paracetamol',        'Panadol',        'Haleon'),
  ('Paracetamol',        'Calpol',         'Haleon'),
  ('Paracetamol',        'Tylenol',        'Kenvue'),
  ('Ibuprofen',          'Brufen',         'Abbott'),
  ('Ibuprofen',          'Advil',          'Haleon'),
  ('Ibuprofen',          'Nurofen',        'Reckitt'),
  ('Diclofenac',         'Voltaren',       'Novartis'),
  ('Diclofenac',         'Cataflam',       'Novartis'),
  ('Diclofenac',         'Dicloran',       'Sami Pharmaceuticals'),
  ('Naproxen',           'Naprosyn',       'Atnahs Pharma'),
  ('Naproxen',           'Aleve',          'Bayer'),
  ('Naproxen',           'Synflex',        'Roche'),
  ('Mefenamic Acid',     'Ponstan',        'Pfizer'),
  ('Mefenamic Acid',     'Ponstel',        'Atnahs Pharma'),
  ('Mefenamic Acid',     'Mefnac',         'Sami Pharmaceuticals'),

  -- Antibiotics
  ('Amoxicillin',        'Amoxil',         'GSK'),
  ('Amoxicillin',        'Ospamox',        'Sandoz'),
  ('Amoxicillin',        'Moxatag',        'Pragma Pharmaceuticals'),
  ('Co-amoxiclav',       'Augmentin',      'GSK'),
  ('Co-amoxiclav',       'Amoclan',        'Hikma'),
  ('Co-amoxiclav',       'Calamox',        'Sami Pharmaceuticals'),
  ('Azithromycin',       'Zithromax',      'Pfizer'),
  ('Azithromycin',       'Zetro',          'Getz Pharma'),
  ('Azithromycin',       'Azomax',         'Sami Pharmaceuticals'),
  ('Clarithromycin',     'Klaricid',       'Abbott'),
  ('Clarithromycin',     'Biaxin',         'AbbVie'),
  ('Clarithromycin',     'Claritek',       'Getz Pharma'),
  ('Doxycycline',        'Vibramycin',     'Pfizer'),
  ('Doxycycline',        'Doryx',          'Mayne Pharma'),
  ('Doxycycline',        'Oracea',         'Galderma'),

  -- Antihistamines
  ('Cetirizine',         'Zyrtec',         'Kenvue'),
  ('Cetirizine',         'Reactine',       'Bayer'),
  ('Cetirizine',         'Alerid',         'Cipla'),
  ('Loratadine',         'Claritin',       'Bayer'),
  ('Loratadine',         'Lorano',         'Hexal'),
  ('Loratadine',         'Softin',         'Highnoon Laboratories'),
  ('Fexofenadine',       'Telfast',        'Sanofi'),
  ('Fexofenadine',       'Allegra',        'Sanofi'),
  ('Fexofenadine',       'Fexet',          'Getz Pharma'),
  ('Chlorpheniramine',   'Piriton',        'Haleon'),
  ('Chlorpheniramine',   'Chlor-Trimeton', 'Bayer'),
  ('Chlorpheniramine',   'Allercalm',      'Sami Pharmaceuticals'),
  ('Diphenhydramine',    'Benadryl',       'Kenvue'),
  ('Diphenhydramine',    'Nytol',          'Vitabiotics'),
  ('Diphenhydramine',    'ZzzQuil',        'Procter & Gamble'),

  -- Respiratory
  ('Salbutamol',         'Ventolin',       'GSK'),
  ('Salbutamol',         'ProAir',         'Teva'),
  ('Salbutamol',         'Asthalin',       'Cipla'),
  ('Ipratropium',        'Atrovent',       'Boehringer Ingelheim'),
  ('Ipratropium',        'Rinatec',        'Boehringer Ingelheim'),
  ('Ipratropium',        'Ipravent',       'Cipla'),
  ('Budesonide',         'Pulmicort',      'AstraZeneca'),
  ('Budesonide',         'Entocort',       'Tillotts Pharma'),
  ('Budesonide',         'Budecort',       'Cipla'),
  ('Montelukast',        'Singulair',      'Organon'),
  ('Montelukast',        'Montair',        'Cipla'),
  ('Montelukast',        'Montiget',       'Getz Pharma'),

  -- Gastrointestinal
  ('Omeprazole',         'Losec',          'AstraZeneca'),
  ('Omeprazole',         'Prilosec',       'AstraZeneca'),
  ('Omeprazole',         'Risek',          'Getz Pharma'),
  ('Pantoprazole',       'Protonix',       'Pfizer'),
  ('Pantoprazole',       'Controloc',      'Takeda'),
  ('Pantoprazole',       'Zoltan',         'Getz Pharma'),
  ('Ranitidine',         'Zantac',         'Haleon'),
  ('Ranitidine',         'Histac',         'Sun Pharma'),
  ('Ranitidine',         'Ranidin',        'Sami Pharmaceuticals'),
  ('Domperidone',        'Motilium',       'Janssen'),
  ('Domperidone',        'Motinorm',       'Sun Pharma'),
  ('Domperidone',        'Domel',          'Sami Pharmaceuticals'),

  -- Diabetes
  ('Metformin',          'Glucophage',     'Merck'),
  ('Metformin',          'Fortamet',       'Shionogi'),
  ('Metformin',          'Glumet',         'Getz Pharma'),
  ('Glimepiride',        'Amaryl',         'Sanofi'),
  ('Glimepiride',        'Glimy',          'Dr Reddys'),
  ('Glimepiride',        'Getryl',         'Getz Pharma'),
  ('Sitagliptin',        'Januvia',        'MSD'),
  ('Sitagliptin',        'Istavel',        'Sun Pharma'),
  ('Sitagliptin',        'Sitaget',        'Getz Pharma'),

  -- Cardiovascular
  ('Amlodipine',         'Norvasc',        'Pfizer'),
  ('Amlodipine',         'Amlodac',        'Zydus'),
  ('Amlodipine',         'Amlong',         'Micro Labs'),
  ('Atenolol',           'Tenormin',       'Atnahs Pharma'),
  ('Atenolol',           'Tenolol',        'Ipca Laboratories'),
  ('Atenolol',           'Blokium',        'Menarini'),
  ('Metoprolol',         'Lopressor',      'Novartis'),
  ('Metoprolol',         'Toprol-XL',      'AstraZeneca'),
  ('Metoprolol',         'Betaloc',        'Recordati'),
  ('Losartan',           'Cozaar',         'Organon'),
  ('Losartan',           'Losacar',        'Zydus'),
  ('Losartan',           'Repace',         'Sami Pharmaceuticals'),

  -- OTC counter lines
  ('Calcium Carbonate',  'Tums',           'Haleon'),
  ('Calcium Carbonate',  'Rennie',         'Bayer'),
  ('Calcium Carbonate',  'Caltrate',       'Haleon'),
  ('Aluminium Hydroxide','Amphojel',       'Pfizer'),
  ('Aluminium Hydroxide','Alu-Cap',        'Mylan'),
  ('Aluminium Hydroxide','AlternaGEL',     'Johnson & Johnson'),
  ('Magnesium Hydroxide','Milk of Magnesia','Bayer'),
  ('Magnesium Hydroxide','Mag-Ox',         'Blaine Pharmaceuticals'),
  ('Magnesium Hydroxide','Milpar',         'Sanofi'),
  ('Senna',              'Senokot',        'Reckitt'),
  ('Senna',              'Ex-Lax',         'Haleon'),
  ('Senna',              'Sennalax',       'Sami Pharmaceuticals'),
  ('Bisacodyl',          'Dulcolax',       'Sanofi'),
  ('Bisacodyl',          'Correctol',      'Bayer'),
  ('Bisacodyl',          'Fleet Bisacodyl','Fleet Laboratories'),
  ('Clotrimazole cream', 'Canesten',       'Bayer'),
  ('Clotrimazole cream', 'Lotrimin AF',    'Bayer'),
  ('Clotrimazole cream', 'Candid',         'Glenmark'),
  ('ORS',                'Dioralyte',      'Sanofi'),
  ('ORS',                'Pedialyte',      'Abbott'),
  ('ORS',                'Peditral',       'Sanofi')
) AS v(generic, brand, company)
JOIN public.drugs d ON lower(d.name) = lower(v.generic)
ON CONFLICT (drug_id, brand, market)
DO UPDATE SET manufacturer = EXCLUDED.manufacturer;
