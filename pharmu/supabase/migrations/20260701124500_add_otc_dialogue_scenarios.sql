INSERT INTO public.cases (
  id,
  mode,
  difficulty,
  title,
  prescription_image_url,
  electronic_prescription_json,
  drugs_required,
  patient_info_json,
  correct_answer_json,
  explanation,
  mentor_tip,
  created_at,
  formula_json,
  shipment_json,
  requires_compounding,
  compound_type,
  compound_data
) VALUES (
  '7edab79d-3920-4b28-8d31-7f3a5d86e001',
  'otc',
  'easy',
  'Case Scenario 1: Allergy (Allergic Rhinitis)',
  NULL,
  NULL,
  ARRAY['Cetirizine', 'Loratadine']::text[],
  $json${
    "age": 26,
    "name": "Allergy patient",
    "gender": "unspecified",
    "symptoms": "Sneezing, runny nose, itchy watery eyes for three days",
    "allergies": "none",
    "current_meds": "none",
    "medical_conditions": "none"
  }$json$::jsonb,
  $json${
    "scenario_setting": "A patient visits a community pharmacy complaining of allergy symptoms.",
    "complaint": "I've been sneezing a lot, my nose is runny, and my eyes are itchy and watery.",
    "questions": [
      {
        "q": "Confirm who needs the medicine.",
        "choices": [
          "Good morning. Who is the medicine for?",
          "Which antibiotic do you want?",
          "Do you want a cough syrup?",
          "Should I give you eye drops only?"
        ],
        "correct": 0,
        "patient_response": "It's for me."
      },
      {
        "q": "Ask about symptoms.",
        "choices": [
          "What symptoms are you having?",
          "Are you taking blood pressure medicine?",
          "Do you have stomach pain?",
          "Which brand do you usually buy?"
        ],
        "correct": 0,
        "patient_response": "I've been sneezing a lot, my nose is runny, and my eyes are itchy and watery."
      },
      {
        "q": "Ask about duration.",
        "choices": [
          "How long have you had these symptoms?",
          "Do you want tablets or capsules?",
          "Did someone else tell you to take this?",
          "Are you here to refill a prescription?"
        ],
        "correct": 0,
        "patient_response": "They started about three days ago."
      },
      {
        "q": "Ask about prior treatment.",
        "choices": [
          "Have you taken anything for it already?",
          "Do you want something very strong?",
          "Can I give you antibiotics?",
          "Do you need medicine for fever only?"
        ],
        "correct": 0,
        "patient_response": "No, I haven't taken any medicine yet."
      },
      {
        "q": "Screen medicines and conditions.",
        "choices": [
          "Are you taking any other medicines or do you have any medical conditions?",
          "Do you prefer a small tablet?",
          "Do you want to buy two boxes?",
          "Should I give this without asking anything else?"
        ],
        "correct": 0,
        "patient_response": "No, I'm healthy and I'm not taking any medicines."
      }
    ],
    "correct_drug": "Cetirizine 10mg",
    "correct_drugs": ["Cetirizine 10mg", "Loratadine 10mg"],
    "drug_options": ["Cetirizine 10mg", "Loratadine 10mg", "Amoxicillin 500mg", "Chlorpheniramine 4mg"],
    "correct_dose": "Cetirizine 10mg or loratadine 10mg once daily",
    "dose_options": [
      "Cetirizine 10mg or loratadine 10mg once daily",
      "Cetirizine 10mg four times daily",
      "Amoxicillin 500mg three times daily",
      "Chlorpheniramine 4mg every hour"
    ],
    "correct_quantity": 1,
    "correct_advice": "Use once daily, avoid driving if drowsy, and see a doctor if symptoms worsen or do not improve.",
    "advice_options": [
      "Use once daily, avoid driving if drowsy, and see a doctor if symptoms worsen or do not improve.",
      "Take extra tablets whenever sneezing starts.",
      "Start antibiotics if the nose keeps running.",
      "Use it only with alcohol to help sleep."
    ]
  }$json$::jsonb,
  'Symptoms fit uncomplicated allergic rhinitis. A non-drowsy antihistamine such as cetirizine or loratadine is appropriate after screening medicines and conditions.',
  'OTC allergy counseling should confirm who it is for, symptoms, duration, prior treatment, current medicines, and warning signs.',
  now(),
  NULL,
  NULL,
  false,
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  difficulty = EXCLUDED.difficulty,
  title = EXCLUDED.title,
  prescription_image_url = EXCLUDED.prescription_image_url,
  electronic_prescription_json = EXCLUDED.electronic_prescription_json,
  drugs_required = EXCLUDED.drugs_required,
  patient_info_json = EXCLUDED.patient_info_json,
  correct_answer_json = EXCLUDED.correct_answer_json,
  explanation = EXCLUDED.explanation,
  mentor_tip = EXCLUDED.mentor_tip,
  created_at = EXCLUDED.created_at,
  formula_json = EXCLUDED.formula_json,
  shipment_json = EXCLUDED.shipment_json,
  requires_compounding = EXCLUDED.requires_compounding,
  compound_type = EXCLUDED.compound_type,
  compound_data = EXCLUDED.compound_data;

INSERT INTO public.cases (
  id,
  mode,
  difficulty,
  title,
  prescription_image_url,
  electronic_prescription_json,
  drugs_required,
  patient_info_json,
  correct_answer_json,
  explanation,
  mentor_tip,
  created_at,
  formula_json,
  shipment_json,
  requires_compounding,
  compound_type,
  compound_data
) VALUES (
  '7edab79d-3920-4b28-8d31-7f3a5d86e002',
  'otc',
  'easy',
  'Case Scenario 2: Pain (Headache - OTC Analgesics)',
  NULL,
  NULL,
  ARRAY['Paracetamol']::text[],
  $json${
    "age": 30,
    "name": "Headache patient",
    "gender": "unspecified",
    "symptoms": "Mild headache across the forehead for six hours",
    "allergies": "none",
    "current_meds": "none",
    "medical_conditions": "none"
  }$json$::jsonb,
  $json${
    "scenario_setting": "A patient visits a community pharmacy requesting pain relief.",
    "complaint": "I have a mild headache across my forehead.",
    "questions": [
      {
        "q": "Confirm who needs the medicine.",
        "choices": [
          "Hello. Who is the medicine for?",
          "Which antibiotic do you want?",
          "Is this for a skin rash?",
          "Do you want a sedating medicine?"
        ],
        "correct": 0,
        "patient_response": "It's for me."
      },
      {
        "q": "Ask about pain location and character.",
        "choices": [
          "Can you describe your pain and where it is located?",
          "Do you want medicine for cough?",
          "Which brand looks cheapest?",
          "Can I give you an antibiotic?"
        ],
        "correct": 0,
        "patient_response": "I have a mild headache across my forehead."
      },
      {
        "q": "Ask about duration.",
        "choices": [
          "How long have you had the headache?",
          "Do you want capsules instead of tablets?",
          "Are you buying this for someone else?",
          "Should I give a strong painkiller?"
        ],
        "correct": 0,
        "patient_response": "Since this morning, around six hours ago."
      },
      {
        "q": "Ask about prior treatment.",
        "choices": [
          "Have you taken any medicine or tried anything to relieve it?",
          "Do you want two packs?",
          "Do you need medicine for allergy?",
          "Do you want an injection?"
        ],
        "correct": 0,
        "patient_response": "No, I just drank some water and rested, but it didn't help much."
      },
      {
        "q": "Screen contraindications and current medicines.",
        "choices": [
          "Do you have any allergies, stomach ulcers, liver disease, or are you taking any other medicines?",
          "Do you prefer orange flavor?",
          "Should I give this without checking your history?",
          "Do you want antibiotics with it?"
        ],
        "correct": 0,
        "patient_response": "No, I don't have any medical problems and I'm not taking any medicines."
      }
    ],
    "correct_drug": "Paracetamol 500mg",
    "drug_options": ["Paracetamol 500mg", "Ibuprofen 400mg", "Amoxicillin 500mg", "Tramadol 50mg"],
    "correct_dose": "500-1000mg every 4-6 hours, max 4g/day",
    "dose_options": [
      "500-1000mg every 4-6 hours, max 4g/day",
      "2g every 2 hours",
      "500mg once weekly",
      "Take the whole strip at once"
    ],
    "correct_quantity": 1,
    "correct_advice": "Take with water, avoid other paracetamol products, and see a doctor if headache is severe, unusual, or lasts more than 3 days.",
    "advice_options": [
      "Take with water, avoid other paracetamol products, and see a doctor if headache is severe, unusual, or lasts more than 3 days.",
      "Take double doses if the pain returns.",
      "Combine with alcohol for faster relief.",
      "Ignore worsening headache unless it lasts a month."
    ]
  }$json$::jsonb,
  'The presentation is a mild uncomplicated headache with no stated red flags. Paracetamol is an appropriate OTC analgesic after screening contraindications and current medicines.',
  'For OTC pain relief, screen red flags and check liver disease, alcohol use, allergies, pregnancy, ulcers, and interacting medicines before recommending.',
  now(),
  NULL,
  NULL,
  false,
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  difficulty = EXCLUDED.difficulty,
  title = EXCLUDED.title,
  prescription_image_url = EXCLUDED.prescription_image_url,
  electronic_prescription_json = EXCLUDED.electronic_prescription_json,
  drugs_required = EXCLUDED.drugs_required,
  patient_info_json = EXCLUDED.patient_info_json,
  correct_answer_json = EXCLUDED.correct_answer_json,
  explanation = EXCLUDED.explanation,
  mentor_tip = EXCLUDED.mentor_tip,
  created_at = EXCLUDED.created_at,
  formula_json = EXCLUDED.formula_json,
  shipment_json = EXCLUDED.shipment_json,
  requires_compounding = EXCLUDED.requires_compounding,
  compound_type = EXCLUDED.compound_type,
  compound_data = EXCLUDED.compound_data;
