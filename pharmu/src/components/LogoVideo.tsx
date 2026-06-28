type LogoVideoProps = {
  className?: string;
};

export function LogoVideo({ className = "" }: LogoVideoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <video
        aria-hidden="true"
        autoPlay
        muted
        playsInline
        poster="/logo-poster.png"
        preload="auto"
        className="h-full w-full object-contain"
      >
        <source src="/logo.webm" type="video/webm" />
        <source src="/logo.mp4" type="video/mp4" />
      </video>
      <span className="sr-only">Pharmulation</span>
    </span>
  );
}
