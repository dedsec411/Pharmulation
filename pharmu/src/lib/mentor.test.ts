import { describe, expect, it } from "vitest";
import { MENTOR_TIPS, tipOfTheDay } from "./mentor";

describe("the tips themselves", () => {
  it("has enough that a daily user is not seeing repeats within a month", () => {
    expect(MENTOR_TIPS.length).toBeGreaterThanOrEqual(40);
  });

  it("says each thing once", () => {
    expect(new Set(MENTOR_TIPS).size).toBe(MENTOR_TIPS.length);
  });

  it("is all real sentences", () => {
    for (const tip of MENTOR_TIPS) {
      expect(tip.trim()).toBe(tip);
      expect(tip.length).toBeGreaterThan(20);
      expect(tip).toMatch(/[.!?]$/);
    }
  });

  // A tip recommending a specific dose would need a pharmacist to review it and
  // a date on it, and a stale one in a training product is worse than none. The
  // two exceptions use a quantity to show how a misread happens, which is the
  // opposite of telling somebody what to give.
  it("recommends no dose", () => {
    const illustratesAMisreading = (tip: string) =>
      /naked decimal point|trailing zero/i.test(tip);

    for (const tip of MENTOR_TIPS) {
      if (illustratesAMisreading(tip)) continue;
      expect(tip).not.toMatch(/\d+\s?(mg|mcg|ml|units?)\b/i);
    }
  });

  it("keeps the two tips that need a quantity to make their point", () => {
    expect(MENTOR_TIPS.filter((t) => /naked decimal point|trailing zero/i.test(t)))
      .toHaveLength(2);
  });
});

describe("the tip of the day", () => {
  const on = (iso: string) => tipOfTheDay(new Date(iso));

  // Math.random() in a render body changed the tip every time anything on the
  // dashboard re-rendered, so it moved while somebody was reading it.
  it("does not change through the day", () => {
    expect(on("2026-09-14T00:00:00Z")).toBe(on("2026-09-14T23:59:59Z"));
    expect(on("2026-09-14T09:30:00Z")).toBe(on("2026-09-14T17:45:00Z"));
  });

  it("is something else tomorrow", () => {
    expect(on("2026-09-14T12:00:00Z")).not.toBe(on("2026-09-15T12:00:00Z"));
  });

  // The server rendering one tip and the browser hydrating with another is a
  // mismatch React has to repair. Deriving from the UTC date means both agree.
  it("is the same wherever the clock is set", () => {
    expect(on("2026-09-14T00:30:00Z")).toBe(on("2026-09-14T22:30:00Z"));
  });

  it("gets through every tip over a full cycle", () => {
    const seen = new Set<string>();
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < MENTOR_TIPS.length; i++) {
      seen.add(tipOfTheDay(new Date(start + i * 86_400_000)));
    }
    expect(seen.size).toBe(MENTOR_TIPS.length);
  });

  it("always returns a tip, whatever the date", () => {
    for (const iso of ["1970-01-01T00:00:00Z", "2026-09-11T00:00:00Z", "2099-12-31T00:00:00Z"]) {
      expect(MENTOR_TIPS).toContain(on(iso));
    }
  });
});
