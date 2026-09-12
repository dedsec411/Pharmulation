/**
 * What a material is for.
 *
 * The weighing bench printed "Distractor" underneath every decoy, so the whole
 * step could be worked by weighing the things that were not labelled as the
 * wrong answer. The master formula was never opened and no pharmacy was
 * needed. Grouping the bench by that label would have made it worse: a tab
 * marked Distractor is a tab containing the answer.
 *
 * So a decoy now carries the role it genuinely has. Every entry below is the
 * role that material already holds in one of this mode's own formulas, copied
 * across rather than invented - magnesium stearate is a tablet lubricant
 * wherever it appears, and the thing a learner has to notice is that a
 * lubricant has no business in a syrup, not that a caption said "distractor".
 *
 * Adding a material means giving it the role it has in a formula. If it has
 * none here, that is a question for a pharmacist rather than a default.
 */

/** Roles taken verbatim from the master formulas in the industry mode. */
export const EXCIPIENT_ROLES: Record<string, string> = {
  "carbomer 940": "Gelling agent",
  "carbomer gel base": "Gelling agent",
  "croscarmellose sodium": "Disintegrant",
  "empty gelatin capsules": "Capsule shell",
  "empty hard gelatin capsules": "Capsule shell",
  "enteric polymer": "Enteric coat",
  "gelatin shell": "Capsule shell",
  "gelatin shells": "Capsule shell",
  "gelatin mass": "Soft shell",
  "hpmc film coat": "Film coat",
  "magnesium stearate": "Lubricant",
  "sodium benzoate": "Preservative",
  "sorbitol solution": "Sugar-free vehicle",
  "sucrose syrup": "Syrup base",
  "white soft paraffin": "Oleaginous base",
};

/**
 * A role that says nothing about whether the material belongs in this batch.
 *
 * Reached only by a material nobody has given a role to. It reads as a
 * cataloguing gap rather than a hint, which is the right failure: the previous
 * fallback told the learner the answer.
 */
export const UNCLASSIFIED_ROLE = "Raw material";

export function roleFor(name: string, fallback: string = UNCLASSIFIED_ROLE): string {
  return EXCIPIENT_ROLES[String(name ?? "").trim().toLowerCase()] ?? fallback;
}

export type BenchItem = { name: string; role: string; isReal: boolean };

/**
 * The bench, grouped for the tabs, with the roles in a stable order.
 *
 * Sorted by how many materials share a role and then alphabetically, so the
 * tab strip does not reshuffle between two batches of the same product - and
 * never by whether the group holds the answer.
 */
export function groupByRole(items: readonly BenchItem[]): Array<{ role: string; items: BenchItem[] }> {
  const groups = new Map<string, BenchItem[]>();
  for (const item of items) {
    const role = item.role || UNCLASSIFIED_ROLE;
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role)!.push(item);
  }
  return [...groups.entries()]
    .map(([role, group]) => ({ role, items: group }))
    .sort((a, b) => b.items.length - a.items.length || a.role.localeCompare(b.role));
}
