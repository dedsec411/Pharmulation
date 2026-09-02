import { useState } from "react";
import { useThemeStore } from "@/lib/theme-store";

type LogoVideoProps = {
  className?: string;
  /** Sizes the light-theme wordmark. The video ignores it and uses className. */
  size?: "nav" | "hero";
};

/**
 * The mark.
 *
 * Dark gets the animation. Light cannot: the video's black ground is baked
 * into its frames, so it lands on a pale page as an opaque rectangle - and in
 * the hero it covered the copy that is deliberately pulled up underneath it.
 * No blend mode removes it either. `screen` washes the artwork to white
 * against a white page, `darken` keeps the ground, and inverting turns the
 * white half of the capsule black, which is worse than the box.
 *
 * So light gets a drawn lockup instead of a filtered video: the same capsule,
 * the same name, in the theme's own green. That is a deliberate second mark
 * rather than a broken first one.
 */
export function LogoVideo({ className = "", size = "nav" }: LogoVideoProps) {
  const [isLooping, setIsLooping] = useState(false);
  const theme = useThemeStore((s) => s.theme);

  if (theme === "light") return <Wordmark size={size} />;

  return (
    <span className={`inline-flex items-center ${className}`}>
      <video
        key={isLooping ? "logo-loop" : "logo-reveal"}
        aria-hidden="true"
        autoPlay
        loop={isLooping}
        muted
        playsInline
        poster="/logo-poster.png"
        preload="auto"
        onEnded={() => setIsLooping(true)}
        className="h-full w-full object-contain"
      >
        <source src={isLooping ? "/logo-loop.webm" : "/logo.webm"} type="video/webm" />
        <source src="/logo.mp4" type="video/mp4" />
      </video>
      <span className="sr-only">Pharmulation</span>
    </span>
  );
}

/** The capsule from the animation, drawn: teal half, pale half, one seam. */
function Capsule({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 26" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pm-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0E7A47" />
          <stop offset="100%" stopColor="#12A063" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="62.5" height="24.5" rx="12.25"
        fill="#FFFFFF" stroke="#0E7A47" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M13 0.75h19v24.5H13A12.25 12.25 0 0 1 13 0.75Z" fill="url(#pm-cap)" />
      <rect x="31" y="0.75" width="1.5" height="24.5" fill="#0E7A47" fillOpacity="0.35" />
    </svg>
  );
}

function Wordmark({ size }: { size: "nav" | "hero" }) {
  const hero = size === "hero";
  return (
    <span
      className={`inline-flex items-center justify-center ${hero ? "gap-4" : "gap-2.5"}`}
    >
      <Capsule className={hero ? "h-8 w-20 sm:h-11 sm:w-28" : "h-6 w-14"} />
      <span
        className={`font-extrabold tracking-tight text-gradient-teal ${
          hero ? "text-4xl sm:text-6xl md:text-7xl" : "text-xl"
        }`}
      >
        Pharmulation
      </span>
    </span>
  );
}
