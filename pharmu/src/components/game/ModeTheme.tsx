import React, { useEffect, type ReactNode } from "react";
import { ModeAmbientLayer } from "./ModeAmbientLayer";

const MODE_ACCENTS: Record<string, string> = {
  rx: "oklch(0.62 0.19 240)",
  otc: "oklch(0.72 0.16 165)",
  community: "oklch(0.74 0.14 180)",
  hospital: "oklch(0.60 0.20 270)",
  oncology: "oklch(0.62 0.22 300)",
  industry: "oklch(0.78 0.16 75)",
  warehousing: "oklch(0.60 0.18 220)",
};

interface ModeThemeProps {
  mode: string;
  children: ReactNode;
}

export function ModeTheme({ mode, children }: ModeThemeProps) {
  useEffect(() => {
    const accent = MODE_ACCENTS[mode] ?? MODE_ACCENTS.rx;

    document.documentElement.style.setProperty("--mode-accent", accent);
    document.body.classList.add("mode-themed", `mode-${mode}`);

    return () => {
      document.documentElement.style.removeProperty("--mode-accent");
      document.body.classList.remove("mode-themed", `mode-${mode}`);
    };
  }, [mode]);

  return (
    <div className="relative min-h-screen">
      <ModeAmbientLayer mode={mode} intensity="screen" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
