import type { Difficulty } from "./shared";

/**
 * Which case a player gets next.
 *
 * Two things were wrong with how this was decided, and between them they
 * produced exactly the complaint that the same case keeps coming back and that
 * choosing Expert does not feel like choosing anything.
 *
 * The first was that the pick was a uniform random draw with no memory. Several
 * buckets hold one or two cases - Expert OTC had exactly one - so "random"
 * meant "the same case, every time". The table to prevent that already existed
 * and had a column for it; nothing ever wrote to it for a non-generated case.
 *
 * The second was that the chosen difficulty was widened before it was used. A
 * player below level four asking for Expert drew from Expert *or* Trainee, and
 * from level eight up the pool was all four difficulties - so at that point
 * Expert and Trainee were the same pool and the choice changed nothing at all.
 */

export type Candidate = { id: string };

/**
 * The difficulty asked for is the difficulty served.
 *
 * Kept as a function rather than inlined so the property can be asserted: the
 * widening it replaces was easy to write and read as a kindness, and would be
 * just as easy to reintroduce.
 */
export function difficultyPool(selected: Difficulty): Difficulty[] {
  return [selected];
}

/**
 * The least-recently-played candidate, unseen ones first.
 *
 * A player therefore works through everything available before meeting
 * anything twice, which is the most a fixed pool can offer. Ties are broken at
 * random so two players with the same history do not walk the same path.
 *
 * `seen` maps a candidate id to when it was last played, in milliseconds.
 * Anything missing from it has never been played.
 */
export function pickNextCase<T extends Candidate>(
  candidates: readonly T[],
  seen: ReadonlyMap<string, number>,
  rng: () => number = Math.random,
): T | null {
  if (!candidates.length) return null;

  const unseen = candidates.filter((c) => !seen.has(c.id));
  if (unseen.length) return unseen[Math.floor(rng() * unseen.length) % unseen.length];

  let oldest = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const at = seen.get(candidate.id) ?? 0;
    if (at < oldest) oldest = at;
  }
  const stalest = candidates.filter((c) => (seen.get(c.id) ?? 0) === oldest);
  return stalest[Math.floor(rng() * stalest.length) % stalest.length];
}

/** Turn the rows the database hands back into the map `pickNextCase` wants. */
export function seenMap(rows: ReadonlyArray<{ case_id?: string | null; last_seen_at?: string | null }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.case_id) continue;
    const at = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
    map.set(row.case_id, Number.isFinite(at) ? at : 0);
  }
  return map;
}

/**
 * How many plays before a player is guaranteed to meet a repeat.
 *
 * Only used to tell the truth in a log line and in tests - a bucket holding one
 * case cannot be made to hold two by picking more carefully, and this is what
 * says so rather than leaving it to be discovered at a showcase.
 */
export function playsBeforeRepeat(poolSize: number): number {
  return Math.max(0, poolSize);
}
