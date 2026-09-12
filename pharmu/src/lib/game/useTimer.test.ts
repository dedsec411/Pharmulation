import { describe, expect, it } from "vitest";
import { shouldTick } from "./useTimer";

const running = { paused: false, externalPaused: false, guideOpen: false, remaining: 120 };

describe("shouldTick", () => {
  it("runs while nothing is in the way", () => {
    expect(shouldTick(running)).toBe(true);
  });

  it("stops for each of the three things that can cover the case", () => {
    expect(shouldTick({ ...running, paused: true })).toBe(false);
    expect(shouldTick({ ...running, externalPaused: true })).toBe(false);
    expect(shouldTick({ ...running, guideOpen: true })).toBe(false);
  });

  it("stops at zero", () => {
    expect(shouldTick({ ...running, remaining: 0 })).toBe(false);
  });

  // The mistake panel and the guide can be open at once - closing one used to
  // be enough to start the clock while the other still covered the screen.
  it("stays stopped while any one reason remains", () => {
    expect(shouldTick({ ...running, externalPaused: true, guideOpen: true })).toBe(false);
    expect(shouldTick({ ...running, externalPaused: false, guideOpen: true })).toBe(false);
    expect(shouldTick({ ...running, externalPaused: true, guideOpen: false })).toBe(false);
  });
});
