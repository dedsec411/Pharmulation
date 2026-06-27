export function PillBackground() {
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
              background: `linear-gradient(90deg, oklch(0.75 0.14 ${hue}) 50%, oklch(0.95 0.02 240) 50%)`,
              boxShadow: `0 0 20px oklch(0.74 0.14 ${hue} / 0.4)`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
