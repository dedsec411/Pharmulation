/**
 * The mentor character, in one place.
 *
 * These constants were previously copy-pasted into five components. Changing
 * the artwork therefore meant editing five files in lockstep, which is exactly
 * how the "fixed dr hakim gender" chain ended up spanning five commits. Import
 * from here instead so a re-skin is a one-line change.
 */

/** Mentor avatar, served from `public/`. */
/**
 * 42 KB rather than 1.3 MB.
 *
 * The original was 1516x1967 and shipped in full on every page that shows the
 * mentor. It is never drawn larger than eighty pixels tall, so more than
 * ninety-five percent of that download was thrown away by the browser before
 * anything appeared.
 */
export const MENTOR_IMAGE = "/dr-hakim.webp";

/** Display name, for headings and chat labels. */
export const MENTOR_NAME = "Dr. Hakim";

/** Role subtitle shown alongside the name. */
export const MENTOR_ROLE = "Pharmacist mentor";

/* ------------------------------------------------------------------ *
 * What Dr. Hakim says
 * ------------------------------------------------------------------ */

/**
 * The tips shown on the dashboard, grouped by the kind of help they give.
 *
 * Kept here rather than in the dashboard route because they are content, not
 * layout, and because the mentor already lives in this file.
 *
 * Everything clinical below is deliberately a practice principle rather than a
 * number. A tip that names a specific dose would need a pharmacist to review
 * it and a date on it, and a stale one in a training product is worse than no
 * tip at all - so the dosing advice here is always "go and check", which is
 * the habit worth building anyway.
 */

/** Safety habits that stop the errors that actually happen. */
const SAFETY_TIPS = [
  "Always verify the patient's allergy status before dispensing antibiotics.",
  "Methotrexate is weekly, never daily. Read prescriptions out loud to catch errors.",
  "Insulin is a high-alert medication. Double-check every dose before dispensing.",
  "Never write a naked decimal point. .5 mg becomes 5 mg the moment the dot is missed.",
  "A trailing zero has caused ten-fold overdoses. 1.0 mg reads as 10 mg under pressure.",
  "Write units, never U. A handwritten U next to a number turns four into forty.",
  "Read a verbal order back to the prescriber, digit by digit, before you act on it.",
  "Store look-alike and sound-alike medicines apart. Alphabetical order puts the dangerous pairs side by side.",
  "Two medicines, one patient, similar names - stop and check which one was meant.",
  "A missed contraindication can be more dangerous than a missed diagnosis.",
  "Never assume a handwritten prescription. Verify unclear orders immediately.",
  "The safest pharmacist is the one who never stops double-checking.",
  "If something about a prescription nags at you, that feeling is worth a phone call.",
];

/** Checks worth making before anything leaves the counter. */
const CHECKING_TIPS = [
  "Right patient, right drug, right dose, right route, right time - every case.",
  "Check renal and hepatic function before recommending dose adjustments.",
  "Paediatric doses are worked out by weight. Ask for the weight rather than estimating it.",
  "In an older patient, ask what the anticholinergic burden adds up to across the whole list.",
  "Check every new medicine against the rest of the list, not just against the diagnosis.",
  "Anticoagulants and anti-inflammatories together deserve a second look every time.",
  "An ACE inhibitor alongside a potassium-sparing diuretic is a potassium conversation.",
  "Antibiotics and antacids, iron or calcium: separate the doses or the antibiotic does nothing.",
  "Ask about pregnancy and breastfeeding before dispensing, not after.",
  "Always confirm the expiry date before dispensing or stocking medicines.",
  "If a dose looks unusual for the age on the page, it is worth querying even when it is right.",
];

/** Talking to the person on the other side of the counter. */
const COUNSELLING_TIPS = [
  "Counsel one medicine at a time. Patients remember only a few key points.",
  "Ask the patient to repeat the directions back. That is when you find out what they heard.",
  "Watch an inhaler being used before assuming it is working. Technique fails more often than the drug.",
  "Say what the medicine is for. A patient who knows why they are taking it is far likelier to take it.",
  "Name the side effect worth coming back about, not every side effect in the leaflet.",
  "Ask what else they are taking, including anything bought over the counter or from a hakeem.",
  "Ask how they are actually taking it before assuming they are taking it as written.",
  "Patient counseling is part of the treatment - not an optional extra.",
  "If English is not their first language, the counselling is not done until it is understood.",
];

/** Running the dispensary, the stockroom and the paperwork. */
const PRACTICE_TIPS = [
  "FEFO isn't optional. First expired, first out - every single time.",
  "Cold chain breaks happen in seconds. Check the temperature log every time.",
  "If a medicine requires refrigeration, never leave it at room temperature unnecessarily.",
  "A controlled drugs register has no tolerance band. Any difference at all is a finding.",
  "Count the safe before you write the register up, not after.",
  "Under a fixed retail price, the only margin you get is the one you buy.",
  "Quality begins with accurate inventory and proper storage conditions.",
  "Document every intervention. Good records protect both patients and pharmacists.",
  "Generic substitution is valuable, but only when clinically appropriate.",
  "When in doubt, call the prescriber. Clarification prevents harm.",
  "The prescription you cannot read is the one most worth slowing down for.",
];

/** Getting through the exam as well as the shift. */
const EXAM_TIPS = [
  "Read the last line of the question first. It tells you what the rest of it is for.",
  "Watch for NOT and EXCEPT. Half of all careless marks are lost on those two words.",
  "Rule out what is clearly wrong before choosing between what is left.",
  "Do not change an answer without a reason you can say out loud.",
  "If the stem gives you an age, a weight or a creatinine, it is there to be used.",
  "Practise under the clock. Knowing it and knowing it in ninety seconds are different skills.",
];

/** Keeping at it. */
const HABIT_TIPS = [
  "Ten minutes every day beats three hours on a Sunday. Spacing is what makes it stick.",
  "The case you got wrong is worth more than the three you got right. Go back and read why.",
  "Your weakness map is only as useful as the errors you are honest about.",
  "A streak is not the point, but it is a good proxy for the point.",
  "Getting it wrong here is free. That is the entire reason this exists.",
  "Nobody remembers every interaction. The skill is knowing which ones to look up.",
];

/**
 * Every tip, in one list.
 *
 * Order is stable so that the daily rotation below is reproducible - a learner
 * comparing notes with a classmate should be seeing the same tip.
 */
export const MENTOR_TIPS: string[] = [
  ...SAFETY_TIPS,
  ...CHECKING_TIPS,
  ...COUNSELLING_TIPS,
  ...PRACTICE_TIPS,
  ...EXAM_TIPS,
  ...HABIT_TIPS,
];

/**
 * The tip the server renders, before the browser has taken over.
 *
 * Deliberately derived from the date rather than picked at random. A random
 * choice here would mean the server rendered one tip and the browser hydrated
 * with a different one, which is a mismatch React has to repair on every load.
 * This is the opening frame; nextTip below is what the reader actually ends up
 * looking at.
 */
export function tipOfTheDay(now: Date = new Date()): string {
  return MENTOR_TIPS[dayIndex(now)];
}

function dayIndex(now: Date): number {
  const day = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  return ((day % MENTOR_TIPS.length) + MENTOR_TIPS.length) % MENTOR_TIPS.length;
}

/** Where the rotation keeps its place between visits. */
const TIP_INDEX_KEY = "pharmulation.mentorTipIndex";

/**
 * The next tip along, one step further every time the dashboard opens.
 *
 * A daily tip was too still - it is the same sentence for everybody until
 * midnight, and refreshing the page does nothing, which reads as broken rather
 * than as deliberate. Random would move, but it repeats: with fifty-six tips
 * you would see the same one twice in a row often enough to notice.
 *
 * So it steps through the list instead. Every visit is a different tip, all
 * fifty-six come round before any repeats, and where you are up to survives a
 * refresh. The starting point is seeded from the date so two people opening
 * the app for the first time on different days do not both begin at the top.
 *
 * Call this after mount, never during a render: it both reads and writes, and
 * a render has to be able to run twice without changing anything.
 */
export function nextTip(now: Date = new Date()): string {
  let index = dayIndex(now);
  try {
    const stored = window.localStorage.getItem(TIP_INDEX_KEY);
    if (stored !== null) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) index = parsed;
    }
    const advanced = (index + 1) % MENTOR_TIPS.length;
    window.localStorage.setItem(TIP_INDEX_KEY, String(advanced));
    return MENTOR_TIPS[advanced];
  } catch {
    // Private browsing, or storage turned off. Still show something sensible.
    return MENTOR_TIPS[index];
  }
}
