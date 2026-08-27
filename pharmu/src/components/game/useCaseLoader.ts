import { useCallback, useEffect, useState } from "react";
import { fetchRandomCase, type Difficulty, type Mode } from "@/lib/game/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveCaseStore } from "@/lib/active-case-store";

const OTC_PILOT_CASE_IDS = [
  "7edab79d-3920-4b28-8d31-7f3a5d86e001",
  "7edab79d-3920-4b28-8d31-7f3a5d86e002",
];

export function useCaseLoader(mode: Mode, difficulty?: Difficulty | null) {
  const { profile } = useAuthStore();
  const setActiveCase = useActiveCaseStore((state) => state.setActiveCase);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(!!difficulty);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!difficulty) {
      setCaseData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const c = mode === "otc"
      ? await fetchOtcPilotCase(reloadKey)
      : await fetchTemplateCase(mode, difficulty, profile?.user_id, profile?.level) ??
        await fetchRandomCase(mode, difficulty);
    setCaseData(c);
    setActiveCase(c);
    setLoading(false);
  }, [mode, difficulty, profile?.user_id, profile?.level, reloadKey, setActiveCase]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => () => setActiveCase(null), [setActiveCase]);

  return { caseData, loading, next: () => setReloadKey((k) => k + 1) };
}

async function fetchOtcPilotCase(reloadKey: number) {
  const targetIndex = reloadKey % OTC_PILOT_CASE_IDS.length;
  const targetId = OTC_PILOT_CASE_IDS[targetIndex];
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (error) console.warn("OTC pilot case fetch failed", error);
  return data ? buildOtcPilotFallbackCase(targetIndex, data.id) : buildOtcPilotFallbackCase(targetIndex);
}

type TemplateRow = {
  id: string;
  mode: Mode;
  difficulty: Difficulty;
  template_name: string | null;
  base_scenario: any;
  variation_rules: any;
  created_at: string;
};

type DrugRow = {
  id: string;
  name: string;
  generic_name?: string | null;
  drug_class?: string | null;
  indications?: string[] | null;
  dosage?: string | null;
  side_effects?: string[] | null;
  contraindications?: string[] | null;
  interactions?: string[] | null;
  category?: string | null;
};

const OTC_PILOT_FALLBACK_CASES = [
  {
    id: "generated:otc-pilot:allergy",
    mode: "otc",
    difficulty: "easy",
    title: "Case Scenario 1: Allergy (Allergic Rhinitis)",
    prescription_image_url: null,
    electronic_prescription_json: null,
    drugs_required: ["Cetirizine", "Loratadine"],
    patient_info_json: {
      age: 26,
      name: "Allergy patient",
      gender: "unspecified",
      symptoms: "Sneezing, runny nose, itchy watery eyes for three days",
      allergies: "none",
      current_meds: "none",
      medical_conditions: "none",
    },
    correct_answer_json: {
      scenario_setting: "A patient visits a community pharmacy complaining of allergy symptoms.",
      questions: [
        {
          q: "Confirm who needs the medicine.",
          choices: [
            "Good morning. Who is the medicine for?",
            "Which antibiotic do you want?",
            "Do you want a cough syrup?",
            "Should I give you eye drops only?",
          ],
          correct: 0,
          patient_response: "It's for me.",
        },
        {
          q: "Ask about symptoms.",
          choices: [
            "What symptoms are you having?",
            "Are you taking blood pressure medicine?",
            "Do you have stomach pain?",
            "Which brand do you usually buy?",
          ],
          correct: 0,
          patient_response: "I've been sneezing a lot, my nose is runny, and my eyes are itchy and watery.",
        },
        {
          q: "Ask about duration.",
          choices: [
            "How long have you had these symptoms?",
            "Do you want tablets or capsules?",
            "Did someone else tell you to take this?",
            "Are you here to refill a prescription?",
          ],
          correct: 0,
          patient_response: "They started about three days ago.",
        },
        {
          q: "Ask about prior treatment.",
          choices: [
            "Have you taken anything for it already?",
            "Do you want something very strong?",
            "Can I give you antibiotics?",
            "Do you need medicine for fever only?",
          ],
          correct: 0,
          patient_response: "No, I haven't taken any medicine yet.",
        },
        {
          q: "Screen medicines and conditions.",
          choices: [
            "Are you taking any other medicines or do you have any medical conditions?",
            "Do you prefer a small tablet?",
            "Do you want to buy two boxes?",
            "Should I give this without asking anything else?",
          ],
          correct: 0,
          patient_response: "No, I'm healthy and I'm not taking any medicines.",
        },
      ],
      correct_drug: "Cetirizine 10mg",
      correct_drugs: ["Cetirizine 10mg", "Loratadine 10mg"],
      drug_options: ["Cetirizine 10mg", "Loratadine 10mg", "Amoxicillin 500mg", "Chlorpheniramine 4mg"],
      correct_dose: "Cetirizine 10mg or loratadine 10mg once daily",
      dose_options: [
        "Cetirizine 10mg or loratadine 10mg once daily",
        "Cetirizine 10mg four times daily",
        "Amoxicillin 500mg three times daily",
        "Chlorpheniramine 4mg every hour",
      ],
      correct_quantity: 1,
      correct_advice: "Use once daily, avoid driving if drowsy, and see a doctor if symptoms worsen or do not improve.",
      advice_options: [
        "Use once daily, avoid driving if drowsy, and see a doctor if symptoms worsen or do not improve.",
        "Take extra tablets whenever sneezing starts.",
        "Start antibiotics if the nose keeps running.",
        "Use it only with alcohol to help sleep.",
      ],
    },
    explanation: "Symptoms fit uncomplicated allergic rhinitis. A non-drowsy antihistamine such as cetirizine or loratadine is appropriate after screening medicines and conditions.",
    mentor_tip: "OTC allergy counseling should confirm who it is for, symptoms, duration, prior treatment, current medicines, and warning signs.",
    created_at: "2026-07-02T00:00:00.000Z",
    formula_json: null,
    shipment_json: null,
    requires_compounding: false,
    compound_type: null,
    compound_data: null,
  },
  {
    id: "generated:otc-pilot:headache",
    mode: "otc",
    difficulty: "easy",
    title: "Case Scenario 2: Pain (Headache - OTC Analgesics)",
    prescription_image_url: null,
    electronic_prescription_json: null,
    drugs_required: ["Paracetamol"],
    patient_info_json: {
      age: 30,
      name: "Headache patient",
      gender: "unspecified",
      symptoms: "Mild headache across the forehead for six hours",
      allergies: "none",
      current_meds: "none",
      medical_conditions: "none",
    },
    correct_answer_json: {
      scenario_setting: "A patient visits a community pharmacy requesting pain relief.",
      questions: [
        {
          q: "Confirm who needs the medicine.",
          choices: [
            "Hello. Who is the medicine for?",
            "Which antibiotic do you want?",
            "Is this for a skin rash?",
            "Do you want a sedating medicine?",
          ],
          correct: 0,
          patient_response: "It's for me.",
        },
        {
          q: "Ask about pain location and character.",
          choices: [
            "Can you describe your pain and where it is located?",
            "Do you want medicine for cough?",
            "Which brand looks cheapest?",
            "Can I give you an antibiotic?",
          ],
          correct: 0,
          patient_response: "I have a mild headache across my forehead.",
        },
        {
          q: "Ask about duration.",
          choices: [
            "How long have you had the headache?",
            "Do you want capsules instead of tablets?",
            "Are you buying this for someone else?",
            "Should I give a strong painkiller?",
          ],
          correct: 0,
          patient_response: "Since this morning, around six hours ago.",
        },
        {
          q: "Ask about prior treatment.",
          choices: [
            "Have you taken any medicine or tried anything to relieve it?",
            "Do you want two packs?",
            "Do you need medicine for allergy?",
            "Do you want an injection?",
          ],
          correct: 0,
          patient_response: "No, I just drank some water and rested, but it didn't help much.",
        },
        {
          q: "Screen contraindications and current medicines.",
          choices: [
            "Do you have any allergies, stomach ulcers, liver disease, or are you taking any other medicines?",
            "Do you prefer orange flavor?",
            "Should I give this without checking your history?",
            "Do you want antibiotics with it?",
          ],
          correct: 0,
          patient_response: "No, I don't have any medical problems and I'm not taking any medicines.",
        },
      ],
      correct_drug: "Paracetamol 500mg",
      drug_options: ["Paracetamol 500mg", "Ibuprofen 400mg", "Amoxicillin 500mg", "Tramadol 50mg"],
      correct_dose: "500-1000mg every 4-6 hours, max 4g/day",
      dose_options: [
        "500-1000mg every 4-6 hours, max 4g/day",
        "2g every 2 hours",
        "500mg once weekly",
        "Take the whole strip at once",
      ],
      correct_quantity: 1,
      correct_advice: "Take with water, avoid other paracetamol products, and see a doctor if headache is severe, unusual, or lasts more than 3 days.",
      advice_options: [
        "Take with water, avoid other paracetamol products, and see a doctor if headache is severe, unusual, or lasts more than 3 days.",
        "Take double doses if the pain returns.",
        "Combine with alcohol for faster relief.",
        "Ignore worsening headache unless it lasts a month.",
      ],
    },
    explanation: "The presentation is a mild uncomplicated headache with no stated red flags. Paracetamol is an appropriate OTC analgesic after screening contraindications and current medicines.",
    mentor_tip: "For OTC pain relief, screen red flags and check liver disease, alcohol use, allergies, pregnancy, ulcers, and interacting medicines before recommending.",
    created_at: "2026-07-02T00:00:00.000Z",
    formula_json: null,
    shipment_json: null,
    requires_compounding: false,
    compound_type: null,
    compound_data: null,
  },
] as const;

function buildOtcPilotFallbackCase(index: number, idOverride?: string) {
  const pilotCase = structuredCloneSafe(OTC_PILOT_FALLBACK_CASES[index] ?? OTC_PILOT_FALLBACK_CASES[0]);
  return idOverride ? { ...pilotCase, id: idOverride } : pilotCase;
}

async function fetchTemplateCase(
  mode: Mode,
  selectedDifficulty: Difficulty,
  userId?: string,
  playerLevel = 1,
) {
  const difficulties = weightedDifficulties(selectedDifficulty, playerLevel);
  const { data: templates, error } = await (supabase as any)
    .from("case_templates")
    .select("*")
    .eq("mode", mode)
    .in("difficulty", difficulties);
  if (error) {
    console.warn("case template fetch failed", error);
    return null;
  }
  if (!templates?.length) return null;

  const seenSeeds = await fetchSeenSeeds(userId, mode);
  const shuffled = shuffle(templates as TemplateRow[]);
  for (const template of shuffled) {
    const generated = await generateCaseFromTemplate(template, seenSeeds, userId);
    if (generated) return generated;
  }
  return null;
}

async function fetchSeenSeeds(userId: string | undefined, mode: Mode) {
  if (!userId) return new Set<string>();
  const { data } = await (supabase as any)
    .from("user_seen_cases")
    .select("template_id, generated_seed")
    .eq("user_id", userId)
    .eq("mode", mode)
    .not("generated_seed", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(10);
  return new Set((data ?? []).map((row: any) => `${row.template_id}:${row.generated_seed}`));
}

async function generateCaseFromTemplate(template: TemplateRow, seenSeeds: Set<string>, userId?: string) {
  const rules = template.variation_rules ?? {};
  const patients = Array.isArray(rules.patient_pool) ? rules.patient_pool : [];
  const drugIds = Array.isArray(rules.drug_pool) ? rules.drug_pool.map(String).filter(Boolean) : [];
  if (!patients.length || !drugIds.length) return null;

  const { data: poolDrugs } = await supabase
    .from("drugs")
    .select("*")
    .in("id", drugIds);
  const drugs = (poolDrugs ?? []) as DrugRow[];
  if (!drugs.length) return null;

  const { data: allDrugData } = await supabase.from("drugs").select("*");
  const allDrugs = (allDrugData ?? []) as DrugRow[];

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const patient = randomItem(patients);
    const correctDrug = chooseCorrectDrug(drugs, patient, rules);
    if (!correctDrug) continue;
    const seed = buildSeed(patient, correctDrug);
    if (seenSeeds.has(`${template.id}:${seed}`)) continue;
    const generated = buildGeneratedCase(template, patient, correctDrug, allDrugs, seed);
    await rememberGeneratedCase(userId, template, seed);
    return generated;
  }

  const patient = randomItem(patients);
  const correctDrug = chooseCorrectDrug(drugs, patient, rules) ?? randomItem(drugs);
  const seed = buildSeed(patient, correctDrug);
  const generated = buildGeneratedCase(template, patient, correctDrug, allDrugs, seed);
  await rememberGeneratedCase(userId, template, seed);
  return generated;
}

function buildGeneratedCase(template: TemplateRow, patientRule: any, correctDrug: DrugRow, allDrugs: DrugRow[], seed: string) {
  const base = structuredCloneSafe(template.base_scenario ?? {});
  const age = randomAge(patientRule?.age_range);
  const patient = {
    name: patientRule?.name ?? "Training Patient",
    age,
    gender: patientRule?.gender ?? "unspecified",
    allergies: normalizeAllergies(patientRule).join(", ") || "none",
    ...(base.patient_info_json ?? {}),
  };
  const dose = randomDose(template.variation_rules?.dose_range);
  const distractors = pickDistractors(correctDrug, allDrugs, 3).map((drug) => drug.name);
  const drugOptions = shuffle([correctDrug.name, ...distractors]);
  const label = labelForDrug(correctDrug, dose);
  const correctAnswer = buildCorrectAnswer(template.mode, base.correct_answer_json ?? {}, correctDrug, drugOptions, label, dose);
  const rxItems = base.electronic_prescription_json?.items?.length
    ? base.electronic_prescription_json.items
    : [{ drug: correctDrug.name, strength: dose ? `${dose}` : correctDrug.dosage ?? "", sig: `${label.frequency}, ${label.timing}, ${label.duration}` }];

  return interpolateObject({
    id: `generated:${template.id}:${seed}`,
    mode: template.mode,
    difficulty: template.difficulty,
    title: base.title ?? template.template_name ?? "Generated case",
    prescription_image_url: base.prescription_image_url ?? null,
    electronic_prescription_json: {
      ...(base.electronic_prescription_json ?? {}),
      patient: patient.name,
      items: rxItems,
    },
    drugs_required: [correctDrug.name],
    patient_info_json: patient,
    correct_answer_json: correctAnswer,
    explanation: base.explanation ?? `Use ${correctDrug.name} when it matches the indication and patient-specific safety checks.`,
    mentor_tip: base.mentor_tip ?? "Check allergies, indication, and dose before deciding.",
    created_at: new Date().toISOString(),
    is_generated: true,
    template_id: template.id,
    generated_seed: seed,
  }, {
    patient: patient.name,
    age: String(age),
    drug: correctDrug.name,
    dose: dose ?? correctDrug.dosage ?? "",
  });
}

function buildCorrectAnswer(mode: Mode, baseAnswer: any, correctDrug: DrugRow, drugOptions: string[], label: any, dose: string) {
  if (mode === "otc") {
    return {
      ...baseAnswer,
      correct_drug: correctDrug.name,
      drug_options: drugOptions,
      correct_dose: baseAnswer.correct_dose ?? dose ?? correctDrug.dosage ?? "Use as directed",
      dose_options: baseAnswer.dose_options ?? [dose || "Use as directed", "Double dose every hour", "Once weekly"],
      correct_advice: baseAnswer.correct_advice ?? "Use the recommended dose and seek help if symptoms worsen.",
      advice_options: baseAnswer.advice_options ?? [
        "Use the recommended dose and seek help if symptoms worsen.",
        "Take extra doses if pain continues.",
        "Ignore allergy history.",
      ],
      correct_quantity: baseAnswer.correct_quantity ?? 1,
    };
  }
  if (mode === "hospital") {
    return {
      ...baseAnswer,
      drugs: [
        {
          drug: correctDrug.name,
          dose: dose.replace(/[^0-9.]/g, "") || "",
          route: baseAnswer.route ?? "oral",
          frequency: label.frequency,
        },
      ],
      remove: baseAnswer.remove ?? [],
    };
  }
  return {
    ...baseAnswer,
    labels: {
      ...(baseAnswer.labels ?? {}),
      [correctDrug.name]: label,
    },
  };
}

function chooseCorrectDrug(drugs: DrugRow[], patient: any, rules: any) {
  const allergies = normalizeAllergies(patient);
  const variants = Array.isArray(rules.allergy_variants) ? rules.allergy_variants : [];
  let candidates = [...drugs];
  for (const variant of variants) {
    const allergy = String(variant?.allergy ?? "").toLowerCase();
    if (!allergy || !allergies.some((item) => item.toLowerCase().includes(allergy))) continue;
    const avoidNames = new Set((variant.avoid_names ?? []).map((item: unknown) => String(item).toLowerCase()));
    const preferNames = new Set((variant.prefer_names ?? []).map((item: unknown) => String(item).toLowerCase()));
    const preferred = candidates.filter((drug) => preferNames.has(drug.name.toLowerCase()));
    candidates = (preferred.length ? preferred : candidates).filter((drug) => !avoidNames.has(drug.name.toLowerCase()));
  }
  return candidates.length ? randomItem(candidates) : null;
}

function pickDistractors(correctDrug: DrugRow, allDrugs: DrugRow[], count: number) {
  const sameCategory = allDrugs.filter((drug) =>
    drug.id !== correctDrug.id &&
    (drug.category === correctDrug.category || drug.drug_class === correctDrug.drug_class)
  );
  return shuffle(sameCategory).slice(0, count);
}

function weightedDifficulties(selected: Difficulty, level: number): Difficulty[] {
  if (level >= 8) return uniqueDifficulties([selected, "medium", "hard", "easy"]);
  if (level >= 4) return uniqueDifficulties([selected, "easy", "medium"]);
  return uniqueDifficulties([selected, "easy"]);
}

function uniqueDifficulties(values: Difficulty[]) {
  return [...new Set(values)];
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function randomAge(range: unknown) {
  if (!Array.isArray(range) || range.length < 2) return 35;
  const min = Number(range[0]);
  const max = Number(range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 35;
  return Math.round(min + Math.random() * (max - min));
}

function randomDose(range: any) {
  if (!range || typeof range !== "object") return "";
  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  const step = max > 100 ? 50 : 5;
  const raw = min + Math.random() * (max - min);
  const rounded = Math.max(min, Math.round(raw / step) * step);
  return `${rounded} ${range.unit ?? "mg"}`;
}

function normalizeAllergies(patient: any) {
  const raw = patient?.allergies ?? patient?.allergy ?? [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw && raw.toLowerCase() !== "none") return [raw];
  return [];
}

function labelForDrug(drug: DrugRow, dose: string) {
  const text = `${drug.dosage ?? ""} ${dose}`.toLowerCase();
  return {
    frequency: text.includes("three") || text.includes("tid") ? "three times daily" : text.includes("twice") || text.includes("bid") ? "twice daily" : "once daily",
    timing: text.includes("food") ? "with food" : "morning",
    duration: drug.category?.toLowerCase().includes("antibiotic") || drug.drug_class?.toLowerCase().includes("antibiotic") ? "7 days" : "ongoing",
  };
}

function buildSeed(patient: any, drug: DrugRow) {
  return `${String(patient?.name ?? "patient").toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${drug.id}`;
}

async function rememberGeneratedCase(userId: string | undefined, template: TemplateRow, seed: string) {
  if (!userId) return;
  const { data: existing } = await (supabase as any)
    .from("user_seen_cases")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", template.id)
    .eq("generated_seed", seed)
    .maybeSingle();
  if (existing?.id) {
    await (supabase as any)
      .from("user_seen_cases")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }
  await (supabase as any)
    .from("user_seen_cases")
    .insert({
      user_id: userId,
      mode: template.mode,
      template_id: template.id,
      generated_seed: seed,
      last_seen_at: new Date().toISOString(),
    });
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function interpolateObject<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`) as T;
  }
  if (Array.isArray(value)) return value.map((item) => interpolateObject(item, vars)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateObject(item, vars)])) as T;
  }
  return value;
}
