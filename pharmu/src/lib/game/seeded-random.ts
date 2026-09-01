/**
 * Repeatable randomness, keyed on a string.
 *
 * Generated case detail has to be stable: a re-render must not change a
 * patient's blood pressure or move them to a different bed while someone is
 * reasoning about them. Seeding on the case id gives every case its own fixed
 * patient that is nonetheless different from the next one's.
 */

/** xmur3: string -> 32-bit seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32: seed -> repeatable [0,1) sequence. */
export function makeRng(seed: string): Rng {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
export const intBetween = (rng: Rng, min: number, max: number) => Math.round(between(rng, min, max));
export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length) % items.length];
