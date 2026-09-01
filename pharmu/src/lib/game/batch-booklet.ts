/**
 * The batch manufacturing record a production pharmacist works from.
 *
 * Deliberately a reference, not an answer key. It explains what each stage is
 * for and what each QC test measures - the knowledge someone is meant to bring
 * to the decision - without naming the correct option for this batch. Printing
 * the answers here would turn every process and QC step into a lookup.
 *
 * The formula and environmental limits are already shown to the operator during
 * weighing and the environmental check, so repeating them here reveals nothing
 * and saves paging back through the run.
 */

export type BookletSection = {
  key: string;
  title: string;
  caption: string;
  entries: { term: string; detail: string; note?: string }[];
};

type Guide = { purpose: string; watchFor: string };

/**
 * What each manufacturing stage is for.
 *
 * Keyed on the stage's own name and on the labels the formulas give it, since a
 * liquid calls its mixing stage "solution mixing" and its compression stage
 * "filtration".
 */
const STAGE_GUIDES: Record<string, Guide> = {
  mixing: {
    purpose: "Distribute the active evenly through the excipients so every unit carries the same dose.",
    watchFor: "Under-blending fails content uniformity. Over-blending with lubricant coats the particles and reduces hardness and dissolution, so lubricant goes in last and blends briefly.",
  },
  blend: {
    purpose: "Distribute the active evenly through the excipients so every unit carries the same dose.",
    watchFor: "Under-blending fails content uniformity. Over-blending with lubricant reduces hardness and dissolution - lubricant is added last and blended only a few minutes.",
  },
  "solution mixing": {
    purpose: "Dissolve the active and excipients completely to a single clear phase.",
    watchFor: "Undissolved particles carry through to fill. Order of addition and temperature both matter; excessive agitation entrains air.",
  },
  granulation: {
    purpose: "Build particle size so the powder flows and compresses, and stop the blend segregating.",
    watchFor: "Wet granulation runs to a binder endpoint judged on impeller torque. Over-wetting gives hard granules and slow dissolution. Dry compaction is used where the active is moisture-sensitive.",
  },
  homogenization: {
    purpose: "Reduce droplet or particle size to a uniform distribution and stabilise the dispersion.",
    watchFor: "Insufficient shear leaves a coarse dispersion that separates on standing; excessive shear can degrade the active or entrain air.",
  },
  dissolution: {
    purpose: "Take the solids fully into solution before further processing.",
    watchFor: "Confirm complete dissolution before proceeding - suspended material will not redissolve later in the process.",
  },
  drying: {
    purpose: "Bring moisture down to the target loss on drying so the granule compresses well and stays stable.",
    watchFor: "Over-drying gives brittle granules that cap and laminate. Under-drying causes sticking, chemical degradation and microbial risk. Inlet temperature is set by the thermal stability of the active.",
  },
  "heat hold": {
    purpose: "Hold at temperature for the validated time to achieve the required reduction in bioburden.",
    watchFor: "Both temperature and time have to be met. A hold that reaches temperature briefly has not delivered the lethality the cycle claims.",
  },
  compression: {
    purpose: "Form units of consistent weight, hardness and thickness.",
    watchFor: "In-process checks run through the whole compression: weight variation, hardness, thickness, friability and disintegration. Capping, lamination and sticking all point back to granule moisture or lubrication.",
  },
  "capsule filling": {
    purpose: "Deliver a consistent fill weight into each shell.",
    watchFor: "Fill weight is checked at set intervals across the run. Poor powder flow shows up as fill weight drift, not as a single bad capsule.",
  },
  filtration: {
    purpose: "Remove particulate and, where required, reduce bioburden before filling.",
    watchFor: "Filter must be of an approved grade and integrity-tested. An unrated filter gives no assurance about what passed through it.",
  },
  "viscosity set": {
    purpose: "Bring the product to its specified viscosity so it pours, doses and suspends as intended.",
    watchFor: "Viscosity is temperature-dependent - it is measured at the specified temperature or the reading means nothing.",
  },
  coating: {
    purpose: "Mask taste, protect from moisture and light, or control where the drug is released.",
    watchFor: "A film coat is typically 2-4% weight gain. An enteric coat needs considerably more, around 6-10%, and an under-coated tablet will rupture in acid - which is a release failure, not a cosmetic one.",
  },
  flavoring: {
    purpose: "Bring taste and appearance to the approved standard for the product.",
    watchFor: "Added late and mixed gently. Flavours are volatile and heat-sensitive.",
  },
  "microbial hold": {
    purpose: "Hold the bulk under defined conditions until microbial results support release to filling.",
    watchFor: "Hold time is limited and specified. Exceeding it requires retesting, not an assumption.",
  },
  packaging: {
    purpose: "Protect the product for its shelf life and carry the correct, legible labelling.",
    watchFor: "Line clearance before the run is what prevents mix-ups. Check batch number, expiry and label reconciliation, and leak-test blisters.",
  },
  "blister packing": {
    purpose: "Seal each unit in its own cavity so it is protected and countable to the last dose.",
    watchFor: "Line clearance first, then seal integrity by leak test. Reconcile printed foil against units packed.",
  },
  "bottle filling": {
    purpose: "Fill to the declared volume with the closure and seal the product was stability-tested in.",
    watchFor: "Check fill volume across the run and confirm the tamper-evident seal is intact.",
  },
  "bottle packing": {
    purpose: "Pack into the container closure system the product was stability-tested in.",
    watchFor: "Desiccant where specified, correct closure torque, and label reconciliation at the end of the run.",
  },
};

type QcGuide = { measures: string; why: string; typical: string };

const QC_GUIDES: Record<string, QcGuide> = {
  "average weight": {
    measures: "Mean unit weight against the target, and the spread around it.",
    why: "For a uniformly blended product, a weight deviation is a dose deviation.",
    typical: "Pharmacopoeial uniformity of mass allows roughly +/-5% for tablets above 250 mg, widening for smaller units.",
  },
  "content uniformity": {
    measures: "How much active is in each of ten individual units, reported as an Acceptance Value.",
    why: "This is where a blending or segregation problem surfaces - an average can be perfect while individual units are not.",
    typical: "Acceptance Value of 15.0 or less on the first ten units.",
  },
  "blend uniformity": {
    measures: "Active concentration sampled from several points in the blender.",
    why: "Catches a poor blend before it is committed to compression or filling.",
    typical: "Commonly 90-110% of target at every sample point with a low relative standard deviation.",
  },
  friability: {
    measures: "Weight lost after a set number of tumbling revolutions.",
    why: "Predicts whether tablets survive coating, packing and transport intact.",
    typical: "Not more than 1.0% weight loss, with no tablet cracked, cleaved or broken.",
  },
  assay: {
    measures: "Total active content of the batch against label claim.",
    why: "The headline potency check - it decides whether the batch is the strength it says it is.",
    typical: "Usually 95-105% of label claim, tightening for narrow therapeutic index products.",
  },
  appearance: {
    measures: "Colour, shape, surface and any printing, against the approved standard.",
    why: "A visual defect often signals a process problem - picking and mottling point back to coating and blending.",
    typical: "Conforms to the approved description, free from visible defects.",
  },
  "fill weight variation": {
    measures: "Individual capsule or sachet fill weights across the run.",
    why: "Fill weight is the dose in a capsule, and poor powder flow shows as drift rather than one bad unit.",
    typical: "Commonly within +/-7.5% to +/-10% of target depending on fill weight.",
  },
  "fill volume": {
    measures: "Delivered volume per container against the declared volume.",
    why: "Under-fill short-changes the patient a dose; over-fill is a give-away and a yield loss.",
    typical: "Not less than the labelled volume, with the average at or above declared.",
  },
  "net content": {
    measures: "Contents of the final pack against what the label declares.",
    why: "A legal requirement as much as a quality one.",
    typical: "Meets the pharmacopoeial minimum fill requirement.",
  },
  ph: {
    measures: "Acidity or alkalinity of the finished liquid.",
    why: "pH drives both the stability of the active and how the product tastes and tolerates.",
    typical: "Within the narrow range set for the formulation, measured at the specified temperature.",
  },
  viscosity: {
    measures: "Resistance to flow at a stated temperature and spindle speed.",
    why: "Determines pourability, dosing accuracy and whether a suspension stays suspended.",
    typical: "Within the specified range, measured at the temperature the specification names.",
  },
  "microbial limit": {
    measures: "Total aerobic and yeast/mould counts, plus absence of specified organisms.",
    why: "Non-sterile products still have limits, and water-containing products are the vulnerable ones.",
    typical: "Counts under the limit for the route, with specified pathogens absent in the sample tested.",
  },
};

const normalize = (value: string) => value.toLowerCase().trim();

export function stageGuide(stageOrLabel: string): Guide | null {
  return STAGE_GUIDES[normalize(stageOrLabel)] ?? null;
}

export function qcGuide(test: string): QcGuide | null {
  return QC_GUIDES[normalize(test)] ?? null;
}

export type BookletInput = {
  product: string;
  batchSize: string;
  batchNumber: string;
  ingredients: { name: string; role: string; target: number; min: number; max: number; unit: string }[];
  env: { tempRange: [number, number]; humidityRange: [number, number] };
  /** Stage keys in running order, with the label this product gives each one. */
  stages: { key: string; label: string }[];
  qc: { test: string }[];
};

export function buildBooklet(input: BookletInput): BookletSection[] {
  const sections: BookletSection[] = [];

  sections.push({
    key: "formula",
    title: "Master formula",
    caption: `${input.product} - ${input.batchSize}, batch ${input.batchNumber}`,
    entries: input.ingredients.map((ing) => ({
      term: ing.name,
      detail: `${ing.target} ${ing.unit} target`,
      note: `${ing.role} - acceptable ${ing.min}-${ing.max} ${ing.unit}`,
    })),
  });

  sections.push({
    key: "environment",
    title: "Environmental limits",
    caption: "The room has to meet these before material is weighed into it.",
    entries: [
      {
        term: "Temperature",
        detail: `${input.env.tempRange[0]}-${input.env.tempRange[1]} deg C`,
        note: "Set by the thermal stability of the active and the process being run.",
      },
      {
        term: "Relative humidity",
        detail: `${input.env.humidityRange[0]}-${input.env.humidityRange[1]}% RH`,
        note: "Hygroscopic material picks up moisture during weighing, which changes both potency per gram and how the granule behaves later.",
      },
    ],
  });

  const stageEntries = input.stages
    .map(({ key, label }) => {
      const guide = stageGuide(label) ?? stageGuide(key);
      if (!guide) return null;
      return { term: label, detail: guide.purpose, note: guide.watchFor };
    })
    .filter((entry): entry is { term: string; detail: string; note: string } => entry !== null);

  if (stageEntries.length) {
    sections.push({
      key: "preparation",
      title: "Preparation steps",
      caption: "What each stage is for, and what goes wrong when it is rushed.",
      entries: stageEntries,
    });
  }

  const qcEntries = input.qc
    .map(({ test }) => {
      const guide = qcGuide(test);
      if (!guide) return null;
      return { term: test, detail: `${guide.measures} ${guide.why}`, note: guide.typical };
    })
    .filter((entry): entry is { term: string; detail: string; note: string } => entry !== null);

  if (qcEntries.length) {
    sections.push({
      key: "qc",
      title: "Quality control tests",
      caption: "What each test on this batch measures and why it is run.",
      entries: qcEntries,
    });
  }

  sections.push({
    key: "release",
    title: "Batch release",
    caption: "What has to be true before the batch can be released.",
    entries: [
      { term: "Every test in specification", detail: "A single out-of-specification result blocks release until it is investigated and resolved." },
      { term: "Deviations closed", detail: "Any departure from this record - environmental excursion included - is documented and assessed for impact on the batch." },
      { term: "Record complete", detail: "The batch record is signed and reconciled. Yield is accounted for, and label reconciliation balances." },
      { term: "Released by an authorised person", detail: "Release is a named individual taking responsibility, not a step that happens automatically once tests pass." },
    ],
  });

  return sections;
}
