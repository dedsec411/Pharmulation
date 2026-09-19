import { useEffect, useState } from "react";
import { useThemeStore } from "@/lib/theme-store";

const LOGO_REVEAL_DURATION_MS = 5_082;

type LogoMedia = "poster" | "webm" | "webp";

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
  const [media, setMedia] = useState<LogoMedia>("poster");
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    // The reveal and loop are VP9 WebM files with an alpha channel. iOS and
    // Safari may play the video while discarding that alpha; the old H.264
    // fallback cannot carry alpha at all. Both paths paint the video's blue
    // 16:9 canvas as a rectangle around the mark.
    //
    // Start from the transparent poster so SSR and the first client render
    // agree, then select an alpha-capable animation. All browsers on iOS use
    // WebKit regardless of the browser name, so the platform check covers
    // Safari, Chrome and Firefox on an iPhone or iPad.
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isDesktopSafari = /Safari/.test(ua)
      && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
    const probe = document.createElement("video");
    const supportsVp9 = probe.canPlayType('video/webm; codecs="vp9"') !== "";

    if (!isiOS && !isDesktopSafari && supportsVp9) {
      setMedia("webm");
      return;
    }

    // Safari supports animated WebP with alpha, unlike the opaque H.264 MP4.
    // Preload both stages before mounting the reveal so its timer starts only
    // after the files are cached and the reveal-to-loop handoff stays seamless.
    const reveal = new Image();
    const loop = new Image();
    let cancelled = false;
    let loadedImages = 0;

    const showAnimationWhenReady = () => {
      loadedImages += 1;
      if (!cancelled && loadedImages === 2) setMedia("webp");
    };
    const showPoster = () => {
      if (!cancelled) setMedia("poster");
    };

    reveal.onload = showAnimationWhenReady;
    loop.onload = showAnimationWhenReady;
    reveal.onerror = showPoster;
    loop.onerror = showPoster;
    reveal.src = "/logo-reveal.webp";
    loop.src = "/logo-loop.webp";

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (media !== "webp" || isLooping) return;

    const timer = window.setTimeout(
      () => setIsLooping(true),
      LOGO_REVEAL_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [isLooping, media]);

  if (theme === "light") return <Wordmark size={size} />;

  return (
    <span className={`inline-flex items-center ${className}`}>
      {media === "webm" ? (
        <video
          key={isLooping ? "logo-loop" : "logo-reveal"}
          aria-hidden="true"
          autoPlay
          loop={isLooping}
          muted
          playsInline
          poster="/logo-poster.webp"
          preload="auto"
          onEnded={() => setIsLooping(true)}
          onError={() => setMedia("poster")}
          className="h-full w-full object-contain"
        >
          <source src={isLooping ? "/logo-loop.webm" : "/logo.webm"} type='video/webm; codecs="vp9"' />
        </video>
      ) : media === "webp" ? (
        <img
          key={isLooping ? "logo-loop" : "logo-reveal"}
          src={isLooping ? "/logo-loop.webp" : "/logo-reveal.webp"}
          alt=""
          aria-hidden="true"
          onError={() => setMedia("poster")}
          className="h-full w-full object-contain"
        />
      ) : (
        <img
          src="/logo-poster.webp"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
        />
      )}
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

/**
 * The drawn mark, used wherever the video would land as a black rectangle.
 *
 * This mark is sized by its own content, so it used to ignore the anchor it
 * sits in. The anchor is w-36 / sm:w-60 / md:w-40 / lg:w-60, and at 190px wide
 * the mark ran 46px past it below 640 and 30px past it between 768 and 1023 -
 * far enough for the account pill to cover the last letter at 360, and for the
 * word to run under the first nav link at 768. The sizes below follow the same
 * four steps as the anchor, so the mark fits its box at every width: 139px in
 * the narrow steps, 190px in the wide ones.
 */
function Wordmark({ size }: { size: "nav" | "hero" }) {
  const hero = size === "hero";
  return (
    <span
      className={`inline-flex items-center justify-center ${hero ? "gap-4" : "gap-1.5 sm:gap-2.5 md:gap-1.5 lg:gap-2.5"}`}
    >
      <Capsule className={hero ? "h-8 w-20 sm:h-11 sm:w-28" : "h-5 w-10 sm:h-6 sm:w-14 md:h-5 md:w-10 lg:h-6 lg:w-14"} />
      <span
        className={`font-extrabold tracking-tight text-gradient-teal ${
          hero ? "text-4xl sm:text-6xl md:text-7xl" : "text-[15px] sm:text-xl md:text-[15px] lg:text-xl"
        }`}
      >
        Pharmulation
      </span>
    </span>
  );
}
