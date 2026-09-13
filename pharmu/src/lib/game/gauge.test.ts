import { describe, expect, it } from "vitest";
import {
  arcPath, envBounds, fraction, needleAngle, pointOnArc, severity, ticks, zoneOf,
} from "./gauge";

const BALANCE = { min: 0, max: 8000 };

describe("needleAngle", () => {
  /**
   * The reported bug. At 0 g the old needle stopped 54 degrees left of
   * vertical - a third of the way up the arc - instead of lying on the zero
   * mark, because the face was a half circle and the sweep was not.
   */
  it("lies flat on the zero mark at zero", () => {
    expect(needleAngle(0, BALANCE)).toBe(-90);
  });

  it("lies flat on the far mark at the top of the scale", () => {
    expect(needleAngle(8000, BALANCE)).toBe(90);
  });

  it("points straight up at the middle", () => {
    expect(needleAngle(4000, BALANCE)).toBe(0);
  });

  it("works on a scale that does not start at zero", () => {
    const room = { min: 12, max: 33 };
    expect(needleAngle(12, room)).toBe(-90);
    expect(needleAngle(33, room)).toBe(90);
  });

  // The old room gauges swung 260 degrees across a 180-degree face.
  it("never points below the dial, however far off the scale the reading is", () => {
    for (const v of [-500, -1, 0, 8000, 8001, 1e9]) {
      const angle = needleAngle(v, BALANCE);
      expect(angle).toBeGreaterThanOrEqual(-90);
      expect(angle).toBeLessThanOrEqual(90);
    }
  });

  it("does not produce NaN from a bad reading or an empty scale", () => {
    expect(needleAngle(Number.NaN, BALANCE)).toBe(-90);
    expect(needleAngle(5, { min: 10, max: 10 })).toBe(-90);
  });
});

describe("the needle and the face agree", () => {
  /**
   * The property every old dial broke: the needle, the band and the ticks were
   * drawn from different numbers. A needle drawn pointing up and rotated by
   * needleAngle must point at exactly the spot pointOnArc marks.
   */
  it("puts the needle tip on the arc point for the same reading", () => {
    const cx = 100, cy = 100, r = 80;
    for (const v of [0, 500, 1999, 4000, 6100, 8000]) {
      const rad = (needleAngle(v, BALANCE) * Math.PI) / 180;
      const tip = { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
      const onArc = pointOnArc(cx, cy, r, fraction(v, BALANCE));
      expect(tip.x).toBeCloseTo(onArc.x, 6);
      expect(tip.y).toBeCloseTo(onArc.y, 6);
    }
  });

  it("places the balance's acceptable band where the needle points at the target", () => {
    const low = fraction(3920, BALANCE);
    const high = fraction(4080, BALANCE);
    const target = fraction(4000, BALANCE);
    expect(target).toBeGreaterThan(low);
    expect(target).toBeLessThan(high);
  });
});

describe("pointOnArc", () => {
  it("runs from the left end, over the top, to the right end", () => {
    const left = pointOnArc(100, 100, 80, 0);
    const top = pointOnArc(100, 100, 80, 0.5);
    const right = pointOnArc(100, 100, 80, 1);
    expect(left.x).toBeCloseTo(20); expect(left.y).toBeCloseTo(100);
    expect(top.x).toBeCloseTo(100); expect(top.y).toBeCloseTo(20);
    expect(right.x).toBeCloseTo(180); expect(right.y).toBeCloseTo(100);
  });
});

describe("arcPath", () => {
  it("starts and ends on the arc points it was asked for", () => {
    const path = arcPath(100, 100, 80, 0.25, 0.75);
    const start = pointOnArc(100, 100, 80, 0.25);
    const end = pointOnArc(100, 100, 80, 0.75);
    const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBeCloseTo(start.x, 2);
    expect(nums[1]).toBeCloseTo(start.y, 2);
    expect(nums[nums.length - 2]).toBeCloseTo(end.x, 2);
    expect(nums[nums.length - 1]).toBeCloseTo(end.y, 2);
  });

  it("draws the same arc whichever way round the ends are given", () => {
    expect(arcPath(100, 100, 80, 0.7, 0.2)).toBe(arcPath(100, 100, 80, 0.2, 0.7));
  });

  it("draws nothing for a zero-width band rather than a stray dot", () => {
    expect(arcPath(100, 100, 80, 0.4, 0.4)).toBe("");
  });

  it("keeps a band that runs off the scale inside the face", () => {
    expect(arcPath(100, 100, 80, -0.5, 1.5)).toBe(arcPath(100, 100, 80, 0, 1));
  });
});

describe("ticks", () => {
  it("includes both ends of the scale", () => {
    expect(ticks(BALANCE, 4)).toEqual([0, 2000, 4000, 6000, 8000]);
    expect(ticks({ min: 12, max: 33 }, 3)).toEqual([12, 19, 26, 33]);
  });
});

describe("zoneOf and severity", () => {
  const band = { low: 20, high: 25 };
  const scale = { min: 12, max: 33 };

  it("reads a value on the band's edge as inside it", () => {
    expect(zoneOf(20, band)).toBe("within");
    expect(zoneOf(25, band)).toBe("within");
    expect(zoneOf(19.9, band)).toBe("below");
    expect(zoneOf(25.1, band)).toBe("above");
  });

  it("is nothing inside the band", () => {
    expect(severity(22, band, scale)).toBe(0);
  });

  // A room two degrees warm and a room eight degrees warm should not look the same.
  it("grows with how far out of the band a reading is", () => {
    expect(severity(27, band, scale)).toBeLessThan(severity(31, band, scale));
    expect(severity(18, band, scale)).toBeLessThan(severity(14, band, scale));
  });

  it("reaches 1 at the end of the scale and never passes it", () => {
    expect(severity(33, band, scale)).toBe(1);
    expect(severity(12, band, scale)).toBe(1);
    expect(severity(80, band, scale)).toBe(1);
  });

  it("copes with a band that runs to the end of the scale", () => {
    expect(severity(40, { low: 20, high: 33 }, scale)).toBe(1);
  });
});

describe("envBounds", () => {
  // The gauge's copy of these numbers stopped short of the slider's, so the
  // needle pinned while the control still moved.
  it("matches the reach of the room controls", () => {
    expect(envBounds({ tempRange: [20, 25], humidityRange: [35, 55] })).toEqual({
      temp: { min: 12, max: 33 },
      humidity: { min: 15, max: 80 },
    });
  });

  it("never lets relative humidity go below zero", () => {
    expect(envBounds({ tempRange: [20, 25], humidityRange: [10, 30] }).humidity.min).toBe(0);
  });

  it("always leaves room either side of the acceptable band", () => {
    for (const env of [
      { tempRange: [20, 25] as [number, number], humidityRange: [35, 55] as [number, number] },
      { tempRange: [18, 24] as [number, number], humidityRange: [25, 40] as [number, number] },
    ]) {
      const b = envBounds(env);
      expect(b.temp.min).toBeLessThan(env.tempRange[0]);
      expect(b.temp.max).toBeGreaterThan(env.tempRange[1]);
      expect(b.humidity.max).toBeGreaterThan(env.humidityRange[1]);
    }
  });
});
