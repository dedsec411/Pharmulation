import { useState } from "react";

type LogoVideoProps = {
  className?: string;
};

export function LogoVideo({ className = "" }: LogoVideoProps) {
  const [isLooping, setIsLooping] = useState(false);

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
