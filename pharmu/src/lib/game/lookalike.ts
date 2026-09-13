/**
 * Brand names close enough to be picked up by mistake.
 *
 * Confusing one brand for another is among the most common ways a dispensing
 * error reaches a patient, and the pairs that do it are specific to a market:
 * ISMP publishes a list for the United States, and there is no published one
 * for Pakistan. This catalogue carries 1,286 Pakistani brand names, which is
 * enough to look.
 *
 * What this module measures is how close two names are to read or to type. It
 * is not a claim that any particular pair has ever been confused in a pharmacy
 * - that needs incident data and a pharmacist, and the pairs this produces are
 * candidates for review rather than findings. Nothing downstream depends on
 * that judgement either: the task built from a pair is "the prescription says
 * this one, take this one", which is reading accuracy and asserts no
 * pharmacology at all.
 */

/** Levenshtein distance, capped so a hopeless comparison stops early. */
export function editDistance(a: string, b: string, cap = Infinity): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (Math.abs(s.length - t.length) > cap) return cap + 1;

  let previous = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }
    if (best > cap) return cap + 1;
    previous = current;
  }
  return previous[t.length];
}

/**
 * The name as the eye takes it in: letters and digits only.
 *
 * "Anti Dandruff" and "Anti-Dandruff" are one edit apart and the same words.
 * Comparing the stripped forms drops that whole class of false pair, which
 * otherwise sits at the top of the list because punctuation is cheap to edit.
 */
export function normaliseName(value: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** How many trailing characters two names share. */
export function sharedSuffix(a: string, b: string): number {
  const s = normaliseName(a);
  const t = normaliseName(b);
  let i = 0;
  while (i < s.length && i < t.length && s[s.length - 1 - i] === t[t.length - 1 - i]) i += 1;
  return i;
}

/** How many leading characters two names share. */
export function sharedPrefix(a: string, b: string): number {
  const s = normaliseName(a);
  const t = normaliseName(b);
  let i = 0;
  while (i < s.length && i < t.length && s[i] === t[i]) i += 1;
  return i;
}

export type BrandRow = {
  brand: string;
  drugId: string;
  generic: string;
  drugClass: string;
};

export type ConfusablePair = {
  a: BrandRow;
  b: BrandRow;
  distance: number;
  prefix: number;
  /** Different therapeutic class - the substitution that does the most harm. */
  crossClass: boolean;
};

/**
 * Names too close for comfort.
 *
 * Short names are excluded because at four characters almost everything is
 * within two edits of something, and the result is noise rather than a
 * warning. Two brands of the same medicine are excluded too: reaching for the
 * wrong one of those is a stock question, not a safety one.
 */
export function isConfusable(a: BrandRow, b: BrandRow): boolean {
  if (a.drugId === b.drugId) return false;

  const x = normaliseName(a.brand);
  const y = normaliseName(b.brand);
  if (x === y) return false;
  // Under five characters almost everything is within two edits of something,
  // and the result is noise rather than a warning. Over eighteen, two edits is
  // a 90%-identical string and the names are long enough to read properly.
  if (x.length < 5 || y.length < 5) return false;
  if (x.length > 18 || y.length > 18) return false;
  if (Math.abs(x.length - y.length) > 2) return false;

  const distance = editDistance(x, y, 2);
  if (distance > 2) return false;
  if (distance <= 1) return true;

  // Two edits counts when the names share a beginning, share an ending, or run
  // to the same length - the three things that make one pack look like another
  // on a shelf, or one name sound like another across a counter.
  return sharedPrefix(x, y) >= 3 || sharedSuffix(x, y) >= 3 || x.length === y.length;
}

/**
 * Every confusable pair in a catalogue, worst first.
 *
 * The catalogue is deduplicated by name first. It holds 1,286 rows under 1,212
 * distinct names, because a brand can be listed more than once, and without
 * this the same pair of names comes out two or three times - which then puts
 * the same question twice in one drill.
 */
export function findConfusablePairs(rows: readonly BrandRow[]): ConfusablePair[] {
  const seen = new Set<string>();
  const unique: BrandRow[] = [];
  for (const row of rows) {
    const key = normaliseName(row.brand);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  rows = unique;

  const pairs: ConfusablePair[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (!isConfusable(rows[i], rows[j])) continue;
      // Canonical orientation. Without it the same catalogue in a different
      // order produces the same pairs with the two names swapped, and the
      // generated file stops being byte-identical between runs - which is the
      // property that lets a pharmacist review it once and trust it after.
      const [a, b] = rows[i].brand.toLowerCase() <= rows[j].brand.toLowerCase()
        ? [rows[i], rows[j]]
        : [rows[j], rows[i]];
      pairs.push({
        a, b,
        distance: editDistance(a.brand, b.brand),
        prefix: sharedPrefix(a.brand, b.brand),
        crossClass: normaliseClass(a.drugClass) !== normaliseClass(b.drugClass),
      });
    }
  }
  return pairs.sort(rank);
}

function normaliseClass(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Worst first: a cross-class pair one letter apart is the one to teach.
 *
 * Ordered deterministically all the way down to the names, so the generated
 * list is stable and a review of it can be repeated.
 */
function rank(x: ConfusablePair, y: ConfusablePair): number {
  if (x.crossClass !== y.crossClass) return x.crossClass ? -1 : 1;
  if (x.distance !== y.distance) return x.distance - y.distance;
  if (x.prefix !== y.prefix) return y.prefix - x.prefix;
  return x.a.brand.localeCompare(y.a.brand) || x.b.brand.localeCompare(y.b.brand);
}

/** The headline figures, for the panel that opens the drill. */
export function summarise(pairs: readonly ConfusablePair[], brandCount: number) {
  return {
    brandCount,
    pairCount: pairs.length,
    crossClassCount: pairs.filter((p) => p.crossClass).length,
    oneLetterCount: pairs.filter((p) => p.distance === 1).length,
  };
}
