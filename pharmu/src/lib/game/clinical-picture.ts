/**
 * The clinical detail behind a simulated prescription.
 *
 * The slip used to print one hardcoded set of vitals - 118/76, pulse 82,
 * temp 98.6 - on every case, so a patient with a chest infection and a patient
 * collecting a repeat blood-pressure prescription looked physiologically
 * identical. Half the form was blank on top of that: no weight, no BMI, no
 * contact, neither smoking box ticked, nothing under Refer To or Follow-Up.
 *
 * Everything here is derived from the case id, so a given case always shows the
 * same patient. That matters more than it sounds: vitals regenerated per render
 * would change the patient's blood pressure when the component re-rendered, and
 * a learner cannot be asked to reason about numbers that move underneath them.
 *
 * Numbers are chosen to be clinically coherent rather than merely plausible -
 * the fever comes with the tachycardia that belongs to it, and weight is
 * computed from height and BMI so the three can never contradict each other.
 */

export type Vitals = {
  bp: string;
  pulse: string;
  spo2: string;
  respRate: string;
  temp: string;
  gcs: string;
  rbs: string;
};

export type ClinicalPicture = {
  mrNo: string;
  slipNo: string;
  /** Clock time of arrival, e.g. "09:40". The date is always today. */
  arrivalTime: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  contact: string;
  smoker: boolean;
  vitals: Vitals;
  complaint: string;
  examination: string;
  diagnosis: string;
  referTo: string;
  testAdvised: string;
  advice: string;
};

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

/** xmur3: string -> 32-bit seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32: seed -> repeatable [0,1) sequence. */
function makeRng(seed: string) {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const intBetween = (rng: Rng, min: number, max: number) => Math.round(between(rng, min, max));
const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];

/* ------------------------------------------------------------------ *
 * Conditions
 * ------------------------------------------------------------------ */

type VitalShape = {
  systolic: [number, number];
  diastolic: [number, number];
  pulse: [number, number];
  spo2: [number, number];
  respRate: [number, number];
  /** Fahrenheit, to match the form's printed unit. */
  temp: [number, number];
  rbs: [number, number];
  bmi: [number, number];
};

const WELL: VitalShape = {
  systolic: [112, 126],
  diastolic: [70, 82],
  pulse: [64, 86],
  spo2: [97, 99],
  respRate: [14, 18],
  temp: [97.8, 99.0],
  rbs: [82, 110],
  bmi: [21.0, 27.5],
};

/**
 * One coherent way a condition can present.
 *
 * These six fields are bundled rather than drawn from six parallel lists
 * because drawing them independently mixed the variants: a slip came out
 * reading "productive cough with green sputum" against crackles at the right
 * base, then a diagnosis of tonsillitis and an order for a urine dipstick.
 * Each of those was individually plausible and the three together were
 * nonsense. Picking one presentation keeps the whole form telling one story.
 */
type Presentation = {
  complaint: string;
  examination: string;
  diagnosis: string;
  referTo: string;
  tests: string;
  advice: string;
};

type Condition = {
  /** Matched against the case title, lowercased. */
  match: RegExp;
  vitals: Partial<VitalShape>;
  presentations: readonly Presentation[];
};

const CONDITIONS: readonly Condition[] = [
  {
    match: /bacterial|infection|antibiotic/,
    // Fever drives the tachycardia and mild tachypnoea that come with it,
    // rather than each number being drawn on its own.
    vitals: { temp: [100.4, 102.4], pulse: [94, 112], respRate: [18, 22], spo2: [94, 97] },
    // Respiratory presentations only. The template picks the antibiotic from
    // its own pool without reference to this, so a presentation here has to be
    // treatable by every drug in that pool: a urinary infection read coherently
    // on its own but would have printed doxycycline or a macrolide against it,
    // none of which are first-line for a UTI.
    presentations: [
      {
        complaint: "4-day history of productive cough with green sputum, fever and malaise. No haemoptysis, no chest pain.",
        examination: "Alert, flushed, well hydrated. Coarse crackles at right base. No respiratory distress.",
        diagnosis: "Community-acquired lower respiratory tract infection",
        referTo: "Same-day GP if breathless or unable to keep fluids down",
        tests: "FBC and CRP if no improvement in 48 hours. Chest X-ray if fever persists beyond 5 days.",
        advice: "Complete the full course even once feeling better. Paracetamol for fever, 2-3L fluids daily. Return if breathless, confused, or fever above 39C.",
      },
      {
        complaint: "3 days of sore throat, fever and painful swallowing. Unable to finish meals. No stridor or drooling.",
        examination: "Tonsils enlarged and inflamed with exudate. Tender cervical lymphadenopathy. Chest clear.",
        diagnosis: "Acute bacterial tonsillitis",
        referTo: "Same-day GP if unable to swallow saliva or breathing becomes noisy",
        tests: "Throat swab if symptoms recur. FBC if systemically unwell.",
        advice: "Finish the whole course. Soft diet, cold drinks and regular paracetamol. Return urgently if you cannot swallow your own saliva.",
      },
    ],
  },
  {
    match: /rhinitis|allergic|hay ?fever|antihistamine/,
    vitals: {},
    presentations: [
      {
        complaint: "6-week history of sneezing, clear nasal discharge and itchy watery eyes. Worse outdoors and in the mornings.",
        examination: "Pale, boggy nasal mucosa with clear discharge. Conjunctivae mildly injected. Chest clear.",
        diagnosis: "Seasonal allergic rhinitis",
        referTo: "Not required at this stage",
        tests: "None routinely. Consider specific IgE or skin-prick testing if the trigger is unclear.",
        advice: "Take regularly through the season rather than only on bad days. Keep windows shut when pollen is high and shower after being outdoors.",
      },
      {
        complaint: "Year-round nasal congestion and sneezing, worse at home and at night. Sleep disturbed by blocked nose.",
        examination: "Bilateral nasal congestion, transverse nasal crease. No sinus tenderness. Chest clear.",
        diagnosis: "Persistent allergic rhinitis",
        referTo: "ENT if symptoms persist despite optimal treatment",
        tests: "Peak flow if any wheeze develops, to exclude coexisting asthma.",
        advice: "Use every day rather than only when blocked - it works by prevention. Wash bedding hot weekly and consider allergen-proof covers. Return if wheeze develops.",
      },
    ],
  },
  {
    match: /asthma|inhaler|copd|wheez/,
    vitals: { spo2: [94, 97], respRate: [18, 22], pulse: [82, 98] },
    presentations: [
      {
        complaint: "Wheeze and night-time cough 3-4 times a week for two months. Using reliever most days. No hospital admissions.",
        examination: "Mild expiratory wheeze bilaterally. No accessory muscle use. Speaking in full sentences.",
        diagnosis: "Partly controlled asthma",
        referTo: "GP review in 4 weeks to reassess control",
        tests: "Peak flow diary morning and evening for 2 weeks. Spirometry at review.",
        advice: "Preventer every day even when well - it is what stops the attacks. Rinse mouth after the steroid inhaler. Seek urgent help if the reliever stops lasting 4 hours.",
      },
      {
        complaint: "Breathless climbing stairs, chest tightness on cold mornings. Reliever inhaler emptying faster than usual.",
        examination: "Scattered wheeze on forced expiration. Good air entry throughout. Inhaler technique poor - actuation not coordinated with breath.",
        diagnosis: "Asthma - reliever overuse, review of control",
        referTo: "Asthma nurse for inhaler technique and a personalised action plan",
        tests: "Peak flow before and after reliever. Recheck inhaler technique at every visit.",
        advice: "Technique matters as much as the drug - ask for a spacer. Bring all inhalers to every appointment. Return immediately if you cannot finish a sentence in one breath.",
      },
    ],
  },
  {
    match: /blood pressure|hypertens|antihypertens/,
    vitals: { systolic: [148, 164], diastolic: [90, 99], pulse: [70, 86], bmi: [26.0, 31.5] },
    presentations: [
      {
        complaint: "Attends for blood pressure review. Asymptomatic. Readings raised on three separate occasions over 8 weeks.",
        examination: "Well. Heart sounds normal, no murmurs. No peripheral oedema. Fundi not examined today.",
        diagnosis: "Stage 1 hypertension",
        referTo: "Not required. Continue in primary care",
        tests: "U&Es and eGFR before and 2 weeks after starting. Lipid profile, HbA1c, urine ACR. Home readings twice daily for 7 days.",
        advice: "Take in the morning. Salt below 6g daily, 150 minutes of activity a week, limit alcohol. Dizziness on standing is common at first - stand up slowly.",
      },
      {
        complaint: "Routine review of known raised blood pressure. Occasional morning headaches. No chest pain, no visual disturbance.",
        examination: "Well perfused. Pulse regular. No carotid bruit. No ankle swelling.",
        diagnosis: "Essential hypertension - not yet at target",
        referTo: "GP if readings remain above target after 4 weeks",
        tests: "Baseline renal function and electrolytes. ECG. Home readings diary before next review.",
        advice: "Do not stop suddenly. Bring your home readings to the next review. Report a persistent dry cough or new ankle swelling.",
      },
    ],
  },
  {
    match: /pain|analgesi|nsaid|musculoskelet/,
    vitals: { pulse: [76, 94], systolic: [118, 132], diastolic: [74, 86] },
    presentations: [
      {
        complaint: "5-day history of lower back pain after lifting at work. No radiation below the knee, no numbness, bladder and bowel normal.",
        examination: "Paraspinal muscle spasm at L4-L5. Straight leg raise negative bilaterally. Power and sensation normal. No red flags.",
        diagnosis: "Acute mechanical lower back pain",
        referTo: "Physiotherapy if not settling within 2 weeks",
        tests: "None indicated. Imaging only if red flags develop.",
        advice: "Keep moving within comfort - bed rest slows recovery. Take with or after food. Seek urgent help for numbness in the saddle area or loss of bladder control.",
      },
      {
        complaint: "Aching pain and morning stiffness in both knees for several months, worse after activity. Stiffness eases within 20 minutes.",
        examination: "Mild crepitus both knees, no effusion, no erythema. Range of movement preserved. Gait normal.",
        diagnosis: "Osteoarthritis of the knees",
        referTo: "GP if pain unmanaged or new neurological symptoms",
        tests: "Weight-bearing knee X-ray if symptoms progress. U&Es if on a long-term NSAID.",
        advice: "Take with food, at the lowest dose that controls the pain, for the shortest time. Quadriceps strengthening helps. Report indigestion or black stools immediately.",
      },
    ],
  },
  {
    match: /reflux|dyspep|heartburn|ppi|gastr/,
    vitals: { bmi: [25.5, 31.0] },
    presentations: [
      {
        complaint: "8-week history of burning retrosternal discomfort after meals, worse lying flat at night. No dysphagia, no weight loss, no vomiting.",
        examination: "Abdomen soft, mild epigastric tenderness, no guarding. No mass. No lymphadenopathy.",
        diagnosis: "Gastro-oesophageal reflux disease",
        referTo: "Not required. Review at 8 weeks",
        tests: "H. pylori breath or stool antigen test, at least 2 weeks off the PPI. FBC to exclude anaemia.",
        advice: "Take 30-60 minutes before breakfast. Smaller evening meals, nothing within 3 hours of bed, raise the head of the bed. Return if swallowing becomes difficult.",
      },
      {
        complaint: "Recurrent heartburn and acid regurgitation 4-5 nights a week. Antacids give only brief relief. No alarm symptoms.",
        examination: "Abdomen soft and non-tender. No epigastric mass. Weight stable.",
        diagnosis: "Uninvestigated dyspepsia - no alarm features",
        referTo: "Upper GI endoscopy if alarm symptoms develop",
        tests: "H. pylori testing. FBC. Endoscopy only if dysphagia, weight loss or anaemia appear.",
        advice: "Take before food, not after. Reduce alcohol, caffeine and late meals. Urgent review for difficulty swallowing, vomiting blood, or black stools.",
      },
    ],
  },
  {
    match: /diabet|glycaem|glycem|metformin|insulin/,
    vitals: { rbs: [178, 268], systolic: [128, 144], diastolic: [78, 90], bmi: [27.5, 34.0] },
    presentations: [
      {
        complaint: "3-month history of increased thirst, frequent urination and fatigue. HbA1c 58 mmol/mol on recent bloods. No visual blurring.",
        examination: "Overweight, well hydrated. Feet: pulses present, monofilament sensation intact bilaterally. No ulceration.",
        diagnosis: "Type 2 diabetes mellitus - newly diagnosed",
        referTo: "Structured diabetes education programme. Annual retinal screening",
        tests: "HbA1c at 3 months. U&Es and eGFR before starting and annually. Lipid profile, urine ACR, retinal screening, annual foot check.",
        advice: "Take with or just after food and build the dose up slowly. Nausea and loose stools usually settle within 2 weeks. Do not skip meals.",
      },
      {
        complaint: "Known type 2 diabetes, attends for review. HbA1c risen over the last two checks. Diet slipped since a change of job.",
        examination: "Peripheral pulses intact. Foot sensation normal. No retinopathy reported at last screening.",
        diagnosis: "Type 2 diabetes mellitus - above glycaemic target",
        referTo: "Dietitian and diabetes nurse. Podiatry for annual foot check",
        tests: "Repeat HbA1c in 3 months. Baseline renal function. B12 if on long-term metformin.",
        advice: "Take with food. Report persistent vomiting, or muscle pain with unusual tiredness. Diet and activity changes work alongside the medicine, not instead of it.",
      },
    ],
  },
];

const FALLBACK: Condition = {
  match: /.^/,
  vitals: {},
  presentations: [
    {
      complaint: "Attends for review of current symptoms. No red-flag features reported.",
      examination: "Alert and orientated. Systemic examination unremarkable.",
      diagnosis: "Minor ailment - suitable for pharmacy management",
      referTo: "Not required at this stage",
      tests: "None indicated. Review if symptoms persist beyond 7 days.",
      advice: "Use as directed. Return if symptoms worsen or fail to settle.",
    },
  ],
};

function conditionFor(title: string): Condition {
  const text = title.toLowerCase();
  return CONDITIONS.find((c) => c.match.test(text)) ?? FALLBACK;
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

const round1 = (n: number) => n.toFixed(1);

export type ClinicalPictureInput = {
  /** Stable id for the case, so the same case yields the same patient. */
  seed: string;
  /** Drives which condition profile is used. */
  title: string;
  age: number;
  gender?: string | null;
  allergies?: string | null;
};

export function buildClinicalPicture({
  seed, title, age, gender, allergies,
}: ClinicalPictureInput): ClinicalPicture {
  const rng = makeRng(seed || "training");
  const condition = conditionFor(title);
  const shape = { ...WELL, ...condition.vitals };
  // One presentation for the whole form, so complaint, findings, diagnosis and
  // investigations all describe the same patient.
  const presentation = pick(rng, condition.presentations);

  // Height then BMI then weight, in that order: weight is computed from the
  // other two so the three printed figures always agree with each other.
  const female = String(gender ?? "").toLowerCase().startsWith("f");
  const heightCm = intBetween(rng, female ? 152 : 165, female ? 169 : 183);
  const bmi = between(rng, shape.bmi[0], shape.bmi[1]);
  const weightKg = bmi * (heightCm / 100) ** 2;

  // Older patients run a little higher on systolic even when well.
  const ageDrift = age >= 60 ? 8 : age >= 45 ? 4 : 0;

  const vitals: Vitals = {
    bp: `${intBetween(rng, shape.systolic[0], shape.systolic[1]) + ageDrift}/${intBetween(rng, shape.diastolic[0], shape.diastolic[1])}`,
    pulse: String(intBetween(rng, shape.pulse[0], shape.pulse[1])),
    spo2: String(intBetween(rng, shape.spo2[0], shape.spo2[1])),
    respRate: String(intBetween(rng, shape.respRate[0], shape.respRate[1])),
    temp: round1(between(rng, shape.temp[0], shape.temp[1])),
    // Anything below 15 is a medical emergency and none of these cases are one.
    gcs: "15",
    rbs: String(intBetween(rng, shape.rbs[0], shape.rbs[1])),
  };

  const allergyText = allergies && allergies.toLowerCase() !== "none"
    ? `Allergies: ${allergies} (documented)`
    : "Allergies: none known (NKDA)";

  return {
    mrNo: `MR-${new Date().getFullYear()}-${String(intBetween(rng, 10000, 99999))}`,
    slipNo: `CP-${String(intBetween(rng, 100000, 999999))}`,
    // Within pharmacy opening hours, so the slip reads like a real visit.
    arrivalTime: `${String(intBetween(rng, 9, 18)).padStart(2, "0")}:${String(intBetween(rng, 0, 11) * 5).padStart(2, "0")}`,
    weightKg: round1(weightKg),
    heightCm: String(heightCm),
    bmi: round1(bmi),
    // 555-01xx is the block reserved for fiction, so a training slip can carry a
    // natural-looking number that cannot ring a real person.
    contact: `0${intBetween(rng, 300, 349)} 555 01${String(intBetween(rng, 10, 99))}`,
    // Smoking status is asked on every form, so it is always answered. Weighted
    // to non-smoker, which is the more common answer in practice.
    smoker: rng() < 0.3,
    vitals,
    complaint: presentation.complaint,
    examination: `${presentation.examination} ${allergyText}`,
    diagnosis: presentation.diagnosis,
    referTo: presentation.referTo,
    testAdvised: presentation.tests,
    advice: presentation.advice,
  };
}
