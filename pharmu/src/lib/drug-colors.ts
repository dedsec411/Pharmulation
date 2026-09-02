/**
 * A stable colour per drug class or category.
 *
 * Derived from the name rather than a lookup table, so a class added to the
 * catalogue tomorrow gets a colour without anyone maintaining a map — and,
 * more importantly, the same class reads the same colour everywhere it
 * appears. That is what makes the colour informative rather than decorative.
 *
 * Hue varies; lightness and chroma are fixed, so the set stays harmonious and
 * legible against the surface behind it. Which lightness that is depends on
 * the theme: a tag's fill is the same translucent wash either way, so on dark
 * the text has to be pale and on light it has to be deep. Carrying the dark
 * value across turned every tag into pale-on-pale.
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

export function drugTagColor(
  name?: string | null,
  theme: "dark" | "light" = "dark"
): DrugTagColor | undefined {
  const key = String(name ?? "").trim().toLowerCase();
  if (!key) return undefined;
  const h = hueFor(key);

  if (theme === "light") {
    return {
      background: `oklch(0.62 0.15 ${h} / 0.13)`,
      // Deep enough to clear 4.5:1 against the wash over a white card.
      color: `oklch(0.42 0.14 ${h})`,
      borderColor: `oklch(0.52 0.13 ${h} / 0.4)`,
    };
  }
  return {
    background: `oklch(0.62 0.15 ${h} / 0.16)`,
    color: `oklch(0.84 0.11 ${h})`,
    borderColor: `oklch(0.62 0.15 ${h} / 0.35)`,
  };
}
