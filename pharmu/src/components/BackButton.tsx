import { useRouter, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface BackButtonProps {
  to?: string;          // explicit destination; if omitted, uses router.history.back()
  label?: string;       // text next to arrow; defaults to "Back"
  className?: string;
}

export function BackButton({ to, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();
  const navigate = useNavigate();

  function handleBack() {
    if (to) navigate({ to: to as any });
    else router.history.back();
  }

  return (
    <motion.button
      onClick={handleBack}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1.04, x: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`
        group inline-flex items-center gap-2
        rounded-2xl
        px-4 py-2.5
        text-sm font-semibold
        text-foreground/80
        border border-white/10
        bg-white/5
        backdrop-blur-xl
        shadow-[0_2px_16px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.07)]
        hover:bg-white/10 hover:border-white/20 hover:text-foreground
        transition-colors duration-150
        ${className}
      `}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </motion.button>
  );
}

// ── Floating variant — fixed top-left corner, for game screens ──────────────
interface FloatingBackButtonProps {
  to?: string;
  label?: string;
  onBeforeNavigate?: () => boolean; // return false to cancel (e.g. confirm mid-game)
}

export function FloatingBackButton({ to, label = "Exit", onBeforeNavigate }: FloatingBackButtonProps) {
  const router = useRouter();
  const navigate = useNavigate();

  function handleBack() {
    if (onBeforeNavigate && !onBeforeNavigate()) return;
    if (to) navigate({ to: to as any });
    else router.history.back();
  }

  return (
    <motion.button
      onClick={handleBack}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      className="
        fixed top-20 left-4 z-40
        inline-flex items-center gap-2
        rounded-2xl
        px-3.5 py-2
        text-xs font-bold uppercase tracking-wider
        text-foreground/70
        border border-white/10
        bg-background/40
        backdrop-blur-2xl
        shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]
        hover:bg-white/10 hover:border-white/25 hover:text-foreground
        transition-colors duration-150
        group
      "
      aria-label={label}
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </motion.button>
  );
}
