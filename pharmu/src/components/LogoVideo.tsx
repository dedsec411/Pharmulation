import { useState } from "react";

type LogoVideoProps = {
  className?: string;
};

export function LogoVideo({ className = "" }: LogoVideoProps) {
  const [isLooping, setIsLooping] = useState(false);

  return (
    // The dark ground is baked into the video frames, so on a light page it
    // lands as a stray dark rectangle. It cannot be keyed out - blend modes
    // either wash the artwork to white or keep the ground - so the light theme
    // makes it deliberate instead: a brand plaque in the Green Cross dark, the
    // way a logo with its own background is set on stationery.
    <span className={`logo-plaque inline-flex items-center ${className}`}>
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
