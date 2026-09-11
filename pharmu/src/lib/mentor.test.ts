import { afterEach, describe, expect, it } from "vitest";
import { MENTOR_TIPS, tipOfTheDay, nextTip } from "./mentor";

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

describe("stepping to the next tip", () => {
  /** The tests run in node, so localStorage has to be stood up by hand. */
  function withStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, v); },
      },
    };
    return store;
  }
  afterEach(() => { delete (globalThis as any).window; });

  const day = new Date("2026-09-14T12:00:00Z");

  // The complaint that prompted this: one tip for everybody, all day, and a
  // refresh did nothing.
  it("gives a different tip on every visit", () => {
    withStorage();
    const seen = [nextTip(day), nextTip(day), nextTip(day), nextTip(day)];
    expect(new Set(seen).size).toBe(4);
  });

  it("picks up where it left off rather than starting again", () => {
    const store = withStorage();
    nextTip(day);
    const afterFirst = store.get("pharmulation.mentorTipIndex");
    nextTip(day);
    expect(store.get("pharmulation.mentorTipIndex")).not.toBe(afterFirst);
  });

  // Random would repeat often enough to notice with only fifty-six tips.
  it("works through all of them before showing one twice", () => {
    withStorage();
    const seen = new Set<string>();
    for (let i = 0; i < MENTOR_TIPS.length; i++) seen.add(nextTip(day));
    expect(seen.size).toBe(MENTOR_TIPS.length);
  });

  it("comes back round to the start instead of running off the end", () => {
    withStorage({ "pharmulation.mentorTipIndex": String(MENTOR_TIPS.length - 1) });
    expect(nextTip(day)).toBe(MENTOR_TIPS[0]);
  });

  it("starts somewhere different depending on the day", () => {
    withStorage();
    const monday = nextTip(new Date("2026-09-14T12:00:00Z"));
    withStorage();
    const tuesday = nextTip(new Date("2026-09-15T12:00:00Z"));
    expect(monday).not.toBe(tuesday);
  });

  it("recovers from junk left in storage", () => {
    withStorage({ "pharmulation.mentorTipIndex": "not a number" });
    expect(MENTOR_TIPS).toContain(nextTip(day));
  });

  // Private browsing, or storage switched off entirely.
  it("still shows a tip when storage throws", () => {
    (globalThis as any).window = {
      localStorage: {
        getItem: () => { throw new Error("denied"); },
        setItem: () => { throw new Error("denied"); },
      },
    };
    expect(MENTOR_TIPS).toContain(nextTip(day));
  });

  it("still shows a tip when there is no window at all", () => {
    expect(MENTOR_TIPS).toContain(nextTip(day));
  });
});
