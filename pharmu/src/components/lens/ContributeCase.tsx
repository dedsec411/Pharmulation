import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { contributeLensCase } from "@/lib/api/lens.functions";
import { useActiveCaseStore } from "@/lib/active-case-store";

/**
 * Offer to put a scanned case into the shared pool, once it has been played.
 *
 * Only appears for a case that came from Prescription Lens, and only after it
 * is finished - contributing something you have not played is contributing
 * something you have not checked.
 *
 * The case is re-anonymised server-side on the way in, so this component does
 * not have to be the thing that gets privacy right; it only has to ask.
 */
export function ContributeCase() {
  const caseData = useActiveCaseStore((s) => s.caseData) as Record<string, any> | null;
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  // Seeded and generated cases are already in the pool or belong to a
  // template. Only a scan has anything to contribute.
  if (!caseData?.lens_generated) return null;

  async function contribute() {
    if (!caseData || state !== "idle") return;
    setState("saving");
    try {
      const result = await contributeLensCase({
        data: {
          mode: caseData.mode === "hospital" ? "hospital" : "rx",
          difficulty: ["easy", "medium", "hard"].includes(caseData.difficulty)
            ? caseData.difficulty : "medium",
          title: String(caseData.title ?? "Contributed case"),
          explanation: String(caseData.explanation ?? ""),
          mentorTip: String(caseData.mentor_tip ?? ""),
          patient: {
            name: String(caseData.patient_info_json?.name ?? "Patient"),
            age: Number(caseData.patient_info_json?.age ?? 45),
            gender: String(caseData.patient_info_json?.gender ?? "unspecified"),
            allergies: String(caseData.patient_info_json?.allergies ?? "none"),
            diagnosis: String(caseData.patient_info_json?.diagnosis ?? ""),
            complaint: String(caseData.patient_info_json?.complaint ?? ""),
          },
          drugsRequired: Array.isArray(caseData.drugs_required)
            ? caseData.drugs_required.map(String) : [],
          correctAnswer: caseData.correct_answer_json ?? {},
        },
      });

      if (!result.ok) {
        toast.error(result.message ?? "Could not add that case to the pool.");
        setState("idle");
        return;
      }
      setState("done");
      toast.success("Added to the community pool", {
        description: "Other trainees can now be dealt this case.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not add that case to the pool.");
      setState("idle");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-bold">
        <Users className="size-4 text-primary" /> This case came from your scan
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        You can add it to the shared pool so other trainees get dealt it. The patient details
        are replaced again on the way in, and the prescription image was never stored.
      </p>
      <button
        type="button"
        onClick={contribute}
        disabled={state !== "idle"}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {state === "saving" && <Loader2 className="size-4 animate-spin" />}
        {state === "done" && <Check className="size-4" />}
        {state === "done" ? "Added to the pool"
          : state === "saving" ? "Adding" : "Save to community pool"}
      </button>
    </motion.div>
  );
}
