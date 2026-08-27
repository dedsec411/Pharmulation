/**
 * OTC consultation case bank.
 *
 * These are clinical *facts*, not dialogue. The AI patient improvises its own
 * words from them, so no two consultations read the same, while the medicine
 * stays exactly as authored. Deliberately not LLM-generated: a hallucinated
 * recommendation in a pharmacy trainer teaches unsafe practice.
 *
 * `hidden` fields are only revealed when the pharmacist actually asks. The
 * grader checks WWHAM coverage plus whether any `redFlags` were elicited.
 */

export type OtcOutcome = "treat" | "refer";

export type OtcCase = {
  id: string;
  title: string;
  patient: {
    name: string;
    age: number;
    /** How the patient opens, in their own words. */
    opening: string;
    /** Personality notes the AI uses to colour its replies. */
    manner: string;
  };
  /** Revealed only when asked. Maps to WWHAM. */
  hidden: {
    /** W - who is it for */
    who: string;
    /** W - what are the symptoms */
    what: string;
    /** H - how long */
    howLong: string;
    /** A - action already taken */
    action: string;
    /** M - medication, allergies, conditions */
    medication: string;
    allergies: string;
    conditions: string;
    /** Facts that only surface on a specific, well-aimed question. */
    extra?: string[];
  };
  /** Findings that should change the outcome. Empty for straightforward sales. */
  redFlags: string[];
  outcome: OtcOutcome;
  recommendation: {
    /** Acceptable answers. For `refer` cases this is the referral action. */
    correct: string[];
    options: string[];
    dose: string;
    doseOptions: string[];
    counselling: string;
    counsellingOptions: string[];
  };
  mentorTip: string;
  explanation: string;
};

export const OTC_CASES: OtcCase[] = [
  {
    id: "otc-headache-simple",
    title: "Recurring headache",
    patient: {
      name: "Daniel Okafor",
      age: 34,
      opening: "Hi, have you got anything strong for a headache?",
      manner: "Straightforward and a bit tired. Answers plainly.",
    },
    hidden: {
      who: "For himself.",
      what: "A dull, band-like ache across both sides of the forehead. No visual changes, no nausea, no neck stiffness.",
      howLong: "On and off for about three days, worse in the afternoons.",
      action: "Nothing yet, was hoping to get something here.",
      medication: "No regular medicines.",
      allergies: "No known allergies.",
      conditions: "Generally well. Has been working long hours at a screen and sleeping badly.",
      extra: ["Drinks about four coffees a day.", "Has not been drinking much water."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Paracetamol"],
      options: ["Paracetamol", "Co-codamol", "Sumatriptan", "Amoxicillin"],
      dose: "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours",
      doseOptions: [
        "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours",
        "1 g every two hours as needed",
        "500 mg once daily",
        "2 g twice daily",
      ],
      counselling: "Take regularly rather than waiting for the pain to peak, keep hydrated, and see a doctor if headaches persist beyond a week or worsen.",
      counsellingOptions: [
        "Take regularly rather than waiting for the pain to peak, keep hydrated, and see a doctor if headaches persist beyond a week or worsen.",
        "Take as many as needed until the pain stops.",
        "Avoid all food while taking it.",
        "Stop drinking water to reduce pressure.",
      ],
    },
    mentorTip: "Tension-type headache is common, but always screen for red flags before selling an analgesic.",
    explanation: "A bilateral, band-like headache with no neurological signs, in a well adult, fits tension-type headache. Paracetamol is first line. Address the lifestyle triggers and set a clear referral point.",
  },
  {
    id: "otc-pregnancy-analgesic",
    title: "Headache in early pregnancy",
    patient: {
      name: "Amara Silva",
      age: 29,
      opening: "Can I just grab some ibuprofen please?",
      manner: "In a hurry, wants to be served quickly. Does not volunteer much unless asked directly.",
    },
    hidden: {
      who: "For herself.",
      what: "A persistent dull headache, no visual disturbance, no swelling, no upper abdominal pain.",
      howLong: "Two days.",
      action: "Has not taken anything, wanted to check first.",
      medication: "Pregnancy vitamins with folic acid.",
      allergies: "No known allergies.",
      conditions: "She is fourteen weeks pregnant. She will only mention this if asked about pregnancy, breastfeeding, or her general health.",
      extra: ["Blood pressure was normal at her last midwife appointment."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Paracetamol"],
      options: ["Paracetamol", "Ibuprofen", "Aspirin", "Naproxen"],
      dose: "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours, for the shortest time needed",
      doseOptions: [
        "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours, for the shortest time needed",
        "400 mg ibuprofen three times daily with food",
        "300 mg aspirin every four hours",
        "1 g every two hours as needed",
      ],
      counselling: "Paracetamol is the analgesic of choice in pregnancy; avoid NSAIDs. Contact the midwife if the headache persists, or urgently if vision changes, swelling or upper abdominal pain develop.",
      counsellingOptions: [
        "Paracetamol is the analgesic of choice in pregnancy; avoid NSAIDs. Contact the midwife if the headache persists, or urgently if vision changes, swelling or upper abdominal pain develop.",
        "Ibuprofen is fine in pregnancy at any stage.",
        "Take aspirin if paracetamol does not work.",
        "No follow-up is needed for headaches in pregnancy.",
      ],
    },
    mentorTip: "Always ask about pregnancy and breastfeeding before selling any analgesic to a woman of childbearing age.",
    explanation: "The patient asked for ibuprofen by name, but NSAIDs are avoided in pregnancy. Paracetamol is the appropriate choice. Pregnancy is only discovered if you ask, which is the entire point of this case.",
  },
  {
    id: "otc-cough-persistent",
    title: "Cough that will not clear",
    patient: {
      name: "Brian Whelan",
      age: 61,
      opening: "I need something for a cough that's hanging around.",
      manner: "Understated. Plays down how long it has been going on unless pressed.",
    },
    hidden: {
      who: "For himself.",
      what: "A dry cough, occasionally streaked with blood in the morning. He has lost around five kilograms without trying and feels more tired than usual.",
      howLong: "About seven weeks. He will say 'a while' first and only give the real figure if asked directly.",
      action: "Tried honey and lemon and a bottle of cough syrup from the supermarket, neither helped.",
      medication: "Ramipril for blood pressure.",
      allergies: "No known allergies.",
      conditions: "High blood pressure. Smoked twenty a day for thirty years.",
      extra: ["Occasional night sweats.", "Blood in the sputum, mentioned only if asked what the cough brings up."],
    },
    redFlags: [
      "Cough persisting more than three weeks",
      "Blood in the sputum (haemoptysis)",
      "Unintentional weight loss",
      "Long smoking history in an older adult",
    ],
    outcome: "refer",
    recommendation: {
      correct: ["Refer urgently to a doctor"],
      options: ["Refer urgently to a doctor", "Simple linctus", "Pholcodine linctus", "Dextromethorphan syrup"],
      dose: "No OTC medicine — same-week GP appointment",
      doseOptions: [
        "No OTC medicine — same-week GP appointment",
        "5 mL simple linctus four times daily",
        "10 mL pholcodine at night",
        "15 mL dextromethorphan three times daily",
      ],
      counselling: "Explain that a cough lasting more than three weeks with blood in the sputum and weight loss needs medical investigation, and that a cough medicine would only delay diagnosis.",
      counsellingOptions: [
        "Explain that a cough lasting more than three weeks with blood in the sputum and weight loss needs medical investigation, and that a cough medicine would only delay diagnosis.",
        "Reassure him it is just a smoker's cough and sell a linctus.",
        "Suggest he waits another month and comes back.",
        "Tell him to double the dose of his blood pressure tablet.",
      ],
    },
    mentorTip: "A cough over three weeks, haemoptysis, or unexplained weight loss are referral criteria, not sale opportunities.",
    explanation: "This combination is a classic urgent referral. Selling any cough preparation here risks delaying diagnosis of a serious condition. The duration and haemoptysis only emerge if you ask specifically.",
  },
  {
    id: "otc-heartburn-simple",
    title: "Heartburn after meals",
    patient: {
      name: "Priya Raman",
      age: 41,
      opening: "I get a burning feeling in my chest after dinner. Any ideas?",
      manner: "Chatty and cooperative.",
    },
    hidden: {
      who: "For herself.",
      what: "A burning sensation behind the breastbone, worse lying down. No difficulty swallowing, no weight loss, no vomiting.",
      howLong: "A couple of weeks, mainly after large or spicy meals.",
      action: "Has tried sitting up later after eating, which helped a little.",
      medication: "No regular medicines.",
      allergies: "No known allergies.",
      conditions: "Otherwise well.",
      extra: ["Symptoms are clearly related to food, not exertion.", "No pain radiating to the arm or jaw."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Alginate antacid"],
      options: ["Alginate antacid", "Loperamide", "Ibuprofen", "Oral rehydration salts"],
      dose: "10-20 mL after meals and at bedtime, up to four times daily",
      doseOptions: [
        "10-20 mL after meals and at bedtime, up to four times daily",
        "10 mL once weekly",
        "50 mL every hour",
        "One tablet daily on an empty stomach",
      ],
      counselling: "Take after meals and at bedtime, eat smaller meals, avoid eating late, and see a doctor if symptoms last beyond two weeks of treatment or swallowing becomes difficult.",
      counsellingOptions: [
        "Take after meals and at bedtime, eat smaller meals, avoid eating late, and see a doctor if symptoms last beyond two weeks of treatment or swallowing becomes difficult.",
        "Take it only when the pain is unbearable.",
        "Lie down immediately after eating to help digestion.",
        "Take it with ibuprofen for faster relief.",
      ],
    },
    mentorTip: "Separate simple reflux from cardiac pain and from alarm features before selling an antacid.",
    explanation: "Food-related burning with no dysphagia, weight loss or exertional component fits uncomplicated reflux. An alginate antacid is appropriate, with clear lifestyle advice and a review point.",
  },
  {
    id: "otc-chest-pain-referral",
    title: "Chest discomfort on exertion",
    patient: {
      name: "Ken Adeyemi",
      age: 58,
      opening: "I keep getting indigestion when I walk up the hill. Something for indigestion, please.",
      manner: "Dismissive of his symptoms. Calls it indigestion throughout and resists the idea it could be serious.",
    },
    hidden: {
      who: "For himself.",
      what: "A tight, heavy pressure across the centre of the chest that comes on when walking uphill and eases within a few minutes of stopping. It sometimes spreads to the left arm and jaw.",
      howLong: "Around two weeks, and it is happening with less exertion each time.",
      action: "Tried antacids from the supermarket, which made no difference at all.",
      medication: "No regular medicines. Has not seen a doctor in years.",
      allergies: "No known allergies.",
      conditions: "Father had a heart attack at sixty. He is a smoker.",
      extra: [
        "Sometimes short of breath with it.",
        "Pain radiates to the left arm and jaw, mentioned only if asked where it spreads.",
      ],
    },
    redFlags: [
      "Chest pain brought on by exertion and relieved by rest",
      "Pain radiating to the arm or jaw",
      "Not relieved by antacids",
      "Symptoms occurring with progressively less exertion",
    ],
    outcome: "refer",
    recommendation: {
      correct: ["Refer for urgent same-day medical assessment"],
      options: [
        "Refer for urgent same-day medical assessment",
        "Alginate antacid",
        "Omeprazole",
        "Paracetamol",
      ],
      dose: "No OTC medicine — urgent same-day assessment",
      doseOptions: [
        "No OTC medicine — urgent same-day assessment",
        "10 mL antacid after meals",
        "20 mg omeprazole daily for two weeks",
        "1 g paracetamol four times daily",
      ],
      counselling: "Explain clearly that exertional chest pain radiating to the arm or jaw needs urgent assessment today, and that it is not indigestion. Advise seeking emergency help if pain occurs at rest or does not settle.",
      counsellingOptions: [
        "Explain clearly that exertional chest pain radiating to the arm or jaw needs urgent assessment today, and that it is not indigestion. Advise seeking emergency help if pain occurs at rest or does not settle.",
        "Sell an antacid and suggest he returns if it does not help.",
        "Tell him to walk more slowly and it should settle.",
        "Advise him to book a routine appointment in a few weeks.",
      ],
    },
    mentorTip: "When a patient self-labels chest symptoms as indigestion, take the history yourself before accepting the label.",
    explanation: "Exertional central chest pressure radiating to arm and jaw, unrelieved by antacids and worsening, is possible angina and needs urgent assessment. Accepting the patient's own label of indigestion would be a serious error.",
  },
  {
    id: "otc-warfarin-nsaid",
    title: "Back pain on warfarin",
    patient: {
      name: "Margaret Hollis",
      age: 72,
      opening: "My back's been aching. Could I have some ibuprofen gel and some tablets?",
      manner: "Polite and talkative, but only mentions her medicines if specifically asked.",
    },
    hidden: {
      who: "For herself.",
      what: "A dull lower back ache after gardening. No numbness, no weakness in the legs, no loss of bladder or bowel control, no fever.",
      howLong: "Four days, gradually easing.",
      action: "Used a hot water bottle, which helped a bit.",
      medication: "Warfarin for atrial fibrillation. She also takes a statin. She will only say this if asked what medicines she takes.",
      allergies: "No known allergies.",
      conditions: "Atrial fibrillation. Attends an anticoagulant clinic and her INR has been stable.",
      extra: ["Had a stomach ulcer about ten years ago."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Paracetamol"],
      options: ["Paracetamol", "Oral ibuprofen", "Aspirin", "Naproxen"],
      dose: "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours",
      doseOptions: [
        "1 g (two 500 mg tablets) up to four times daily, max 4 g in 24 hours",
        "400 mg ibuprofen three times daily with food",
        "300 mg aspirin four times daily",
        "250 mg naproxen twice daily",
      ],
      counselling: "Avoid oral NSAIDs because they increase bleeding risk with warfarin and she has a history of ulcer. Keep gently mobile, and see a doctor if the pain worsens or any leg weakness or numbness develops.",
      counsellingOptions: [
        "Avoid oral NSAIDs because they increase bleeding risk with warfarin and she has a history of ulcer. Keep gently mobile, and see a doctor if the pain worsens or any leg weakness or numbness develops.",
        "Ibuprofen is fine as long as it is taken with food.",
        "Take aspirin instead, it is gentler.",
        "Stop the warfarin for a few days while taking ibuprofen.",
      ],
    },
    mentorTip: "Always ask what else the patient takes before selling an NSAID — the interaction is invisible otherwise.",
    explanation: "Mechanical back pain is self-limiting, but oral NSAIDs with warfarin significantly increase bleeding risk, compounded by her ulcer history. Paracetamol is the safe choice. The interaction only surfaces if you ask about current medication.",
  },
  {
    id: "otc-hayfever",
    title: "Seasonal sneezing",
    patient: {
      name: "Tom Bright",
      age: 23,
      opening: "I've been sneezing non-stop since the weather changed.",
      manner: "Relaxed and forthcoming.",
    },
    hidden: {
      who: "For himself.",
      what: "Sneezing, itchy watery eyes and a runny nose. No fever, no facial pain, no coloured discharge.",
      howLong: "About ten days, every spring for the last few years.",
      action: "Nothing so far this year. An antihistamine helped last year but he cannot remember which.",
      medication: "No regular medicines.",
      allergies: "No known drug allergies. Hay fever every spring.",
      conditions: "Otherwise well. He drives a delivery van for work.",
      extra: ["Driving for work matters: a sedating antihistamine would be unsafe."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Non-sedating antihistamine (loratadine or cetirizine)"],
      options: [
        "Non-sedating antihistamine (loratadine or cetirizine)",
        "Sedating antihistamine (chlorphenamine)",
        "Oral decongestant for two weeks",
        "Antibiotic eye drops",
      ],
      dose: "10 mg once daily",
      doseOptions: ["10 mg once daily", "10 mg four times daily", "50 mg at night", "10 mg every two hours"],
      counselling: "A non-sedating antihistamine is important because he drives for work. Take it regularly through the season, and add a steroid nasal spray if symptoms are not controlled.",
      counsellingOptions: [
        "A non-sedating antihistamine is important because he drives for work. Take it regularly through the season, and add a steroid nasal spray if symptoms are not controlled.",
        "Take a sedating antihistamine at night and drive as normal.",
        "Use an oral decongestant continuously all season.",
        "Antibiotics will clear it within a week.",
      ],
    },
    mentorTip: "Occupation changes the product choice — always ask what the patient does before selling a sedating antihistamine.",
    explanation: "Classic allergic rhinitis. The clinical answer is an antihistamine, but the safe answer is specifically a non-sedating one because he drives for a living. That detail only appears if you ask about his work or warn about drowsiness.",
  },
  {
    id: "otc-diarrhoea-adult",
    title: "Travellers' diarrhoea",
    patient: {
      name: "Sofia Marchetti",
      age: 27,
      opening: "I've had an upset stomach since I got back from holiday.",
      manner: "Cooperative, slightly embarrassed.",
    },
    hidden: {
      who: "For herself.",
      what: "Loose, watery stools three or four times a day. No blood, no mucus, no fever, no severe abdominal pain.",
      howLong: "Two days, since returning from a week abroad.",
      action: "Drinking water and eating plain food.",
      medication: "Combined oral contraceptive pill.",
      allergies: "No known allergies.",
      conditions: "Otherwise well, not pregnant.",
      extra: [
        "Taking the contraceptive pill matters: severe diarrhoea can reduce its absorption.",
        "No blood in the stool, mentioned if asked.",
      ],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Oral rehydration salts"],
      options: ["Oral rehydration salts", "Loperamide alone", "Antibiotics", "Codeine"],
      dose: "One sachet in 200 mL water after each loose stool",
      doseOptions: [
        "One sachet in 200 mL water after each loose stool",
        "One sachet once daily regardless of symptoms",
        "Four sachets at once",
        "One sachet weekly",
      ],
      counselling: "Rehydration is the priority. Mention that diarrhoea can affect absorption of her contraceptive pill so extra precautions are needed, and advise seeing a doctor if blood appears, fever develops, or it lasts beyond a few days.",
      counsellingOptions: [
        "Rehydration is the priority. Mention that diarrhoea can affect absorption of her contraceptive pill so extra precautions are needed, and advise seeing a doctor if blood appears, fever develops, or it lasts beyond a few days.",
        "Take loperamide and continue as normal, no other advice needed.",
        "Avoid all fluids to slow the diarrhoea down.",
        "Antibiotics should be taken for any travellers' diarrhoea.",
      ],
    },
    mentorTip: "Diarrhoea plus the contraceptive pill is an easily missed counselling point.",
    explanation: "Uncomplicated travellers' diarrhoea is managed with rehydration. The distinguishing counselling point is the effect on oral contraceptive absorption, which requires you to have asked about her regular medicines.",
  },
  {
    id: "otc-child-fever",
    title: "Feverish toddler",
    patient: {
      name: "Hannah Price",
      age: 31,
      opening: "Have you got something for a temperature? It's for my little one.",
      manner: "Worried and rushed. Gives short answers unless reassured and asked clearly.",
    },
    hidden: {
      who: "For her son, who is two years old and weighs about thirteen kilograms.",
      what: "A temperature since last night, a bit clingy and off his food, but drinking, alert when awake, and no rash.",
      howLong: "Since last night, roughly twelve hours.",
      action: "Nothing yet, she came straight here.",
      medication: "The child takes no regular medicines.",
      allergies: "No known allergies.",
      conditions: "Normally healthy, fully vaccinated.",
      extra: [
        "No rash, no neck stiffness, no drowsiness, no breathing difficulty — reassuring, but only if asked.",
        "He is still drinking fluids and passing urine normally.",
      ],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Paracetamol oral suspension for children"],
      options: [
        "Paracetamol oral suspension for children",
        "Adult paracetamol tablets halved",
        "Aspirin",
        "Antibiotics",
      ],
      dose: "250 mg (10 mL of 120 mg/5 mL) every 4-6 hours, maximum four doses in 24 hours",
      doseOptions: [
        "250 mg (10 mL of 120 mg/5 mL) every 4-6 hours, maximum four doses in 24 hours",
        "500 mg every four hours",
        "One adult tablet twice daily",
        "5 mL every hour as needed",
      ],
      counselling: "Dose by weight and age, keep fluids up, and seek urgent medical help if a non-blanching rash, neck stiffness, drowsiness or breathing difficulty develop, or if fever persists beyond a few days.",
      counsellingOptions: [
        "Dose by weight and age, keep fluids up, and seek urgent medical help if a non-blanching rash, neck stiffness, drowsiness or breathing difficulty develop, or if fever persists beyond a few days.",
        "Give adult tablets broken in half to save money.",
        "Aspirin works faster in children.",
        "No safety-netting is needed for a simple fever.",
      ],
    },
    mentorTip: "Ask who the medicine is for first — the answer changes the product, the dose and the red flags entirely.",
    explanation: "Paediatric dosing is by age and weight, and aspirin is contraindicated in children due to Reye's syndrome risk. The 'who is it for' question is what makes this case safe.",
  },
  {
    id: "otc-athletes-foot",
    title: "Itchy feet",
    patient: {
      name: "Marcus Lin",
      age: 25,
      opening: "My feet have been really itchy between the toes.",
      manner: "Direct and easy to talk to.",
    },
    hidden: {
      who: "For himself.",
      what: "Itching, peeling and cracked skin between the fourth and fifth toes on both feet. No spreading redness, no pus, no fever.",
      howLong: "About three weeks.",
      action: "Tried a moisturiser, which made it worse if anything.",
      medication: "No regular medicines.",
      allergies: "No known allergies.",
      conditions: "Otherwise well, not diabetic.",
      extra: ["Uses a communal gym shower most days.", "Not diabetic, which is worth confirming for any foot problem."],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Topical clotrimazole"],
      options: ["Topical clotrimazole", "Hydrocortisone cream", "Oral antibiotics", "Emollient only"],
      dose: "Apply thinly two to three times daily and continue for two weeks after the skin clears",
      doseOptions: [
        "Apply thinly two to three times daily and continue for two weeks after the skin clears",
        "Apply once and stop when itching settles",
        "Apply hourly until clear",
        "Apply once weekly for three months",
      ],
      counselling: "Keep feet clean and dry, dry carefully between the toes, use flip-flops in communal showers, and continue treatment for two weeks after the skin looks normal to prevent relapse.",
      counsellingOptions: [
        "Keep feet clean and dry, dry carefully between the toes, use flip-flops in communal showers, and continue treatment for two weeks after the skin looks normal to prevent relapse.",
        "Stop the cream as soon as the itch goes.",
        "Use a steroid cream to settle the itch quickly.",
        "Antibiotics are needed for all fungal infections.",
      ],
    },
    mentorTip: "For any foot problem, confirm diabetes status before treating.",
    explanation: "Interdigital athlete's foot responds to a topical imidazole. The key counselling point is continuing treatment beyond apparent clearance, which is where most relapses come from.",
  },
  {
    id: "otc-eye-red-referral",
    title: "Painful red eye",
    patient: {
      name: "Iris Novak",
      age: 48,
      opening: "I think I've got conjunctivitis. Can I get some drops?",
      manner: "Self-diagnosing and confident. Has already decided what she needs.",
    },
    hidden: {
      who: "For herself.",
      what: "One red, painful eye with blurred vision and marked sensitivity to light. No discharge or stickiness.",
      howLong: "Since yesterday, and the vision has got worse through today.",
      action: "Bathed it with water, no improvement.",
      medication: "No regular medicines.",
      allergies: "No known allergies.",
      conditions: "Wears contact lenses and slept in them twice this week.",
      extra: [
        "Vision is genuinely reduced, not just watery — mentioned only if asked about vision.",
        "Wears contact lenses, mentioned only if asked.",
      ],
    },
    redFlags: [
      "Reduced or blurred vision",
      "Significant eye pain",
      "Photophobia",
      "Contact lens wearer with a red eye",
      "Unilateral presentation without discharge",
    ],
    outcome: "refer",
    recommendation: {
      correct: ["Refer urgently for same-day eye assessment"],
      options: [
        "Refer urgently for same-day eye assessment",
        "Chloramphenicol eye drops",
        "Antihistamine eye drops",
        "Lubricating eye drops",
      ],
      dose: "No OTC medicine — urgent same-day assessment",
      doseOptions: [
        "No OTC medicine — urgent same-day assessment",
        "One drop every two hours for five days",
        "One drop twice daily",
        "One drop as needed",
      ],
      counselling: "Explain that pain, reduced vision and light sensitivity in a contact lens wearer are not simple conjunctivitis and need same-day assessment. Advise removing lenses and not wearing them until reviewed.",
      counsellingOptions: [
        "Explain that pain, reduced vision and light sensitivity in a contact lens wearer are not simple conjunctivitis and need same-day assessment. Advise removing lenses and not wearing them until reviewed.",
        "Sell chloramphenicol drops and review in a week.",
        "Advise her to keep wearing lenses to protect the eye.",
        "Suggest lubricating drops and no follow-up.",
      ],
    },
    mentorTip: "Never accept a patient's own diagnosis of conjunctivitis without checking vision, pain and lens use.",
    explanation: "Pain, photophobia and reduced vision in a contact lens wearer suggest keratitis or another sight-threatening cause, not conjunctivitis. Selling drops here risks permanent visual loss.",
  },
  {
    id: "otc-constipation",
    title: "Constipation after a medicine change",
    patient: {
      name: "Errol Baptiste",
      age: 66,
      opening: "I've been really blocked up. What do you recommend?",
      manner: "Good humoured, happy to answer anything he is asked.",
    },
    hidden: {
      who: "For himself.",
      what: "Hard, infrequent stools every three or four days, with straining. No blood, no unexplained weight loss, no abdominal pain or vomiting.",
      howLong: "About three weeks.",
      action: "Has tried drinking prune juice with limited effect.",
      medication: "Started codeine-containing painkillers a month ago after a shoulder injury. Also takes amlodipine.",
      allergies: "No known allergies.",
      conditions: "Otherwise well.",
      extra: [
        "The codeine is almost certainly the cause — only found if you ask about recent medicine changes.",
        "No rectal bleeding and no weight loss, mentioned if asked.",
      ],
    },
    redFlags: [],
    outcome: "treat",
    recommendation: {
      correct: ["Stimulant laxative (senna) with lifestyle advice"],
      options: [
        "Stimulant laxative (senna) with lifestyle advice",
        "Bulk-forming laxative alone",
        "Loperamide",
        "No treatment needed",
      ],
      dose: "One to two tablets at night",
      doseOptions: [
        "One to two tablets at night",
        "Four tablets every four hours",
        "One tablet weekly",
        "Six tablets each morning",
      ],
      counselling: "Explain that the codeine is the likely cause and that opioid constipation responds better to a stimulant than to bulking agents alone. Increase fluid and fibre, and see the doctor to review the painkiller if it continues.",
      counsellingOptions: [
        "Explain that the codeine is the likely cause and that opioid constipation responds better to a stimulant than to bulking agents alone. Increase fluid and fibre, and see the doctor to review the painkiller if it continues.",
        "Bulk-forming laxatives are always first line regardless of cause.",
        "Take loperamide to settle the bowel.",
        "No advice is needed, constipation resolves on its own.",
      ],
    },
    mentorTip: "When a new symptom follows a new medicine, suspect the medicine first.",
    explanation: "Opioid-induced constipation is a drug side effect, not simple dietary constipation, and bulk-forming laxatives are relatively ineffective for it. Identifying the cause depends on asking what recently changed.",
  },
];

export function getOtcCaseById(id: string) {
  return OTC_CASES.find((item) => item.id === id) ?? null;
}

/** Pick a case the player has not seen recently, falling back to any case. */
export function pickOtcCase(seenIds: readonly string[] = []) {
  const unseen = OTC_CASES.filter((item) => !seenIds.includes(item.id));
  const pool = unseen.length > 0 ? unseen : OTC_CASES;
  return pool[Math.floor(Math.random() * pool.length)];
}
