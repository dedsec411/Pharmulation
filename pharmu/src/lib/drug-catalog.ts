/**
 * The shelves a learner can open when dispensing.
 *
 * This list, not the database, decides what appears: the shelf builds its
 * categories by walking these names. Five categories the drugs table actually
 * uses were missing from it - Immunology, Psychiatric, Oncology, Emergency and
 * Anesthetic - which left fifty real medicines with no shelf to be found on,
 * including every antidepressant and all the emergency drugs. Anything added to
 * `drugs.category` has to be added here too or it simply will not show.
 */
export const RX_DRUG_CATEGORIES = [
  "Antibiotic",
  "Cardiovascular",
  "Analgesic",
  "Antidiabetic",
  "GI",
  "Respiratory",
  "Antihistamine",
  "Psychiatric",
  "Immunology",
  "Oncology",
  "Emergency",
  "Anesthetic",
  "Topical",
  "Ophthalmic",
  "Nasal",
  "Supplement",
];
// Cap on the synthetic catalogue. It truncates by list order, so a category
// seeded near the end used to be dropped entirely - the topical shelf vanished
// and athlete's foot had no dispensable answer. Kept above the seed count so
// every category survives; raise it alongside any new seeds.
const TARGET_CATALOG_SIZE = 320;

type DrugLike = {
  id?: string;
  name: string;
  generic_name?: string | null;
  drug_class?: string | null;
  category?: string | null;
  indications?: string[] | null;
  dosage?: string | null;
  side_effects?: string[] | null;
  contraindications?: string[] | null;
  interactions?: string[] | null;
  created_at?: string;
};

export const BRAND_LIBRARY: Record<string, string[]> = {
  paracetamol: ["Panadol", "Calpol", "Tylenol", "Crocin", "Dolo", "Fevadol", "Disprol", "Pacimol"],
  acetaminophen: ["Tylenol", "Panadol", "Calpol", "Mapap", "Ofirmev"],
  ibuprofen: ["Brufen", "Advil", "Nurofen", "Motrin", "Ibugesic", "Ibumetin", "Ibuflam"],
  aspirin: ["Disprin", "Bayer Aspirin", "Ecotrin", "Aspro", "Angettes"],
  diclofenac: ["Voltaren", "Cataflam", "Voveran", "Dicloran", "Diclomax"],
  naproxen: ["Naprosyn", "Aleve", "Anaprox", "Naprogesic", "Naxen"],
  tramadol: ["Ultram", "Tramal", "Zydol", "Tradol", "Contramal"],
  "mefenamic acid": ["Ponstan", "Meftal", "Mefkind", "Mefen"],
  celecoxib: ["Celebrex", "Celbexx", "Cobix", "Selecap"],
  ketorolac: ["Toradol", "Ketanov", "Ketorol", "Acular"],
  amoxicillin: ["Amoxil", "Moxatag", "Trimox", "Wymox", "Amoxipen"],
  "co-amoxiclav": ["Augmentin", "Co-amoxiclav", "Clavam", "Curam", "Clavulin"],
  "amoxicillin/clavulanate": ["Augmentin", "Co-amoxiclav", "Clavam", "Curam", "Clavulin"],
  azithromycin: ["Zithromax", "Zmax", "Azomax", "Azee", "Zetro"],
  ciprofloxacin: ["Cipro", "Ciprobay", "Cifran", "Ciproxin", "Ciplox"],
  doxycycline: ["Vibramycin", "Doryx", "Monodox", "Doxycin"],
  metronidazole: ["Flagyl", "Metrogel", "Metrogyl", "Protostat"],
  cefixime: ["Suprax", "Cefspan", "Cefix", "Fixit", "Oroken"],
  clarithromycin: ["Biaxin", "Klacid", "Clacid", "Claritek"],
  cefuroxime: ["Zinnat", "Ceftin", "Cefur", "Cefogen"],
  cephalexin: ["Keflex", "Ceporex", "Sporidex", "Lexin"],
  levofloxacin: ["Levaquin", "Tavanic", "Levoday", "Levobact"],
  metformin: ["Glucophage", "Fortamet", "Glumetza", "Riomet", "Siofor", "Glycomet"],
  glimepiride: ["Amaryl", "Glimy", "Glimestar", "Glypride"],
  gliclazide: ["Diamicron", "Glyloc", "Glizid", "Glicron"],
  sitagliptin: ["Januvia", "Istavel", "Xelevia", "Sita"],
  empagliflozin: ["Jardiance", "Gibtulio", "Empa", "Emfozin"],
  dapagliflozin: ["Farxiga", "Forxiga", "Dapazin", "Daplozin"],
  linagliptin: ["Trajenta", "Tradjenta", "Lina", "Linatab"],
  pioglitazone: ["Actos", "Pioz", "Glustin", "Pioglar"],
  insulin: ["Humulin", "Novolin", "Lantus", "NovoRapid", "Levemir", "Apidra"],
  atorvastatin: ["Lipitor", "Atorva", "Sortis", "Torvast", "Atorlip"],
  simvastatin: ["Zocor", "Simvador", "Simlup", "Simvacor"],
  rosuvastatin: ["Crestor", "Rosuvas", "Rosulip", "Rovista"],
  losartan: ["Cozaar", "Losacar", "Repace", "Losar", "Lortan"],
  amlodipine: ["Norvasc", "Amlor", "Istin", "Amlovas", "Amlocard"],
  atenolol: ["Tenormin", "Aten", "Atecard", "Atenova"],
  bisoprolol: ["Concor", "Zebeta", "Biselect", "Bisocor"],
  enalapril: ["Renitec", "Vasotec", "Enap", "Envas"],
  furosemide: ["Lasix", "Frusemide", "Frusid", "Diuver"],
  clopidogrel: ["Plavix", "Clopilet", "Clavix", "Deplatt"],
  omeprazole: ["Losec", "Prilosec", "Omez", "Zegerid", "Risek"],
  pantoprazole: ["Protonix", "Somac", "Pantoloc", "Pantozol"],
  esomeprazole: ["Nexium", "Esotrex", "Esozal", "Esomac"],
  domperidone: ["Motilium", "Domstal", "Domperon", "Motinorm"],
  loperamide: ["Imodium", "Lopamide", "Lopedium", "Entrocalm"],
  lactulose: ["Duphalac", "Lactulax", "Looz", "Lactugal"],
  cetirizine: ["Zyrtec", "Reactine", "Cetzine", "Allertec", "Cetcip"],
  loratadine: ["Claritin", "Alavert", "Clarityn", "Lorfast"],
  fexofenadine: ["Allegra", "Telfast", "Fexet", "Fastofen"],
  salbutamol: ["Ventolin", "Asthalin", "Airomir", "Salamol"],
  albuterol: ["Ventolin", "ProAir", "Proventil", "AccuNeb"],
  montelukast: ["Singulair", "Montair", "Montek", "Montiget"],
  budesonide: ["Pulmicort", "Budecort", "Budenase", "Rhinocort"],
};

type CatalogSeed = {
  name: string;
  category: string;
  drugClass: string;
  indications: string[];
  dosage: string;
  genericName?: string;
};

const catalogSeeds: CatalogSeed[] = [
  ...makeSeeds("Antibiotic", "Penicillin antibiotic", ["Respiratory infection", "ENT infection"], "500 mg every 8 hours", [
    "Amoxicillin", "Ampicillin", "Penicillin V", "Flucloxacillin", "Cloxacillin", "Piperacillin/Tazobactam",
  ]),
  ...makeSeeds("Antibiotic", "Cephalosporin antibiotic", ["UTI", "Respiratory infection"], "200-500 mg once or twice daily", [
    "Cefixime", "Cefuroxime", "Cephalexin", "Ceftriaxone", "Cefotaxime", "Cefpodoxime", "Cefaclor", "Ceftazidime",
  ]),
  ...makeSeeds("Antibiotic", "Macrolide antibiotic", ["Atypical respiratory infection", "ENT infection"], "500 mg once daily as directed", [
    "Azithromycin", "Clarithromycin", "Erythromycin", "Roxithromycin",
  ]),
  ...makeSeeds("Antibiotic", "Fluoroquinolone antibiotic", ["Complicated UTI", "Lower respiratory infection"], "250-750 mg once or twice daily", [
    "Ciprofloxacin", "Levofloxacin", "Moxifloxacin", "Ofloxacin", "Norfloxacin",
  ]),
  ...makeSeeds("Antibiotic", "Tetracycline antibiotic", ["Acne", "Atypical infection"], "100 mg once or twice daily", [
    "Doxycycline", "Minocycline", "Tetracycline",
  ]),
  ...makeSeeds("Antibiotic", "Nitroimidazole antibiotic", ["Anaerobic infection", "Dental infection"], "400-500 mg two to three times daily", [
    "Metronidazole", "Tinidazole", "Secnidazole",
  ]),
  ...makeSeeds("Antibiotic", "Antibiotic combination", ["Mixed bacterial infection"], "Use according to local protocol", [
    "Co-amoxiclav", "Sulfamethoxazole/Trimethoprim", "Clindamycin", "Nitrofurantoin", "Fosfomycin", "Linezolid", "Vancomycin", "Gentamicin", "Meropenem",
  ]),
  ...makeSeeds("Cardiovascular", "Statin", ["Hyperlipidemia", "ASCVD risk reduction"], "10-40 mg once daily", [
    "Atorvastatin", "Simvastatin", "Rosuvastatin", "Pravastatin", "Fluvastatin", "Pitavastatin",
  ]),
  ...makeSeeds("Cardiovascular", "Antihypertensive", ["Hypertension", "Cardiovascular risk reduction"], "Once daily as titrated", [
    "Amlodipine", "Nifedipine", "Diltiazem", "Verapamil", "Losartan", "Valsartan", "Telmisartan", "Olmesartan", "Enalapril", "Lisinopril", "Ramipril", "Captopril",
  ]),
  ...makeSeeds("Cardiovascular", "Beta blocker", ["Hypertension", "Angina", "Rate control"], "Once or twice daily as prescribed", [
    "Atenolol", "Bisoprolol", "Metoprolol", "Carvedilol", "Propranolol", "Nebivolol",
  ]),
  ...makeSeeds("Cardiovascular", "Diuretic", ["Edema", "Hypertension", "Heart failure"], "Morning dosing as prescribed", [
    "Furosemide", "Hydrochlorothiazide", "Spironolactone", "Indapamide", "Bumetanide", "Torasemide",
  ]),
  ...makeSeeds("Cardiovascular", "Antiplatelet / anticoagulant", ["Thrombosis prevention", "ASCVD secondary prevention"], "Once daily or per INR/renal protocol", [
    "Clopidogrel", "Warfarin", "Rivaroxaban", "Apixaban", "Dabigatran", "Aspirin Cardio", "Isosorbide Mononitrate", "Nitroglycerin", "Digoxin",
  ]),
  ...makeSeeds("Analgesic", "Non-opioid analgesic", ["Pain", "Fever"], "500 mg every 6 hours as needed", [
    "Paracetamol", "Acetaminophen", "Aspirin", "Metamizole",
  ]),
  ...makeSeeds("Analgesic", "NSAID", ["Pain", "Inflammation"], "Take with food as directed", [
    "Ibuprofen", "Diclofenac", "Naproxen", "Mefenamic Acid", "Ketorolac", "Piroxicam", "Meloxicam", "Indomethacin", "Etodolac", "Aceclofenac", "Lornoxicam", "Dexketoprofen", "Tenoxicam", "Sulindac",
  ]),
  ...makeSeeds("Analgesic", "COX-2 inhibitor", ["Osteoarthritis", "Inflammatory pain"], "Once or twice daily as prescribed", [
    "Celecoxib", "Etoricoxib", "Parecoxib",
  ]),
  ...makeSeeds("Analgesic", "Opioid analgesic", ["Moderate to severe pain"], "Use the lowest effective dose for the shortest duration", [
    "Tramadol", "Codeine", "Morphine", "Oxycodone", "Tapentadol", "Buprenorphine",
  ]),
  ...makeSeeds("Analgesic", "Neuropathic pain agent", ["Neuropathic pain"], "Start low and titrate gradually", [
    "Gabapentin", "Pregabalin", "Duloxetine", "Amitriptyline", "Capsaicin",
  ]),
  ...makeSeeds("Antidiabetic", "Biguanide", ["Type 2 diabetes"], "500 mg once or twice daily with meals", [
    "Metformin",
  ]),
  ...makeSeeds("Antidiabetic", "Sulfonylurea", ["Type 2 diabetes"], "Once daily with breakfast", [
    "Glimepiride", "Gliclazide", "Glipizide", "Glibenclamide", "Tolbutamide",
  ]),
  ...makeSeeds("Antidiabetic", "DPP-4 inhibitor", ["Type 2 diabetes"], "Once daily", [
    "Sitagliptin", "Linagliptin", "Vildagliptin", "Saxagliptin", "Alogliptin",
  ]),
  ...makeSeeds("Antidiabetic", "SGLT2 inhibitor", ["Type 2 diabetes", "Heart failure risk reduction"], "Once daily in the morning", [
    "Empagliflozin", "Dapagliflozin", "Canagliflozin", "Ertugliflozin",
  ]),
  ...makeSeeds("Antidiabetic", "GLP-1 receptor agonist", ["Type 2 diabetes", "Weight management support"], "Inject or take according to product schedule", [
    "Semaglutide", "Liraglutide", "Dulaglutide", "Exenatide",
  ]),
  ...makeSeeds("Antidiabetic", "Insulin", ["Diabetes requiring insulin"], "Dose individualized by glucose profile", [
    "Insulin Regular", "Insulin NPH", "Insulin Glargine", "Insulin Detemir", "Insulin Aspart", "Insulin Lispro", "Insulin Degludec",
  ]),
  ...makeSeeds("Antidiabetic", "Thiazolidinedione / alpha-glucosidase inhibitor", ["Type 2 diabetes"], "Use as prescribed with monitoring", [
    "Pioglitazone", "Acarbose",
  ]),
  ...makeSeeds("GI", "PPI", ["GERD", "Dyspepsia", "Ulcer prophylaxis"], "Once daily before breakfast", [
    "Omeprazole", "Pantoprazole", "Esomeprazole", "Lansoprazole", "Rabeprazole", "Dexlansoprazole",
  ]),
  ...makeSeeds("GI", "H2 blocker", ["Dyspepsia", "Reflux symptoms"], "Once or twice daily", [
    "Famotidine", "Ranitidine", "Cimetidine", "Nizatidine",
  ]),
  ...makeSeeds("GI", "Antiemetic / prokinetic", ["Nausea", "Vomiting"], "Before meals as prescribed", [
    "Domperidone", "Metoclopramide", "Ondansetron", "Prochlorperazine", "Meclizine",
  ]),
  ...makeSeeds("GI", "Antidiarrheal / laxative", ["Diarrhea", "Constipation"], "Use according to symptoms and hydration status", [
    "Loperamide", "ORS", "Lactulose", "Polyethylene Glycol", "Bisacodyl", "Senna", "Docusate Sodium", "Psyllium Husk",
  ]),
  ...makeSeeds("GI", "Antacid / mucosal protection", ["Heartburn", "Gastric irritation"], "After meals or as directed", [
    "Sucralfate", "Aluminium Hydroxide", "Magnesium Hydroxide", "Calcium Carbonate", "Simethicone", "Bismuth Subsalicylate", "Hyoscine Butylbromide",
  ]),
  ...makeSeeds("Respiratory", "Antihistamine", ["Allergic rhinitis", "Urticaria"], "Once daily or as needed", [
    "Cetirizine", "Loratadine", "Fexofenadine", "Levocetirizine", "Desloratadine", "Chlorpheniramine", "Diphenhydramine", "Hydroxyzine",
  ]),
  ...makeSeeds("Respiratory", "Bronchodilator", ["Bronchospasm", "Asthma symptoms"], "Use inhaler according to action plan", [
    "Salbutamol", "Albuterol", "Terbutaline", "Ipratropium", "Tiotropium", "Salmeterol", "Formoterol", "Theophylline",
  ]),
  ...makeSeeds("Respiratory", "Inhaled corticosteroid", ["Asthma control", "Airway inflammation"], "Use daily and rinse mouth after use", [
    "Budesonide", "Beclomethasone", "Fluticasone", "Mometasone", "Ciclesonide",
  ]),
  ...makeSeeds("Respiratory", "Leukotriene / cough and cold", ["Asthma", "Allergic rhinitis", "Cough symptoms"], "Use according to product directions", [
    "Montelukast", "Zafirlukast", "Ambroxol", "Bromhexine", "Guaifenesin", "Dextromethorphan", "Pseudoephedrine", "Phenylephrine", "Oxymetazoline", "Xylometazoline", "Fluticasone/Salmeterol", "Budesonide/Formoterol", "Ipratropium/Salbutamol",
  ]),
  // Topical shelf. Stocked here rather than relying on a database row, so an
  // OTC case whose answer is a cream stays winnable regardless of what the
  // `drugs` table happens to contain.
  ...makeSeeds("Topical", "Topical antifungal", ["Athlete's foot", "Fungal skin infection"], "Apply thinly two to three times daily", [
    "Clotrimazole cream", "Miconazole cream", "Terbinafine cream", "Ketoconazole cream",
  ]),
  ...makeSeeds("Topical", "Topical corticosteroid / antibiotic", ["Skin inflammation", "Localised skin infection"], "Apply thinly as directed", [
    "Hydrocortisone cream", "Betamethasone cream", "Mupirocin", "Fusidic Acid cream",
  ]),
];

const supplementalDrugs: DrugLike[] = catalogSeeds.map((entry) =>
  drug(entry.name, entry.genericName ?? entry.name, entry.category, entry.drugClass, entry.indications, entry.dosage),
);

catalogSeeds.forEach((entry) => {
  const key = normalizeDrugKey(entry.genericName ?? entry.name);
  if (!BRAND_LIBRARY[key]) BRAND_LIBRARY[key] = buildTrainingBrands(entry.name);
});

function drug(name: string, genericName: string, category: string, drugClass: string, indications: string[], dosage: string): DrugLike {
  return {
    id: `catalog-${normalizeDrugKey(name).replace(/[^a-z0-9]+/g, "-")}`,
    name,
    generic_name: genericName,
    category,
    drug_class: drugClass,
    indications,
    dosage,
    side_effects: ["GI upset", "Headache", "Dizziness"],
    contraindications: ["Known hypersensitivity"],
    interactions: [],
    created_at: "2026-06-30T00:00:00.000Z",
  };
}

export function normalizeDrugCategory(category?: string | null) {
  const value = (category ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (value.includes("analgesic")) return "Analgesic";
  if (value.includes("anti diabetic") || value.includes("antidiabetic") || value.includes("diabetes")) return "Antidiabetic";
  if (value.includes("antibiotic")) return "Antibiotic";
  if (value.includes("cardio")) return "Cardiovascular";
  if (value === "gi" || value.includes("gastro")) return "GI";
  if (value.includes("respir")) return "Respiratory";
  return category || "Other";
}

export function prepareDrugCatalog(drugs: DrugLike[]) {
  const normalized = drugs.map((d) => ({ ...d, category: normalizeDrugCategory(d.category) }));
  const byName = new Map<string, DrugLike>();
  normalized.forEach((d) => {
    const key = normalizeDrugKey(d.name);
    if (!byName.has(key)) byName.set(key, d);
  });
  for (const d of supplementalDrugs) {
    if (byName.size >= TARGET_CATALOG_SIZE) break;
    const key = normalizeDrugKey(d.name);
    if (!byName.has(key)) byName.set(key, d);
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeDrugKey(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\b(tablet|capsule|syrup|suspension|injection|cream|ointment|gel|solution)\b/g, "")
    .replace(/\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|%)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Real brands loaded from the database, keyed by lowercase generic name.
 * Populated once by the drugs page so the dispensing shelf can offer genuine
 * brands where they exist, and fall back to generated training names where
 * they do not. Kept module-level rather than threaded through every shelf.
 */
/** A brand as it is dispensed: the name on the box and who makes it. */
export type BrandOption = { brand: string; company?: string | null };

/**
 * How many brands a learner chooses between.
 *
 * Three is the brief, and it is also about right: enough that recognising the
 * brand is a real decision, few enough that it is not a memory test.
 */
export const MAX_BRANDS_PER_DRUG = 3;

let realBrands: Record<string, BrandOption[]> = {};

export function setRealBrands(byGeneric: Record<string, BrandOption[]>) {
  realBrands = byGeneric;
}

export function getBrandsForDrug(drug: DrugLike): BrandOption[] {
  // A real brand beats a generated one wherever we have it.
  const generic = String(drug?.generic_name || drug?.name || "").toLowerCase().trim();
  if (realBrands[generic]?.length) return realBrands[generic].slice(0, MAX_BRANDS_PER_DRUG);

  const candidates = [
    normalizeDrugKey(drug?.generic_name),
    normalizeDrugKey(drug?.name),
    normalizeDrugKey(String(drug?.name ?? "").split("+")[0]),
  ].filter(Boolean);
  const named = (names: string[]): BrandOption[] =>
    names.slice(0, MAX_BRANDS_PER_DRUG).map((brand) => ({ brand }));

  const direct = candidates.find((key) => BRAND_LIBRARY[key]);
  if (direct) return named(BRAND_LIBRARY[direct]);
  const partial = Object.keys(BRAND_LIBRARY).find((key) =>
    candidates.some((candidate) => candidate.includes(key) || key.includes(candidate)),
  );
  if (partial) return named(BRAND_LIBRARY[partial]);
  const baseName = drug?.generic_name || drug?.name || "Medicine";
  return named([`${baseName} Generic`, `${baseName} Pharma`, `${baseName} Plus`]);
}

function makeSeeds(
  category: string,
  drugClass: string,
  indications: string[],
  dosage: string,
  names: string[],
): CatalogSeed[] {
  return names.map((name) => ({ name, category, drugClass, indications, dosage }));
}

function buildTrainingBrands(name: string) {
  const clean = name.replace(/\//g, " ").replace(/\s+/g, " ").trim();
  const compact = clean.replace(/[^a-zA-Z0-9]/g, "");
  const stem = compact.length > 10 ? compact.slice(0, 10) : compact;
  return [
    `${clean} Generic`,
    `${stem}Care`,
    `${stem}Plus`,
    `${stem}Pharm`,
    `${stem}Max`,
  ];
}
