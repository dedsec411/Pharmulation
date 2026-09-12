import { describe, expect, it } from "vitest";
import {
  GUIDES, MODE_GUIDE_KEYS, guideForPath, guideKeyForPath, hasGuide, modeGuideKey,
} from "./tutorial";
import { MODE_LABEL } from "./game/shared";

describe("guideKeyForPath", () => {
  it("sends every game route to its own mode guide", () => {
    expect(guideKeyForPath("/game/community")).toBe("community");
    expect(guideKeyForPath("/game/hospital")).toBe("clinical");
    expect(guideKeyForPath("/game/industry")).toBe("industry");
    expect(guideKeyForPath("/game/warehousing")).toBe("warehousing");
  });

  it("matches the real signed-in routes", () => {
    expect(guideKeyForPath("/dashboard")).toBe("dashboard");
    expect(guideKeyForPath("/modes")).toBe("modes");
    expect(guideKeyForPath("/drugs")).toBe("drugs");
    expect(guideKeyForPath("/class")).toBe("class");
    expect(guideKeyForPath("/educator/dashboard")).toBe("educator");
  });

  // /educator/dashboard contains "dashboard" too, so the faculty side has to
  // be matched before the student one or a lecturer gets the wrong tour.
  it("does not hand a lecturer the student dashboard guide", () => {
    expect(guideKeyForPath("/educator/dashboard")).not.toBe("dashboard");
  });

  it("falls back rather than throwing on a page with no guide of its own", () => {
    expect(guideKeyForPath("/settings")).toBe("generic");
    expect(guideForPath("/nowhere").key).toBe("generic");
  });
});

describe("hasGuide", () => {
  it("keeps the tab off the landing page and the auth pages", () => {
    for (const path of ["/", "/login", "/signup", "/privacy", "/terms", "/auth/callback"]) {
      expect(hasGuide(path)).toBe(false);
    }
  });

  it("offers one everywhere inside the app", () => {
    for (const path of ["/dashboard", "/modes", "/game/warehousing", "/class", "/educator/classes", "/settings"]) {
      expect(hasGuide(path)).toBe(true);
    }
  });
});

describe("modeGuideKey", () => {
  // The mode tutorial opens off the mode a case is loaded for, so every mode
  // that still exists has to resolve to a guide - a new mode added without one
  // would silently open nothing.
  it("covers every mode the product actually ships", () => {
    for (const mode of Object.keys(MODE_LABEL)) {
      const key = modeGuideKey(mode);
      if (key === null) continue;
      expect(GUIDES[key]).toBeDefined();
    }
    for (const mode of ["community", "hospital", "industry", "warehousing"]) {
      expect(modeGuideKey(mode)).not.toBeNull();
    }
  });

  it("does not invent a guide for something that is not a mode", () => {
    expect(modeGuideKey("emergency")).toBeNull();
  });
});

describe("the guides themselves", () => {
  const all = Object.values(GUIDES);

  it("keys itself consistently, so a stored 'seen' flag cannot drift", () => {
    for (const [key, guide] of Object.entries(GUIDES)) {
      expect(guide.key).toBe(key);
    }
  });

  it("gives every mode guide enough to be worth opening", () => {
    for (const key of MODE_GUIDE_KEYS) {
      expect(GUIDES[key].steps.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("writes a real step every time", () => {
    for (const guide of all) {
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.blurb.length).toBeGreaterThan(20);
      for (const step of guide.steps) {
        expect(step.title.length).toBeGreaterThan(3);
        expect(step.body.length).toBeGreaterThan(40);
      }
    }
  });

  // Emergency, cosmetic and oncology were removed from the product. A guide
  // still promising them would be the first thing a judge saw.
  it("promises nothing that was taken out", () => {
    const text = JSON.stringify(all).toLowerCase();
    for (const gone of ["emergency mode", "cosmetic", "oncology"]) {
      expect(text).not.toContain(gone);
    }
  });

  it("describes warehousing as the shift it now is", () => {
    const text = GUIDES.warehousing.steps.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(text).toContain("fefo");
    expect(text).toContain("quarantine");
    // The challan close is the last phase; a guide that stopped at the stock
    // count would leave a learner with no idea what the final screen is.
    expect(text).toContain("challan");
  });

  it("tells a first-time user where the guide lives afterwards", () => {
    const text = GUIDES.tour.steps.map((s) => s.body).join(" ").toLowerCase();
    expect(text).toContain("right");
  });
});

/**
 * The panel lists these as "other guides", which is the only way back to the
 * tour once it has been finished. A key here that no longer exists would
 * render a button that opens nothing.
 */
describe("the guide index the panel offers", () => {
  const INDEX = ["tour", "dashboard", "modes", "community", "clinical", "industry", "warehousing", "class", "drugs"];

  it("names only guides that exist", () => {
    for (const key of INDEX) expect(GUIDES[key]).toBeDefined();
  });

  it("can always get somebody back to the full tour", () => {
    expect(INDEX).toContain("tour");
  });

  it("offers every mode, so a guide is reachable without entering the mode", () => {
    for (const key of MODE_GUIDE_KEYS) expect(INDEX).toContain(key);
  });
});
