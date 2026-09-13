/**
 * What the mentor knows how to explain.
 *
 * Guides live here rather than in the component for two reasons. They are
 * content, and content about how the product actually behaves goes stale the
 * moment a mode changes - so there are tests below asserting every guide names
 * a real route, every mode has one, and nothing promises a feature that was
 * removed. And a lecturer disputing what a student was told can be shown the
 * text rather than a component tree.
 *
 * The register is deliberately plain. These are read by someone who has just
 * arrived and wants to know what to press, not by someone studying. Anything
 * clinical belongs in the cases, where a pharmacist has checked it.
 */

export type TutorialStep = {
  title: string;
  body: string;
  /** The one thing to actually do, when a step has one. */
  action?: string;
  /**
   * The `data-tour` id of the control this step is about. When it is on
   * screen the guide flies to it; when it is not, the step is said from the
   * middle of the screen, so a guide opened from another page still reads.
   */
  target?: string;
};

/** Named rather than imported so the guides stay free of React. */
export type GuideIcon =
  | "compass" | "trophy" | "book" | "pill" | "heart"
  | "flask" | "package" | "search" | "cap" | "camera" | "bot";

export type TutorialGuide = {
  key: string;
  label: string;
  role: string;
  /** One line, shown when the guide is listed rather than walked. */
  blurb: string;
  icon: GuideIcon;
  steps: TutorialStep[];
};

/** Guides that open by themselves the first time a mode is played. */
export const MODE_GUIDE_KEYS = ["community", "clinical", "industry", "warehousing"] as const;

export const GUIDES: Record<string, TutorialGuide> = {
  tour: {
    key: "tour",
    label: "How Pharmulation works",
    role: "Your mentor, Dr. Hakim",
    blurb: "The whole product in eight steps: what the modes are, how scoring works, and where your progress lives.",
    icon: "compass",
    steps: [
      {
        title: "Welcome. This is a practice pharmacy",
        body: "Everything here is a simulation. You will be handed prescriptions, patients, batches and deliveries, and asked to work them the way you would behind a real counter. Nothing you do can hurt anyone, which is the point: this is where the mistakes are supposed to happen.",
      },
      {
        title: "Four modes, four jobs",
        body: "Community Pharmacy is dispensing and OTC advice. Clinical is ward work - orders, interactions, renal dosing. Industry runs a manufacturing batch from formula to release. Warehousing is the supply chain: receiving, FEFO dispatch, expiry, audit and the delivery paperwork.",
        action: "Open Modes from the top navigation to see all four.",
        target: "dash-modes",
      },
      {
        title: "A case is timed",
        body: "Every case runs against a clock shown at the top. You can pause once, and you can take a hint, but both cost you points. Running out of time submits what you have rather than throwing it away.",
      },
      {
        title: "Difficulty changes more than the clock",
        body: "You pick a difficulty each time a mode opens. It changes the time allowed, how harshly mistakes are scored, how much the mentor reveals when you get something wrong, and - in OTC - how forthcoming the patient is. Apprentice explains everything. Expert tells you that you were wrong and leaves you to work out why.",
      },
      {
        title: "Mistakes are the teaching",
        body: "Get something wrong and the case stops to tell you what you chose, what the right answer was, why yours was wrong, and what to know next time. Read those. They are collected at the end of the case and on your profile, so a pattern you keep repeating becomes visible.",
      },
      {
        title: "Score, XP and level",
        body: "Each case scores out of a base set by difficulty, adjusted for time taken, hints used and errors made. XP is half your score. XP raises your level, and finishing cases on consecutive days builds a streak.",
        target: "dash-standing",
      },
      {
        title: "Your weak spots are tracked",
        body: "Clinical errors are sorted by drug class and by skill, so your profile can tell you that you are fine on dosing but keep missing renal adjustment. Warehousing and industry faults are tracked separately, as operational rather than clinical.",
        action: "Check the weakness map on your dashboard after a few cases.",
        target: "dash-week",
      },
      {
        title: "If your university uses this",
        body: "A lecturer can give you a six-character join code. Joining a class puts their assignments and timed assessments on your Class page, and lets them see where the whole cohort is going wrong. Everything else works without one.",
        target: "nav-class",
      },
      {
        title: "Then I wait in the corner",
        body: "When we finish I fly back to the bottom-left corner. Tap me on any page and I will show you around that screen, explain anything you point at, or answer a question. The first time you reach something new, I come over by myself.",
      },
    ],
  },

  dashboard: {
    key: "dashboard",
    label: "Your dashboard",
    role: "Your mentor, Dr. Hakim",
    blurb: "Where your progress, your weak spots and anything your lecturer has set all appear.",
    icon: "trophy",
    steps: [
      {
        title: "The top row is your standing",
        body: "Level and XP, your current streak, cases completed and average accuracy. Accuracy is decisions you got right across every case, not a pass mark.",
        target: "dash-standing",
      },
      {
        title: "Quick play",
        body: "The mode cards drop you straight into a case. The count under each one is how many of that mode you have finished.",
        target: "dash-modes",
      },
      {
        title: "The weakness map",
        body: "Built from the mistakes you have actually made, sorted by drug class and clinical skill. A low bar is not a judgement, it is the next thing to practise.",
        target: "dash-week",
      },
      {
        title: "Work set for you",
        body: "If you are in a class, assignments and open assessments appear here and on your Class page. The two read from the same rule, so they can never disagree about what is outstanding.",
        target: "dash-assigned",
      },
      {
        title: "Read a prescription with your camera",
        body: "Prescription Lens turns a photograph of a real prescription into a playable case. The image is never stored and the patient's name never leaves the reader - the case you get carries an invented one.",
        target: "lens-entry",
      },
    ],
  },

  modes: {
    key: "modes",
    label: "Choosing a mode",
    role: "Your mentor, Dr. Hakim",
    blurb: "What each of the four modes trains, and which to start with.",
    icon: "book",
    steps: [
      {
        title: "Start with Community",
        body: "It is the broadest and the most forgiving. Dispensing a prescription and advising an OTC customer are the two things almost every pharmacist does most days.",
        target: "modes-grid",
      },
      {
        title: "Then Clinical",
        body: "Ward-based. You read a patient file and build a medication order against it, with interaction and renal alerts to catch what you missed.",
      },
      {
        title: "Industry and Warehousing are different jobs",
        body: "Industry is manufacturing - formula, weighing, process control, QC, release. Warehousing is the supply chain behind the counter. Neither is clinical, and they are scored on a separate operational track.",
      },
      {
        title: "Difficulty is per case, not per account",
        body: "You choose it every time a mode opens, and the panel shows your last score at each level. Move up when the mentor stops surprising you.",
      },
    ],
  },

  community: {
    key: "community",
    label: "Community Pharmacy",
    role: "Community pharmacist",
    blurb: "Dispensing a prescription, or advising someone across the counter.",
    icon: "pill",
    steps: [
      {
        title: "Two counters, pick one",
        body: "Rx Cases is dispensing against a written prescription. OTC Consultation is someone walking in with a symptom and no prescription. They train different things and are scored the same way.",
        target: "community-rx",
      },
      {
        title: "Rx: read the whole sheet first",
        body: "Prescriber, patient, age, allergies, then the items. The trap in most cases is on the sheet, not in the shelves - a dose that does not suit the age, or a medicine the allergy box rules out.",
        target: "rx-prescription",
      },
      {
        title: "Rx: collect the right packs",
        body: "Pick each prescribed medicine from the shelves. Brand names matter here: the catalogue carries real Pakistani brands, so the pack you reach for has to be the right molecule at the right strength.",
        action: "Tap a shelf item to add it. Wrong picks cost points.",
        target: "rx-shelf",
      },
      {
        title: "Rx: compounding, when it comes up",
        body: "Some prescriptions need something prepared rather than picked. You will be asked for the method and the quantities.",
      },
      {
        title: "Rx: information and the label",
        body: "Last two stages. Answer what the patient needs to be told, then build the dispensing label. A correct medicine with a wrong label is still a dispensing error.",
        target: "rx-label-form",
      },
      {
        title: "OTC: ask before you recommend",
        body: "The patient answers what you ask and, on the harder settings, volunteers nothing. Ask about duration, other medicines, pregnancy and red flags before reaching for anything.",
        target: "otc-chat",
      },
      {
        title: "OTC: know when not to sell",
        body: "Some consultations are meant to end in a referral. Recommending a product to someone who needs a doctor is the error the mode is built to catch.",
        target: "otc-shelf",
      },
    ],
  },

  clinical: {
    key: "clinical",
    label: "Clinical",
    role: "Clinical pharmacist",
    blurb: "Reading a patient file and building a medication order that is safe against it.",
    icon: "heart",
    steps: [
      {
        title: "The file comes first",
        body: "Diagnosis, allergies, current medicines, observations and labs. Renal function especially - a lot of what this mode tests is whether you adjusted a dose for a kidney that cannot clear it.",
        target: "clinical-file",
      },
      {
        title: "Build the order",
        body: "Search the catalogue, add the medicine, then set dose, route and frequency. All four have to be right; a correct drug at a wrong frequency is a wrong order.",
        target: "clinical-orders",
      },
      {
        title: "Alerts are information, not obstacles",
        body: "Interaction and renal warnings fire as you build. They are there to be read and acted on. Overriding one without a reason is scored as an error.",
      },
      {
        title: "Submit when the whole order is safe",
        body: "You are judged on the finished order, not on each click. Review what you have built against the file before submitting.",
        target: "clinical-submit",
      },
    ],
  },

  industry: {
    key: "industry",
    label: "Industry",
    role: "Industrial pharmacist",
    blurb: "Running a manufacturing batch from master formula through to release.",
    icon: "flask",
    steps: [
      {
        title: "Choose what you are making",
        body: "First a dosage form - tablet, capsule, syrup, semi-solid - then the product type within it. The form decides which process controls the rest of the batch will hold you to.",
        target: "industry-forms",
      },
      {
        title: "The master formula is the answer sheet",
        body: "Ingredients, target weights, process conditions and QC limits are all in it. Almost every question later in the batch is answerable from this page, so read it before moving on.",
        target: "industry-formula",
      },
      {
        title: "Weigh accurately",
        body: "Each ingredient has a target and a tolerance. Outside tolerance is a deviation, and deviations follow the batch to release.",
        target: "industry-station",
      },
      {
        title: "Environment and process",
        body: "Temperature, humidity and the conditions for each stage. Getting these wrong can contaminate the batch, which costs you at the end whatever else you did well.",
        target: "industry-gauges",
      },
      {
        title: "QC, then release or reject",
        body: "The batch is tested against the formula's limits and you decide whether it goes out. Releasing a failing batch is the most expensive mistake in this mode, and rejecting a sound one is not free either.",
        target: "industry-qc-tests",
      },
    ],
  },

  warehousing: {
    key: "warehousing",
    label: "Warehousing",
    role: "Warehouse pharmacist",
    blurb: "A full shift: receiving, dispatch, expiry, audit, the stock count, and the paperwork that closes it.",
    icon: "package",
    steps: [
      {
        title: "Six stages, one shift",
        body: "Receiving, then FEFO dispatch, expiry management, an operations audit, the stock count, and finally the delivery paperwork. The clock runs across all of them.",
      },
      {
        title: "Receiving: read the temperature log",
        body: "Each delivery names a storage requirement and most carry a temperature log. Put stock in the zone its label demands - and if the log shows the cold chain broke, it goes to quarantine, not to a shelf.",
        action: "Select a manifest, then choose its zone.",
        target: "wh-manifests",
      },
      {
        title: "Receiving: controlled drugs are different",
        body: "A controlled medicine cannot just be put away. It goes to the secure cabinet and into the register, with a quantity and a named receiver.",
      },
      {
        title: "Dispatch: first expired, first out",
        body: "When several batches of the same medicine are in stock, the one expiring soonest leaves first. Picking a later batch means the earlier one expires on the shelf.",
        target: "wh-fefo",
      },
      {
        title: "Expiry: it depends on the orders",
        body: "Near-expiry stock with an order against it goes to priority dispatch. Near-expiry stock nobody wants goes back to the supplier while it is still worth a credit.",
        target: "wh-expiry",
      },
      {
        title: "The audit and the count",
        body: "Judgement calls on cold-chain deviations, controlled-stock discrepancies, recalls and segregation. Then the stock count, where you decide which variances need investigating rather than closing.",
        target: "wh-audit-decision",
      },
      {
        title: "Last: close the challan",
        body: "The paperwork for the stock you handled. Record the condition of each carton, then match three documents - what you ordered, what the supplier says they sent, and what is actually in front of you. Accept it, or raise a discrepancy and say which.",
        target: "wh-match",
      },
      {
        title: "Check the term, not a number",
        body: "The minimum shelf life is printed on the purchase order and changes between deliveries. Read it off the order rather than remembering one, because that is what you would do at a real bay.",
      },
    ],
  },

  drugs: {
    key: "drugs",
    label: "The medicine directory",
    role: "Your mentor, Dr. Hakim",
    blurb: "Every medicine in the simulator, searchable by generic or Pakistani brand name.",
    icon: "search",
    steps: [
      {
        title: "Search either name",
        body: "Type a generic name or a brand. The catalogue carries both, which is the difference between this and a textbook - what a patient hands you is a brand.",
      },
      {
        title: "Use it between cases",
        body: "Open a medicine to see its class, form and strengths. Reading around the ones you got wrong is worth more than replaying the same case.",
      },
    ],
  },

  class: {
    key: "class",
    label: "Your class",
    role: "Your mentor, Dr. Hakim",
    blurb: "Assignments, deadlines and timed assessments, if your university uses Pharmulation.",
    icon: "cap",
    steps: [
      {
        title: "Joining",
        body: "Your lecturer gives you a six-character code. Nothing else about the app changes when you join - it just connects your training to your course.",
      },
      {
        title: "What is due",
        body: "Outstanding work and the next deadline sit at the top. Anything past its deadline is called overdue rather than hidden.",
      },
      {
        title: "Assessments are not practice",
        body: "A timed assessment gives you one attempt, no hints and no mentor. The clock does not stop. Do the practice first.",
      },
    ],
  },

  educator: {
    key: "educator",
    label: "The faculty side",
    role: "Your mentor, Dr. Hakim",
    blurb: "Classes, assignments, assessments and where a cohort is going wrong.",
    icon: "cap",
    steps: [
      {
        title: "Classes and codes",
        body: "Create a class and share its six-character join code. Students who enter it appear on your roster.",
      },
      {
        title: "Set work",
        body: "Assign a mode and a difficulty with a deadline, or build a timed assessment. Both appear on the student's Class page as soon as you post them.",
      },
      {
        title: "Analytics show the cohort, not the individual",
        body: "Where the class as a whole is weakest, so you know what to teach next rather than who to chase.",
      },
    ],
  },

  generic: {
    key: "generic",
    label: "Getting around",
    role: "Your mentor, Dr. Hakim",
    blurb: "The basics of the page you are on.",
    icon: "bot",
    steps: [
      {
        title: "Tap me for help, anywhere",
        body: "I wait in the bottom-left corner of every page. Tap me and I will show you around the screen you are on, or explain one thing you point at.",
      },
      {
        title: "Ask me directly",
        body: "The same menu opens a chat, for anything the tour does not answer. The written guides and every short form are in there too.",
      },
    ],
  },
};

/**
 * Which guide belongs to a path.
 *
 * Order matters: the game routes are checked before the broader prefixes so
 * `/game/community` does not fall through to a page tour.
 */
export function guideKeyForPath(pathname: string): string {
  const path = pathname.toLowerCase();
  if (path.includes("/game/community")) return "community";
  if (path.includes("/game/hospital")) return "clinical";
  if (path.includes("/game/industry")) return "industry";
  if (path.includes("/game/warehousing")) return "warehousing";
  if (path.includes("/educator")) return "educator";
  if (path.includes("/dashboard")) return "dashboard";
  if (path.includes("/modes")) return "modes";
  if (path.includes("/drugs")) return "drugs";
  if (path.includes("/class")) return "class";
  return "generic";
}

export function guideForPath(pathname: string): TutorialGuide {
  return GUIDES[guideKeyForPath(pathname)] ?? GUIDES.generic;
}

/** The mode whose guide opens by itself, or null for a page that has none. */
export function modeGuideKey(mode: string): string | null {
  const map: Record<string, string> = {
    community: "community",
    hospital: "clinical",
    industry: "industry",
    warehousing: "warehousing",
  };
  return map[mode] ?? null;
}

/**
 * Pages with nothing to explain.
 *
 * The landing page sells the product and the auth pages are two fields; a
 * guide tab on either is clutter offering to explain a form.
 */
export function hasGuide(pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (path === "/") return false;
  return !["/login", "/signup", "/auth", "/privacy", "/terms"].some((p) => path.startsWith(p));
}
