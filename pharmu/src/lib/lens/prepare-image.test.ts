import { describe, expect, it } from "vitest";
import { fitWithin, MAX_EDGE, TARGET_BYTES } from "./prepare-image";

describe("fitWithin", () => {
  // A 12MP phone photo is the case this exists for.
  it("caps the long edge and keeps the aspect ratio", () => {
    const landscape = fitWithin(4032, 3024, 1600);
    expect(landscape.width).toBe(1600);
    expect(landscape.height).toBe(1200);
    expect(landscape.width / landscape.height).toBeCloseTo(4032 / 3024, 2);

    const portrait = fitWithin(3024, 4032, 1600);
    expect(portrait.height).toBe(1600);
    expect(portrait.width).toBe(1200);
  });

  // Upscaling adds bytes without adding legibility.
  it("leaves an image that is already small alone", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("never returns a zero dimension for a very long thin image", () => {
    const sliver = fitWithin(8000, 3, 1600);
    expect(sliver.width).toBe(1600);
    expect(sliver.height).toBeGreaterThanOrEqual(1);
  });

  it("survives a degenerate size rather than dividing by zero", () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 100, 1600)).toEqual({ width: 0, height: 0 });
  });

  it("defaults to the shipped cap", () => {
    expect(fitWithin(4000, 3000)).toEqual(fitWithin(4000, 3000, MAX_EDGE));
  });
});

describe("size budget", () => {
  // Base64 inflates by 4/3, and a Vercel function refuses a body over ~4.5MB.
  it("leaves the encoded request well inside the platform limit", () => {
    const base64Bytes = TARGET_BYTES * (4 / 3);
    expect(base64Bytes).toBeLessThan(4_500_000 * 0.5);
  });
});
