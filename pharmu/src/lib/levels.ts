export type Tier = { min: number; max: number; title: string; level: number };

export const TIERS: Tier[] = [
  { min: 0, max: 499, title: "Intern", level: 1 },
  { min: 500, max: 1499, title: "Junior Pharmacist", level: 2 },
  { min: 1500, max: 2999, title: "Resident Pharmacist", level: 3 },
  { min: 3000, max: 4999, title: "Senior Pharmacist", level: 4 },
  { min: 5000, max: 7999, title: "Clinical Pharmacist", level: 5 },
  { min: 8000, max: Infinity, title: "Expert Pharmacist", level: 6 },
];

export function tierFor(xp: number): Tier {
  return TIERS.find((t) => xp >= t.min && xp <= t.max) ?? TIERS[0];
}

export function nextTier(xp: number): Tier | null {
  const i = TIERS.findIndex((t) => xp >= t.min && xp <= t.max);
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1] : null;
}

export function xpProgress(xp: number) {
  const t = tierFor(xp);
  const nt = nextTier(xp);
  if (!nt) return { pct: 100, current: xp - t.min, total: 1, tier: t, next: null };
  const total = nt.min - t.min;
  const current = xp - t.min;
  return { pct: Math.min(100, (current / total) * 100), current, total, tier: t, next: nt };
}
