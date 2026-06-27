import React, { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Mode accent colours (must match styles.css body.mode-* vars) ─────────────
const MODE_ACCENTS: Record<string, string> = {
  rx:          "oklch(0.62 0.19 240)",   // blue
  otc:         "oklch(0.72 0.16 165)",   // emerald
  community:   "oklch(0.74 0.14 180)",   // teal (shared Rx+OTC)
  hospital:    "oklch(0.60 0.20 270)",   // indigo
  oncology:    "oklch(0.62 0.22 300)",   // violet-purple
  cosmetic:    "oklch(0.68 0.22 340)",   // pink
  cosmetics:   "oklch(0.68 0.22 340)",   // pink (alias — route uses "cosmetics")
  emergency:   "oklch(0.65 0.22 25)",    // red
  industry:    "oklch(0.78 0.16 75)",    // amber
  warehousing: "oklch(0.60 0.18 220)",   // sky-blue
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface ModeThemeProps {
  mode: string;
  children: ReactNode;
}

// ─── Wrapper component used by every game route ───────────────────────────────
// Usage in route: component: () => <ModeTheme mode="emergency"><GameComponent /></ModeTheme>
export function ModeTheme({ mode, children }: ModeThemeProps) {
  useEffect(() => {
    const accent = MODE_ACCENTS[mode] ?? MODE_ACCENTS.rx;

    // Set CSS variable for accent colour
    document.documentElement.style.setProperty("--mode-accent", accent);

    // Set body classes: mode-themed + mode-specific
    document.body.classList.add("mode-themed", `mode-${mode}`);

    return () => {
      // Clean up on unmount (when leaving the game route)
      document.documentElement.style.removeProperty("--mode-accent");
      document.body.classList.remove("mode-themed", `mode-${mode}`);
    };
  }, [mode]);

  return <>{children}</>;
}

// ─── Light / dark toggle button ───────────────────────────────────────────────
// Used inside GameHeader — kept as a named export so GameHeader can import it
export function ThemeToggleButton() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-muted-foreground hover:text-foreground rounded-lg"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 transition-transform duration-200" />
      ) : (
        <Sun className="h-5 w-5 transition-transform duration-200" />
      )}
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
}