-- case_templates was created but never populated, so fetchTemplateCase always
-- returned null and every mode silently fell back to the fixed rows in `cases`.
-- The procedural generator - patient pools, allergy-aware drug selection,
-- distractor picking, per-user "already seen" tracking - was dead code in
-- production, and Rx prescriptions rendered blank age and gender because six of
-- the nine seeded Rx cases carry patient_info_json = NULL.
--
-- These templates give the generator something to work with. Each combines a
-- patient pool with a drug pool, so one template yields many distinct cases:
-- name, gender, age and the correct drug all vary per playthrough, and
-- allergy_variants steer the choice away from a drug the patient reacts to.
--
-- Idempotent: keyed on template_name so re-running refreshes rather than
-- duplicating.

DELETE FROM public.case_templates WHERE template_name IN (
  'Rx: Bacterial infection',
  'Rx: Pain and fever',
  'Rx: Allergic rhinitis',
  'Rx: Acid reflux',
  'Rx: Hypertension review',
  'Rx: Type 2 diabetes',
  'Rx: Asthma maintenance'
);

INSERT INTO public.case_templates (mode, difficulty, template_name, base_scenario, variation_rules) VALUES

-- Penicillin allergy is the classic community-pharmacy catch: the pool holds
-- both penicillins and macrolides, and the variant steers away from penicillin
-- when the generated patient reacts to it.
('rx', 'easy', 'Rx: Bacterial infection',
 '{"title":"{{patient}} - bacterial infection",
   "explanation":"Match the antibiotic to the infection and the patient. A documented penicillin allergy rules out amoxicillin and co-amoxiclav; a macrolide is the usual alternative.",
   "mentor_tip":"Check the allergy box on every prescription before you reach for the shelf.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Imran Shah","gender":"male","age_range":[24,46],"allergies":[]},
     {"name":"Sana Yousaf","gender":"female","age_range":[19,38],"allergies":["penicillin"]},
     {"name":"Robert Ellis","gender":"male","age_range":[52,71],"allergies":[]},
     {"name":"Fatima Noor","gender":"female","age_range":[28,44],"allergies":["penicillin"]},
     {"name":"Daniel Osei","gender":"male","age_range":[31,49],"allergies":[]}
   ],
   "drug_pool":["e9d66e9a-322c-46de-8f1f-63a71cf19e98","47aaeadd-0c3a-4696-93b8-8222d5ff913c","b6b63d6a-1089-48a2-9e08-4c8759f51c75","dac149db-77f7-4b18-9701-ca92416039a5","63b25406-d514-4961-8bfa-869b910a6ea8"],
   "dose_range":{"min":250,"max":500},
   "allergy_variants":[
     {"allergy":"penicillin",
      "avoid_names":["Amoxicillin","Co-amoxiclav"],
      "prefer_names":["Azithromycin","Clarithromycin","Doxycycline"]}
   ]}'::jsonb),

-- NSAID caution: asthma and peptic ulcer both push the choice to paracetamol.
('rx', 'easy', 'Rx: Pain and fever',
 '{"title":"{{patient}} - pain relief",
   "explanation":"Paracetamol is first line for simple pain and fever. NSAIDs are avoided where there is asthma, peptic ulcer disease, or an NSAID sensitivity.",
   "mentor_tip":"Ask about asthma and stomach ulcers before handing over an NSAID.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Ayesha Malik","gender":"female","age_range":[22,40],"allergies":[]},
     {"name":"Tom Sutcliffe","gender":"male","age_range":[30,55],"allergies":["nsaid"]},
     {"name":"Hina Raza","gender":"female","age_range":[26,45],"allergies":["asthma"]},
     {"name":"George Baptiste","gender":"male","age_range":[58,74],"allergies":["peptic ulcer"]},
     {"name":"Leila Haddad","gender":"female","age_range":[20,35],"allergies":[]}
   ],
   "drug_pool":["a032052c-4de5-40c9-97ac-8d639e6dcf56","99f48da4-4de1-4759-b8c2-e67db45fc43c","88b458ea-cabf-45cb-b4a5-3187a7dd7770","f0374752-5c4c-41d4-ae09-50d1d7df6d7f","25e7831e-53cd-4a2b-bb91-09f38c3ebe4a"],
   "dose_range":{"min":250,"max":1000},
   "allergy_variants":[
     {"allergy":"nsaid","avoid_names":["Ibuprofen","Naproxen","Diclofenac","Mefenamic Acid"],"prefer_names":["Paracetamol"]},
     {"allergy":"asthma","avoid_names":["Ibuprofen","Naproxen","Diclofenac","Mefenamic Acid"],"prefer_names":["Paracetamol"]},
     {"allergy":"peptic ulcer","avoid_names":["Ibuprofen","Naproxen","Diclofenac","Mefenamic Acid"],"prefer_names":["Paracetamol"]}
   ]}'::jsonb),

-- Sedating antihistamines are the trap here: fine at night, wrong for a driver.
('rx', 'easy', 'Rx: Allergic rhinitis',
 '{"title":"{{patient}} - allergic rhinitis",
   "explanation":"A non-sedating antihistamine is preferred, particularly for anyone who drives or operates machinery. First-generation agents cause marked drowsiness.",
   "mentor_tip":"Ask what the patient does for a living before selling a sedating antihistamine.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Zara Ahmed","gender":"female","age_range":[18,34],"allergies":[]},
     {"name":"Peter Nowak","gender":"male","age_range":[25,44],"allergies":["drowsiness"]},
     {"name":"Mariam Diallo","gender":"female","age_range":[21,39],"allergies":[]},
     {"name":"Callum Reid","gender":"male","age_range":[29,52],"allergies":["drowsiness"]}
   ],
   "drug_pool":["ddc788ae-1474-4e79-9dc5-c5733237bfea","58c6a3e0-7a61-4467-948b-7feb2d24daa4","22d67fa0-72fb-44dc-8c78-fff55cbb19a9","a6a9b8f0-ac47-44e2-987b-f37a02385f6d","997f7164-c2ab-40bc-be11-7202e0b315af"],
   "dose_range":{"min":10,"max":180},
   "allergy_variants":[
     {"allergy":"drowsiness",
      "avoid_names":["Chlorpheniramine","Diphenhydramine"],
      "prefer_names":["Loratadine","Cetirizine","Fexofenadine"]}
   ]}'::jsonb),

('rx', 'medium', 'Rx: Acid reflux',
 '{"title":"{{patient}} - reflux and dyspepsia",
   "explanation":"A proton pump inhibitor is first line for persistent reflux. Review the course length and the alarm features that require referral rather than repeat supply.",
   "mentor_tip":"Reflux lasting beyond a few weeks, or with difficulty swallowing, needs a doctor rather than another pack.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Nadia Kamal","gender":"female","age_range":[33,52],"allergies":[]},
     {"name":"Stephen Boyle","gender":"male","age_range":[41,63],"allergies":[]},
     {"name":"Priya Raman","gender":"female","age_range":[36,49],"allergies":[]},
     {"name":"Hassan Javed","gender":"male","age_range":[45,66],"allergies":[]}
   ],
   "drug_pool":["3d1f59c9-4b76-4640-b192-6fed31bdd159","83f8d6b3-bb59-4198-b324-d0ade7b2184c","049353d5-78d0-44bd-9305-c6f28e8983ed","88833e56-06ec-4281-bb4a-eb6edb47f55a"],
   "dose_range":{"min":10,"max":40},
   "allergy_variants":[]}'::jsonb),

-- Beta-blockers in asthma: the interaction most often missed on a repeat.
('rx', 'medium', 'Rx: Hypertension review',
 '{"title":"{{patient}} - blood pressure review",
   "explanation":"Beta-blockers can provoke bronchospasm and are avoided in asthma; a calcium channel blocker or ARB is the safer choice for that patient.",
   "mentor_tip":"A repeat prescription is still worth screening - comorbidities change what is safe.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Margaret Hollis","gender":"female","age_range":[58,76],"allergies":[]},
     {"name":"Bilal Anwar","gender":"male","age_range":[47,68],"allergies":["asthma"]},
     {"name":"Grace Adeyemi","gender":"female","age_range":[52,70],"allergies":[]},
     {"name":"Victor Lam","gender":"male","age_range":[55,72],"allergies":["asthma"]}
   ],
   "drug_pool":["71025d13-92e8-4ccf-8837-fab7fde0a098","2e59b318-aa69-4bab-8147-409d408b55a9","fab76106-f865-427f-906c-fcbd825429b3","bb2d8a47-af21-4f4d-9de5-2e8ac9d02040"],
   "dose_range":{"min":5,"max":100},
   "allergy_variants":[
     {"allergy":"asthma",
      "avoid_names":["Atenolol","Metoprolol"],
      "prefer_names":["Amlodipine","Losartan"]}
   ]}'::jsonb),

('rx', 'medium', 'Rx: Type 2 diabetes',
 '{"title":"{{patient}} - type 2 diabetes",
   "explanation":"Metformin remains first line unless contraindicated. Counselling covers taking it with food, and what to do about GI upset in the first weeks.",
   "mentor_tip":"Check renal function before starting or continuing metformin.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Rashid Mahmood","gender":"male","age_range":[44,65],"allergies":[]},
     {"name":"Elaine Cooper","gender":"female","age_range":[50,70],"allergies":[]},
     {"name":"Samuel Owusu","gender":"male","age_range":[38,58],"allergies":[]},
     {"name":"Nasreen Bibi","gender":"female","age_range":[47,67],"allergies":[]}
   ],
   "drug_pool":["c4c3e816-1f20-490b-b071-269da6f69622","c279f852-784a-4ff2-8f27-57a6b4261d5b","73f264dc-5e49-45ba-a7b6-60589fda161d"],
   "dose_range":{"min":50,"max":1000},
   "allergy_variants":[]}'::jsonb),

('rx', 'medium', 'Rx: Asthma maintenance',
 '{"title":"{{patient}} - asthma review",
   "explanation":"Reliever and preventer do different jobs. Rising reliever use is a marker of poor control and warrants review, not simply another inhaler.",
   "mentor_tip":"Ask how often the blue inhaler is being used - it is the best control question you have.",
   "correct_answer_json":{}}'::jsonb,
 '{"patient_pool":[
     {"name":"Owen Fletcher","gender":"male","age_range":[16,32],"allergies":[]},
     {"name":"Aisha Rahman","gender":"female","age_range":[20,38],"allergies":[]},
     {"name":"Marcus Lin","gender":"male","age_range":[24,41],"allergies":[]},
     {"name":"Chloe Bennett","gender":"female","age_range":[18,30],"allergies":[]}
   ],
   "drug_pool":["6d9f6337-47b9-4dca-b49d-bfd525fd81ac","42c28c22-ce7c-49e2-90d5-e33701c3b97c","987ce3c0-c51c-4d1e-b4d3-310b2c73475d","53d0d98d-3990-40c5-918a-ac3ec5ba2264"],
   "dose_range":{"min":100,"max":800},
   "allergy_variants":[]}'::jsonb);
