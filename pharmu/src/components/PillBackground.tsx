import { useThemeStore } from "@/lib/theme-store";

/**
 * The drifting capsules behind the hero.
 *
 * Each is half coloured and half capsule-body. On the dark ground the body
 * half is near-white and the pill reads whole; on the pale ground that half
 * disappears and what is left looks like a scattering of coloured shards. So
 * light darkens the coloured half, darkens the body half enough to sit on
 * white, and outlines the whole capsule - which is what actually makes it read
 * as a pill rather than a blob.
 */
export function PillBackground() {
  const theme = useThemeStore((s) => s.theme);
  const light = theme === "light";
  const pills = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pills.map((_, i) => {
        const left = (i * 73) % 100;
        const top = (i * 41) % 100;
        const delay = (i % 7) * 0.8;
        const size = 18 + (i % 5) * 6;
        const hue = i % 3 === 0 ? "180" : i % 3 === 1 ? "190" : "200";
        return (
          <div
            key={i}
            className="floating-pill absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size / 2,
              background: light
                ? `linear-gradient(90deg, oklch(0.55 0.14 ${hue}) 50%, oklch(0.93 0.012 ${hue}) 50%)`
                : `linear-gradient(90deg, oklch(0.75 0.14 ${hue}) 50%, oklch(0.95 0.02 240) 50%)`,
              boxShadow: light
                ? `0 0 0 1px oklch(0.45 0.09 ${hue} / 0.28), 0 6px 14px -8px oklch(0.45 0.12 ${hue} / 0.5)`
                : `0 0 20px oklch(0.74 0.14 ${hue} / 0.4)`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
