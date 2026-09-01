import { useCallback, useEffect, useState } from "react";
import { fetchRandomCase, type Difficulty, type Mode } from "@/lib/game/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveCaseStore } from "@/lib/active-case-store";
import { regimenForDrug } from "@/lib/game/dosing";

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
    // OTC is not loaded here: it runs its own AI consultation off the
    // authored case bank in lib/game/otc-cases.ts.
    const c = await fetchTemplateCase(mode, difficulty, profile?.user_id, profile?.level)
      ?? await fetchRandomCase(mode, difficulty);
    setCaseData(c);
    setActiveCase(c);
    setLoading(false);
  }, [mode, difficulty, profile?.user_id, profile?.level, reloadKey, setActiveCase]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => () => setActiveCase(null), [setActiveCase]);

  return { caseData, loading, next: () => setReloadKey((k) => k + 1) };
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

async function fetchTemplateCase(
  mode: Mode,
  selectedDifficulty: Difficulty,
  userId?: string,
  playerLevel = 1,
) {
  const difficulties = weightedDifficulties(selectedDifficulty, playerLevel);
  const { data: templates, error } = await supabase
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
  const { data } = await supabase
    .from("user_seen_cases")
    .select("template_id, generated_seed")
    .eq("user_id", userId)
    .eq("mode", mode)
    .not("generated_seed", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(10);
  return new Set<string>((data ?? []).map((row: any) => `${row.template_id}:${row.generated_seed}`));
}

async function generateCaseFromTemplate(template: TemplateRow, seenSeeds: Set<string>, userId?: string) {
  const rules = template.variation_rules ?? {};
  const patients = Array.isArray(rules.patient_pool) ? rules.patient_pool : [];
  const drugIds = Array.isArray(rules.drug_pool) ? rules.drug_pool.map(String).filter(Boolean) : [];
  if (!patients.length || !drugIds.length) return null;

  const { data: poolDrugs, error: poolErr } = await supabase
    .from("drugs")
    .select("*")
    .in("id", drugIds);
  // Errors here are non-fatal: the caller falls back to a non-generated case,
  // so log rather than throwing and losing that fallback.
  if (poolErr) console.error("[supabase] failed to load template drug pool:", poolErr);
  const drugs = (poolDrugs ?? []) as DrugRow[];
  if (!drugs.length) return null;

  const { data: allDrugData, error: allDrugErr } = await supabase.from("drugs").select("*");
  if (allDrugErr) console.error("[supabase] failed to load drugs for distractors:", allDrugErr);
  const allDrugs = (allDrugData ?? []) as DrugRow[];

  // A community prescription is written for a brand, not a generic, so the slip
  // needs one. Non-fatal: without it the prescription falls back to the generic
  // name, which is how it read before.
  const { data: brandRows, error: brandErr } = await supabase
    .from("drug_brands").select("drug_id, brand").in("drug_id", drugIds);
  if (brandErr) console.error("[supabase] failed to load brands for prescription:", brandErr);
  const brandsByDrug: Record<string, string[]> = {};
  for (const row of (brandRows ?? []) as any[]) {
    (brandsByDrug[row.drug_id] ??= []).push(row.brand);
  }

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const patient = randomItem(patients);
    const correctDrug = chooseCorrectDrug(drugs, patient, rules);
    if (!correctDrug) continue;
    const seed = buildSeed(patient, correctDrug);
    if (seenSeeds.has(`${template.id}:${seed}`)) continue;
    const generated = buildGeneratedCase(template, patient, correctDrug, allDrugs, seed, brandsByDrug);
    await rememberGeneratedCase(userId, template, seed);
    return generated;
  }

  const patient = randomItem(patients);
  const correctDrug = chooseCorrectDrug(drugs, patient, rules) ?? randomItem(drugs);
  const seed = buildSeed(patient, correctDrug);
  const generated = buildGeneratedCase(template, patient, correctDrug, allDrugs, seed, brandsByDrug);
  await rememberGeneratedCase(userId, template, seed);
  return generated;
}

function buildGeneratedCase(template: TemplateRow, patientRule: any, correctDrug: DrugRow, allDrugs: DrugRow[], seed: string, brandsByDrug: Record<string, string[]> = {}) {
  const base = structuredCloneSafe(template.base_scenario ?? {});
  const age = randomAge(patientRule?.age_range);
  const patient = {
    name: patientRule?.name ?? "Training Patient",
    age,
    gender: patientRule?.gender ?? "unspecified",
    allergies: normalizeAllergies(patientRule).join(", ") || "none",
    ...(base.patient_info_json ?? {}),
  };
  // The drug's own verified regimen, falling back to the template's range only
  // when a drug has no dosage recorded. The range alone produced strengths and
  // frequencies that did not belong to the drug on the slip.
  const regimen = regimenForDrug(correctDrug);
  const dose = regimen?.strength ?? randomDose(template.variation_rules?.dose_range);
  const distractors = pickDistractors(correctDrug, allDrugs, 3).map((drug) => drug.name);
  const drugOptions = shuffle([correctDrug.name, ...distractors]);
  const label = regimen
    ? { frequency: regimen.frequency, timing: regimen.timing, duration: regimen.duration }
    : labelForDrug(correctDrug, dose);
  const correctAnswer = buildCorrectAnswer(template.mode, base.correct_answer_json ?? {}, correctDrug, drugOptions, label, dose);
  const rxItems = base.electronic_prescription_json?.items?.length
    ? base.electronic_prescription_json.items
    : [{
        drug: correctDrug.name,
        // Stable per case: the same seed must not represcribe a different brand.
        brand: pickBrand(brandsByDrug[correctDrug.id] ?? [], seed),
        strength: dose ? `${dose}` : correctDrug.dosage ?? "",
        sig: `${label.frequency}, ${label.timing}, ${label.duration}`,
      }];

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

/** One brand per case, chosen by seed so it never changes under the learner. */
function pickBrand(brands: string[], seed: string): string | null {
  if (!brands.length) return null;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return [...brands].sort()[hash % brands.length];
}

function buildSeed(patient: any, drug: DrugRow) {
  return `${String(patient?.name ?? "patient").toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${drug.id}`;
}

async function rememberGeneratedCase(userId: string | undefined, template: TemplateRow, seed: string) {
  if (!userId) return;
  const { data: existing } = await supabase
    .from("user_seen_cases")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", template.id)
    .eq("generated_seed", seed)
    .maybeSingle();
  if (existing?.id) {
    await supabase
      .from("user_seen_cases")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }
  await supabase
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
    // Both {token} and {{token}}: the seeded templates use the doubled form, and
    // matching only the single one replaced the inner token while leaving the
    // outer braces behind, printing "{Sana Yousaf} - bacterial infection".
    return value.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (whole, doubled, single) => {
      const key = doubled ?? single;
      return vars[key] ?? whole;
    }) as T;
  }
  if (Array.isArray(value)) return value.map((item) => interpolateObject(item, vars)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateObject(item, vars)])) as T;
  }
  return value;
}
