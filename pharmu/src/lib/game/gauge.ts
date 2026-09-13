/**
 * The arithmetic behind the analogue instruments on the manufacturing bench.
 *
 * Every dial drew its needle, its face and its markings from separate numbers,
 * and they had drifted apart in four ways at once:
 *
 *  - the balance face was a half circle but its needle swung only 54 degrees
 *    each way, so at 0 g it stopped a third of the way up the arc instead of
 *    lying on the zero mark;
 *  - the room gauges swung 260 degrees across the same half circle, so near
 *    either end the needle pointed below the dial;
 *  - the balance's acceptable band was a straight bar inside a curved face, so
 *    it never sat where the needle pointed;
 *  - and the temperature gauge's scale stopped short of its own slider, so the
 *    needle pinned while the control still moved.
 *
 * One source of truth fixes all four. A reading becomes a fraction of the
 * scale, and the needle angle, every tick and every arc on the face are drawn
 * from that same fraction. The tests assert that the needle tip and the arc
 * agree - the property the old dials broke.
 */

export type Scale = { min: number; max: number };
export type Band = { low: number; high: number };

/** A half-circle face: the scale minimum lies flat on the left, the maximum flat on the right. */
export const SWEEP_DEG = 180;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Where a reading sits on the scale, 0 to 1. Off the scale pins to an end rather than overshooting the face. */
export function fraction(value: number, scale: Scale): number {
  const span = scale.max - scale.min;
  if (!Number.isFinite(value) || !(span > 0)) return 0;
  return clamp01((value - scale.min) / span);
}

/**
 * Rotation, in degrees, for a needle drawn pointing straight up from its pivot.
 * -90 is flat on the left at the scale minimum; +90 is flat on the right.
 */
export function needleAngle(value: number, scale: Scale): number {
  return -SWEEP_DEG / 2 + fraction(value, scale) * SWEEP_DEG;
}

/** The point on the face at a fraction of the scale, in SVG coordinates (y grows downward). */
export function pointOnArc(cx: number, cy: number, r: number, frac: number): { x: number; y: number } {
  const theta = Math.PI - clamp01(frac) * Math.PI;
  return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
}

/** An SVG arc along the face between two fractions, running clockwise over the top. */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = clamp01(Math.min(from, to));
  const b = clamp01(Math.max(from, to));
  if (b - a < 1e-6) return "";
  const start = pointOnArc(cx, cy, r, a);
  const end = pointOnArc(cx, cy, r, b);
  const n = (v: number) => Number(v.toFixed(3));
  return `M ${n(start.x)} ${n(start.y)} A ${r} ${r} 0 0 1 ${n(end.x)} ${n(end.y)}`;
}

/** Evenly spaced tick values, both ends included. */
export function ticks(scale: Scale, segments: number): number[] {
  const count = Math.max(1, Math.round(segments));
  const step = (scale.max - scale.min) / count;
  return Array.from({ length: count + 1 }, (_, i) => scale.min + step * i);
}

export type Zone = "below" | "within" | "above";

export function zoneOf(value: number, band: Band): Zone {
  if (value < band.low) return "below";
  if (value > band.high) return "above";
  return "within";
}

/**
 * How far outside the band a reading is: 0 inside it, 1 at the end of the scale.
 *
 * Drives how hard a dial frosts over or glows, so the effect grows with the
 * fault rather than switching fully on at the first degree out - a room two
 * degrees warm and a room eight degrees warm should not look the same.
 */
export function severity(value: number, band: Band, scale: Scale): number {
  const zone = zoneOf(value, band);
  if (zone === "within") return 0;
  const room = zone === "below" ? band.low - scale.min : scale.max - band.high;
  const past = zone === "below" ? band.low - value : value - band.high;
  if (!(room > 0)) return 1;
  return clamp01(past / room);
}

/**
 * How far the room controls reach, shared by the sliders, the gauges and the
 * value the room opens at.
 *
 * There were three copies of these numbers. The gauge's copy stopped short of
 * the slider's, which is how a needle came to pin at the top of its dial while
 * the slider underneath it still had room to move.
 */
export function envBounds(env: { tempRange: [number, number]; humidityRange: [number, number] }): {
  temp: Scale; humidity: Scale;
} {
  const [tLow, tHigh] = env.tempRange;
  const [hLow, hHigh] = env.humidityRange;
  return {
    temp: { min: tLow - 8, max: tHigh + 8 },
    humidity: { min: Math.max(0, hLow - 20), max: hHigh + 25 },
  };
}
