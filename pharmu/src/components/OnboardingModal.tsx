import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import { Sparkles, FileText, Trophy, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Pharmulation",
    body: "An immersive pharmacy training simulator. Real cases, real drugs, real growth — all from your browser.",
  },
  {
    icon: FileText,
    title: "Start with Rx Cases",
    body: "Prescription handling is the heart of pharmacy. We recommend starting here to build core reflexes.",
  },
  {
    icon: Trophy,
    title: "How scoring works",
    body: "Points come from correct drug, accurate labeling, speed, and reading drug info carefully. Streaks multiply XP.",
  },
  {
    icon: MessageCircle,
    title: "Meet your mentor",
    body: "👨‍⚕️ Dr. Hakim, your in-game mentor, will drop tips during cases. Tap 'Ask Mentor' anytime for a hint.",
  },
];

export function OnboardingModal() {
  const { profile, setProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const open = !!profile && !profile.onboarding_completed;

  if (!open) return null;

  async function finish() {
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", profile.user_id)
      .select("*")
      .maybeSingle();
    if (data) setProfile(data as typeof profile);
    toast.success("You're all set. Let's go!");
  }

  const Current = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="glass-card w-full max-w-lg p-8 text-center"
        >
          <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-primary/15 grid place-items-center text-primary">
            <Current className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">{steps[step].title}</h2>
          <p className="mt-3 text-muted-foreground">{steps[step].body}</p>

          <div className="mt-6 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>

          <div className="mt-8 flex justify-between gap-3">
            <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground">
              Skip
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)}
                  className="rounded-full px-5 py-2 text-sm border border-border hover:bg-white/5">
                  Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button onClick={() => setStep(step + 1)}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-105 transition">
                  Next
                </button>
              ) : (
                <button onClick={finish}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-105 transition">
                  Enter PharmaVerse
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
