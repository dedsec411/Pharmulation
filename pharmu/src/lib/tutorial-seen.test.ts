import { describe, expect, it } from "vitest";
import { GUEST_USER_ID } from "@/lib/api/guest.functions";
import {
  forgetGuides, hasSeenGuide, initialView, isSharedAccount, markGuideSeen, seenKey,
  shouldAutoRunTour,
} from "./tutorial-seen";

/** A storage bin that behaves, for the ordinary cases. */
function fakeBin() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

/** A browser that refuses: a private window, or site data blocked. */
const hostileBin = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
  removeItem() { throw new Error("blocked"); },
};

describe("isSharedAccount", () => {
  it("treats the demo account as shared and nobody else", () => {
    expect(isSharedAccount(GUEST_USER_ID)).toBe(true);
    expect(isSharedAccount("11111111-2222-3333-4444-555555555555")).toBe(false);
  });
});

describe("remembering a guide", () => {
  it("does not claim somebody saw a guide they have not", () => {
    expect(hasSeenGuide(fakeBin(), "user-1", "tour")).toBe(false);
  });

  it("remembers one once it has been shown", () => {
    const bin = fakeBin();
    markGuideSeen(bin, "user-1", "tour");
    expect(hasSeenGuide(bin, "user-1", "tour")).toBe(true);
  });

  it("keeps one person's progress out of another's", () => {
    const bin = fakeBin();
    markGuideSeen(bin, "user-1", "tour");
    expect(hasSeenGuide(bin, "user-2", "tour")).toBe(false);
  });

  it("keeps one guide's progress out of another's", () => {
    const bin = fakeBin();
    markGuideSeen(bin, "user-1", "warehousing");
    expect(hasSeenGuide(bin, "user-1", "community")).toBe(false);
  });

  it("can be forgotten, so somebody can ask to be shown again", () => {
    const bin = fakeBin();
    markGuideSeen(bin, "user-1", "tour");
    markGuideSeen(bin, "user-1", "modes");
    forgetGuides(bin, "user-1", ["tour", "modes"]);
    expect(hasSeenGuide(bin, "user-1", "tour")).toBe(false);
    expect(hasSeenGuide(bin, "user-1", "modes")).toBe(false);
  });

  it("namespaces its keys so it cannot collide with anything else stored", () => {
    expect(seenKey("user-1", "tour")).toMatch(/^pharmulation\.guide\./);
  });
});

describe("when the browser will not cooperate", () => {
  // Losing this state shows a guide twice. Throwing on page load does not.
  it("reads as unseen rather than throwing", () => {
    expect(() => hasSeenGuide(hostileBin, "user-1", "tour")).not.toThrow();
    expect(hasSeenGuide(hostileBin, "user-1", "tour")).toBe(false);
    expect(hasSeenGuide(null, "user-1", "tour")).toBe(false);
  });

  it("swallows a failed write and a failed clear", () => {
    expect(() => markGuideSeen(hostileBin, "user-1", "tour")).not.toThrow();
    expect(() => forgetGuides(hostileBin, "user-1", ["tour"])).not.toThrow();
    expect(() => markGuideSeen(null, "user-1", "tour")).not.toThrow();
  });
});

describe("initialView", () => {
  it("walks a first-timer through and lets everybody else scan", () => {
    expect(initialView(false)).toBe("walkthrough");
    expect(initialView(true)).toBe("contents");
  });
});

describe("shouldAutoRunTour", () => {
  const real = "11111111-2222-3333-4444-555555555555";

  it("runs for somebody genuinely new", () => {
    expect(shouldAutoRunTour({ userId: real, seenLocally: false, onboardingCompleted: false })).toBe(true);
  });

  it("does not run twice in the same browser", () => {
    expect(shouldAutoRunTour({ userId: real, seenLocally: true, onboardingCompleted: false })).toBe(false);
  });

  it("does not walk somebody through it again on a second device", () => {
    expect(shouldAutoRunTour({ userId: real, seenLocally: false, onboardingCompleted: true })).toBe(false);
  });

  // The demo account has been marked onboarded since the first visitor
  // finished the tour. That flag says somebody has seen it, not that the
  // person holding the laptop now has.
  it("still runs for the demo account whatever the account flag says", () => {
    expect(shouldAutoRunTour({ userId: GUEST_USER_ID, seenLocally: false, onboardingCompleted: true })).toBe(true);
  });

  it("but not twice within one demo session", () => {
    expect(shouldAutoRunTour({ userId: GUEST_USER_ID, seenLocally: true, onboardingCompleted: true })).toBe(false);
  });
});
