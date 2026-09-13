import type { TutorialGuide } from "@/lib/tutorial";

/**
 * What Dr. Hakim says when he lands on something.
 *
 * The guides in tutorial.ts tell the story of a mode: what it trains and the
 * order it runs in. This is the other half - what one control on one screen is
 * for, said while he is standing next to it. "How do I set the temperature"
 * has no good answer in a paragraph read before the room controls exist; it
 * has a very good one delivered beside the slider, the first time the slider
 * appears.
 *
 * An element opts in with `data-tour="id"`, and the screen it belongs to with
 * `data-tour-scene="id"`. The tests read the source for both, so a spot with no
 * element and an element with no words each fail a test rather than producing
 * a tour that quietly skips a step.
 *
 * Same register as the guides: what to press and why, never clinical fact that
 * would need a pharmacist's sign-off. No doses, no ranges - the case holds
 * those, and a number here would be a number nobody checked.
 */

export type Spot = {
  title: string;
  body: string;
  /**
   * Page furniture - the navigation, the case bar. Shown after the page's own
   * controls in a tour of the whole screen, because it is the least new thing
   * on it.
   */
  chrome?: boolean;
};

export type Scene = { label: string };

export const SPOTS: Record<string, Spot> = {
  // ── Navigation ────────────────────────────────────────────────────────────
  "nav-dashboard": {
    chrome: true,
    title: "Dashboard",
    body: "Where you land after signing in: your level and streak, today's challenge, and a quick way into every mode.",
  },
  "nav-modes": {
    chrome: true,
    title: "Modes",
    body: "All four training modes, each showing how long a case gives you. New here? Start with Community Pharmacy.",
  },
  "nav-class": {
    chrome: true,
    title: "Class",
    body: "If your lecturer reads out a six-character code, this is where you enter it. Their assignments and timed assessments then appear here.",
  },
  "nav-faculty": {
    chrome: true,
    title: "Faculty",
    body: "The lecturer's side: classes and join codes, assignments, assessments, and where the whole cohort is going wrong.",
  },
  "nav-drugs": {
    chrome: true,
    title: "Drug DB",
    body: "Every medicine in the simulator, searchable by generic or brand name. Worth opening after a case you got wrong.",
  },
  "nav-leaderboard": {
    chrome: true,
    title: "Leaderboard",
    body: "How your progress compares with everyone else who is playing.",
  },
  "nav-profile": {
    chrome: true,
    title: "Profile",
    body: "Your case history, your badges and certificates, and the practice record you can download.",
  },
  "theme-toggle": {
    chrome: true,
    title: "Light or dark",
    body: "Switches the whole app between a light screen and a dark one.",
  },
  "account-menu": {
    chrome: true,
    title: "Your account",
    body: "Settings, signing out, and on a phone the links that do not fit along the top. Plain English, which writes every short form out in full, is in Settings.",
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  "dash-standing": {
    title: "Your standing",
    body: "Your level, your streak of days in a row, and how close you are to the next level. XP comes from finishing cases.",
  },
  "dash-daily": {
    title: "Today's challenge",
    body: "One mode at one difficulty, picked for today, with a bonus for finishing it before midnight.",
  },
  "dash-week": {
    title: "Your week",
    body: "What improved, your biggest gap and what to practise next, worked out from the cases you have actually played.",
  },
  "dash-assigned": {
    title: "Work set for you",
    body: "Assignments and open assessments from your lecturer, and which of them are still outstanding.",
  },
  "lens-entry": {
    title: "Prescription Lens",
    body: "Photograph a real prescription and it becomes a case you can play. The photo is never stored, and the patient's name is swapped for an invented one.",
  },
  "dash-modes": {
    title: "Pick a mode",
    body: "Each card drops you straight into that mode. The number on it is how many cases of that mode you have finished.",
  },
  "modes-grid": {
    title: "The four modes",
    body: "Each card opens a mode and shows how long a case gives you. A padlock with a count means that mode opens after ten finished cases.",
  },

  // ── The case bar, on every mode ───────────────────────────────────────────
  "case-timer": {
    chrome: true,
    title: "The clock",
    body: "Time left on this case. It turns amber and then red as it runs down, and at zero whatever you have done is submitted. It stops while I am talking.",
  },
  "case-pause": {
    chrome: true,
    title: "Pause",
    body: "Stops the clock when you need to step away. Using it at all takes points off the final score.",
  },
  "case-hint": {
    chrome: true,
    title: "Hints",
    body: "A nudge when you are stuck. Each one costs 10 points, and hints are switched off in a graded assessment.",
  },

  // ── Community ─────────────────────────────────────────────────────────────
  "community-rx": {
    title: "Rx Cases",
    body: "Dispensing against a written prescription: read it, collect the right packs, then write the label.",
  },
  "community-otc": {
    title: "OTC Consultation",
    body: "Someone at the counter with a symptom and no prescription. You take the history by asking, then sell something suitable or refer them on.",
  },
  "community-lookalike": {
    title: "Look-alike names",
    body: "A quick drill on brand names a letter or two apart. The prescription names one; the shelf has both.",
  },
  "rx-prescription": {
    title: "The prescription",
    body: "Read all of it before you touch a shelf: patient, age and allergies, then every item. Show typed swaps the handwriting for print.",
  },
  "rx-tray": {
    title: "Dispensing tray",
    body: "Everything you have picked so far. Take out anything that should not be there, then confirm the collection.",
  },
  "rx-shelf": {
    title: "The shelves",
    body: "Open a category, choose the medicine, then choose the brand. What you hand over has to match what was prescribed.",
  },
  "rx-label-form": {
    title: "Write the label",
    body: "Frequency and timing are required, then the duration and any extra instructions. Check each one against the prescription alongside it.",
  },
  "otc-patient": {
    title: "At the counter",
    body: "All you know is what you can see. Anything else about this patient, you have to ask for.",
  },
  "otc-chat": {
    title: "Take the history",
    body: "Type what you would say to the patient. On harder settings they volunteer nothing, so ask before you decide, then continue to your recommendation.",
  },
  "otc-shelf": {
    title: "Sell or refer",
    body: "Choose what to hand over, or refer if this needs a doctor. Referring someone who could safely be treated here is marked wrong too.",
  },
  "otc-label": {
    title: "Label it",
    body: "Write the label for what you handed over, the way you would before it leaves the counter.",
  },
  "lookalike-prescribed": {
    title: "What was prescribed",
    body: "The brand name on the prescription. Reading it properly is the whole task.",
  },
  "lookalike-shelf": {
    title: "The shelf",
    body: "Packs with names close enough to confuse. Check the generic name under each brand, not the shape of the word.",
  },

  // ── Clinical ──────────────────────────────────────────────────────────────
  "clinical-file": {
    title: "The patient file",
    body: "Diagnosis, allergies, current medicines and labs. Kidney function matters here: a dose that suits most patients can be wrong for this one.",
  },
  "clinical-formulary": {
    title: "Search the formulary",
    body: "Type a medicine name and add it to the order. Nothing is judged until you submit.",
  },
  "clinical-orders": {
    title: "Order builder",
    body: "Each medicine needs a dose, a route and a frequency. The right drug at the wrong frequency is still a wrong order.",
  },
  "clinical-submit": {
    title: "Submit the order",
    body: "The whole order is judged at once, so check it against the patient file first.",
  },

  // ── Industry ──────────────────────────────────────────────────────────────
  "industry-forms": {
    title: "Dosage form",
    body: "Choose the form first. It decides which process stages and quality tests the batch goes through.",
  },
  "industry-types": {
    title: "Product",
    body: "Then the product. Picking one opens its batch record.",
  },
  "industry-batch-size": {
    title: "Batch size",
    body: "Change how much you are making and every target weight in the record recalculates to match.",
  },
  "industry-formula": {
    title: "The master formula",
    body: "Every ingredient with its target and acceptable range. Most answers later in the batch are on this page.",
  },
  "industry-ack": {
    title: "Sign it off",
    body: "Confirms you have read the record and moves the batch on. The record stays a click away for the rest of the batch.",
  },
  "industry-gauges": {
    title: "The room, live",
    body: "Temperature and humidity in the manufacturing room. The needles follow every change, and each dial changes colour and says in words when the room drifts out of range.",
  },
  "industry-record": {
    title: "The batch record",
    body: "Opens the record again at any stage. Targets, ranges and conditions are all in it.",
  },
  "industry-room-status": {
    title: "Is the room in spec?",
    body: "Whether the room's current readings meet what this product needs.",
  },
  "industry-change-conditions": {
    title: "Change conditions",
    body: "Opens the room controls, so you can set the temperature and humidity yourself.",
  },
  "industry-proceed": {
    title: "Carry on as it is",
    body: "Moves on without touching the room. If the room is out of spec, carrying on is a deviation on the batch.",
  },
  "industry-temp-slider": {
    title: "Set the temperature",
    body: "Drag the slider, or select it and use the arrow keys. The temperature dial at the top swings to follow.",
  },
  "industry-humidity-slider": {
    title: "Set the humidity",
    body: "The same for relative humidity. Aim for the range in the batch record, not just somewhere near it.",
  },
  "industry-confirm-room": {
    title: "Confirm and weigh",
    body: "Records the room as you have set it and moves on to weighing. Check both dials before you press it.",
  },
  "industry-inventory": {
    title: "Ingredient inventory",
    body: "Everything on the bench, grouped by what each material is for. Not all of it belongs in this batch; the record says what does.",
  },
  "industry-station": {
    title: "The balance",
    body: "Choose an ingredient and it goes on the pan. Drag the weight to what the record asks for, wait until the balance reads Stable, then confirm.",
  },
  "industry-stages": {
    title: "Process stages",
    body: "Where you are in the batch. Each stage is marked right or wrong once you have answered it.",
  },
  "industry-stage": {
    title: "This stage",
    body: "Choose how this stage should be run. The process conditions in the batch record are your reference.",
  },
  "industry-qc-tests": {
    title: "Judge each test",
    body: "Compare every result with its limit in the record and stamp it Pass or Fail. A stamp cannot be changed.",
  },
  "industry-release": {
    title: "Release or reject",
    body: "The last decision. Releasing a batch that should have failed is the most expensive mistake in this mode, and rejecting a sound one costs too.",
  },

  // ── Warehousing ───────────────────────────────────────────────────────────
  "wh-manifests": {
    title: "Incoming deliveries",
    body: "One card per delivery: batch, expiry, how it must be stored and, where there is one, its temperature log. Select a card first.",
  },
  "wh-zones": {
    title: "Where it goes",
    body: "Then choose the zone its storage requirement calls for. Stock whose log shows the cold chain broke goes to quarantine instead.",
  },
  "wh-fefo": {
    title: "Choose a batch to dispatch",
    body: "Several batches of the same medicine, in no particular order. Send the one that expires first, wherever it sits on the shelf.",
  },
  "wh-expiry": {
    title: "Near-expiry stock",
    body: "Decide for each line: priority dispatch when there is an order waiting for it, return to the supplier when nobody wants it.",
  },
  "wh-audit-board": {
    title: "Today's audit",
    body: "Every issue on the audit, and which one you are working on now.",
  },
  "wh-audit-decision": {
    title: "Make the call",
    body: "Read the situation and choose what you would do. A wrong choice is struck through and you choose again.",
  },
  "wh-count": {
    title: "The stock count",
    body: "Expected against counted, line by line. Tick every line that needs investigating before you close the count.",
  },
  "wh-carton": {
    title: "The carton on the bay",
    body: "Read the label and look at the carton for yourself. The note under it says what you can see.",
  },
  "wh-condition": {
    title: "Record its condition",
    body: "Answer each condition check, then record them. What you record here goes on the driver's copy.",
  },
  "wh-match": {
    title: "Match the three documents",
    body: "What was ordered, what the supplier's challan says was sent, and what is actually here. Accept the delivery, or raise a discrepancy and say which.",
  },
};

export const SCENES: Record<string, Scene> = {
  dashboard: { label: "Your dashboard" },
  modes: { label: "Choosing a mode" },
  "case-header": { label: "The case bar" },
  "community-picker": { label: "Community Pharmacy" },
  "rx-collect": { label: "Collecting a prescription" },
  "rx-label": { label: "The dispensing label" },
  "otc-consult": { label: "Taking the history" },
  "otc-dispense": { label: "Sell or refer" },
  "otc-label": { label: "The label" },
  "lookalike-drill": { label: "Look-alike drill" },
  "clinical-order": { label: "The medication order" },
  "industry-product": { label: "Choosing the product" },
  "industry-record": { label: "The batch record" },
  "industry-bench": { label: "The bench" },
  "industry-env": { label: "Room check" },
  "industry-room-controls": { label: "Room controls" },
  "industry-weighing": { label: "Weighing" },
  "industry-process": { label: "Process" },
  "industry-qc": { label: "Quality control" },
  "industry-release": { label: "Batch decision" },
  "wh-receiving": { label: "Receiving" },
  "wh-dispatch": { label: "Dispatch" },
  "wh-expiry": { label: "Expiry" },
  "wh-audit": { label: "Operations audit" },
  "wh-count": { label: "Stock count" },
  "wh-challan": { label: "Closing the challan" },
};

/** An element found on the page, and the screen it sits in. */
export type FoundAnchor = { id: string; scene: string | null };

/** One bubble in a tour, whatever kind of tour produced it. */
export type TourStep = {
  /** Unique within a tour; also keys the bubble's content transition. */
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  /** The `data-tour` id to fly to, or null to speak from the middle of the screen. */
  target: string | null;
  scene: string | null;
  /** A short ordered list under the body - a mode's stages, in the overview. */
  list?: string[];
};

/** Stored alongside the guide flags, so it shares their per-account and guest rules. */
export const sceneSeenKey = (scene: string) => `scene.${scene}`;

function uniqueKnown(found: FoundAnchor[]): FoundAnchor[] {
  const seen = new Set<string>();
  return found.filter((a) => {
    if (!SPOTS[a.id] || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function stepFor(anchor: FoundAnchor, eyebrow: string): TourStep {
  const spot = SPOTS[anchor.id];
  return { key: `spot.${anchor.id}`, eyebrow, title: spot.title, body: spot.body, target: anchor.id, scene: anchor.scene };
}

/**
 * A tour of everything explained on the screen right now.
 *
 * Page order, which is reading order for these layouts, with the navigation
 * and the case bar moved to the end: somebody asking "what is all this" means
 * the page, and has usually already found the menu.
 */
export function screenSteps(found: FoundAnchor[]): TourStep[] {
  const known = uniqueKnown(found);
  const page = known.filter((a) => !SPOTS[a.id].chrome);
  const chrome = known.filter((a) => SPOTS[a.id].chrome);
  return [...page, ...chrome].map((a) => stepFor(a, a.scene ? (SCENES[a.scene]?.label ?? "This screen") : "Around the app"));
}

/** One control, asked about directly. */
export function spotStep(anchor: FoundAnchor): TourStep | null {
  if (!SPOTS[anchor.id]) return null;
  return stepFor(anchor, "You asked about");
}

/**
 * Which screens on the page have not been introduced yet, in page order.
 *
 * The dashboard is the exception: the first-run tour already walks it, so
 * somebody who has had that tour does not want the same five stops again.
 */
export function scenesToIntroduce(present: string[], seen: (key: string) => boolean): string[] {
  const out: string[] = [];
  for (const scene of present) {
    if (!SCENES[scene] || out.includes(scene)) continue;
    if (seen(sceneSeenKey(scene))) continue;
    if (scene === "dashboard" && seen("tour")) continue;
    out.push(scene);
  }
  return out;
}

/**
 * What is new here: a mode's overview, if this is the first time in it, then
 * the controls of every screen on the page not introduced before.
 *
 * One tour rather than several back to back. The first case in a mode brings
 * the case bar and the first screen into view at the same moment, and three
 * separate tours in a row would read as the guide not knowing when to stop.
 */
export function newHereSteps(guide: TutorialGuide | null, found: FoundAnchor[], scenes: string[]): TourStep[] {
  const steps: TourStep[] = [];
  if (guide) {
    steps.push({
      key: `overview.${guide.key}`,
      eyebrow: "New here",
      title: guide.label,
      body: `${guide.blurb} Here is the shape of it, then I will show you the controls.`,
      list: guide.steps.map((s) => s.title),
      target: null,
      scene: null,
    });
  }
  const known = uniqueKnown(found);
  for (const scene of scenes) {
    const label = SCENES[scene]?.label ?? "This screen";
    for (const anchor of known.filter((a) => a.scene === scene)) {
      steps.push(stepFor(anchor, `New here · ${label}`));
    }
  }
  return steps;
}

/** A guide walked step by step, flying to each step's control where it is on screen. */
export function guideSteps(guide: TutorialGuide): TourStep[] {
  return guide.steps.map((s, i) => ({
    key: `guide.${guide.key}.${i}`,
    eyebrow: guide.label,
    title: s.title,
    body: s.body,
    action: s.action,
    target: s.target ?? null,
    scene: null,
  }));
}

/** The screens a tour covered, so each is marked introduced once it has been. */
export function scenesCovered(steps: TourStep[]): string[] {
  return [...new Set(steps.map((s) => s.scene).filter((s): s is string => !!s))];
}
