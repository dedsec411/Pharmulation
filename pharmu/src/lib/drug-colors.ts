/**
 * A stable colour per drug class or category.
 *
 * Derived from the name rather than a lookup table, so a class added to the
 * catalogue tomorrow gets a colour without anyone maintaining a map — and,
 * more importantly, the same class reads the same colour everywhere it
 * appears. That is what makes the colour informative rather than decorative.
 *
 * Hue varies; lightness and chroma are fixed, so the set stays harmonious and
 * legible against the app's dark glass surfaces.
 */

/** Deterministic hash -> hue. Small string, so a simple rolling hash is fine. */
function hueFor(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  // Skip the muddy 90-140 band, which reads as the app's own primary teal.
  const hue = hash;
  return hue >= 90 && hue <= 140 ? (hue + 120) % 360 : hue;
}

export type DrugTagColor = { background: string; color: string; borderColor: string };

export function drugTagColor(name?: string | null): DrugTagColor | undefined {
  const key = String(name ?? "").trim().toLowerCase();
  if (!key) return undefined;
  const h = hueFor(key);
  return {
    background: `oklch(0.62 0.15 ${h} / 0.16)`,
    color: `oklch(0.84 0.11 ${h})`,
    borderColor: `oklch(0.62 0.15 ${h} / 0.35)`,
  };
}
