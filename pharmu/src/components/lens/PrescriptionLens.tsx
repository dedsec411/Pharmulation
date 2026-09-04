import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera, Upload, X as XIcon, ScanLine, AlertTriangle, Check, Play,
  RotateCw, Pill, Stethoscope, ShieldCheck,
} from "lucide-react";
import { readPrescriptionImage } from "@/lib/api/lens.functions";
import { useScannedCaseStore } from "@/lib/lens/scanned-case-store";
import type { LensCase, LensSummary } from "@/lib/lens/build-case";
import { PUBLIC_MODE_GROUPS } from "@/lib/game/shared";

/**
 * Photograph a prescription, get a case.
 *
 * Three states in one dialog: choose an image, watch it being read, decide
 * whether to play what came back. They are one component because they are one
 * continuous moment - the picture, the scan and the verdict - and splitting
 * them across screens would put a navigation in the middle of it.
 *
 * The image never leaves this function except as one request body. It is read
 * to base64 in the browser, sent once, and the object URL used for the preview
 * is revoked as soon as the dialog closes. Nothing is uploaded to storage and
 * nothing is kept.
 */

type Stage = "pick" | "reading" | "preview" | "error";

const MAX_BYTES = 6 * 1024 * 1024;

/** The game route a mode is played at. */
function routeForMode(mode: string): string {
  const group = PUBLIC_MODE_GROUPS.find((g) => (g.modes as readonly string[]).includes(mode));
  return group ? `/game/${group.key}` : "/dashboard";
}

/** Strip the `data:image/jpeg;base64,` prefix the API does not want. */
function toBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const comma = raw.indexOf(",");
      resolve({ base64: comma >= 0 ? raw.slice(comma + 1) : raw, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}

export function PrescriptionLens({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const arm = useScannedCaseStore((s) => s.arm);

  const [stage, setStage] = useState<Stage>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [built, setBuilt] = useState<{ case: LensCase; summary: LensSummary } | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  // Held so it can be revoked: an object URL leaks the image into the
  // document's memory for as long as it is alive.
  const objectUrl = useRef<string | null>(null);

  function releasePreview() {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  }

  // Nothing about a scan survives the dialog closing.
  useEffect(() => {
    if (open) return;
    releasePreview();
    setStage("pick");
    setPreview(null);
    setBuilt(null);
    setError(null);
  }, [open]);

  useEffect(() => releasePreview, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && stage !== "reading") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stage, onClose]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError({ message: "That is not an image.", hint: "Choose a photo of the document." });
      setStage("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError({
        message: "That photo is too large to send.",
        hint: "Most phone cameras are fine. If this came from a scanner, try a smaller export.",
      });
      setStage("error");
      return;
    }

    releasePreview();
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    setStage("reading");
    setError(null);

    try {
      const { base64, mimeType } = await toBase64(file);
      const result = await readPrescriptionImage({ data: { imageBase64: base64, mimeType } });
      if (!result.ok) {
        setError({ message: result.error, hint: result.hint });
        setStage("error");
        return;
      }
      setBuilt({ case: result.case, summary: result.summary });
      setStage("preview");
    } catch (err) {
      console.error("Prescription Lens failed", err);
      setError({
        message: "Could not read that image.",
        hint: "Check your connection and try again.",
      });
      setStage("error");
    }
  }

  function play() {
    if (!built) return;
    arm(built);
    const to = routeForMode(String(built.case.mode));
    releasePreview();
    onClose();
    navigate({ to: to as never });
  }

  function retry() {
    releasePreview();
    setPreview(null);
    setBuilt(null);
    setError(null);
    setStage("pick");
  }

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-end overflow-y-auto bg-background/85 p-3 backdrop-blur-md sm:place-items-center sm:p-4"
      onClick={() => stage !== "reading" && onClose()}
    >
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="glass-card my-auto w-full max-w-xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Prescription Lens"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <ScanLine className="size-3.5" /> Prescription Lens
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {stage === "reading" ? "Reading the document"
                : stage === "preview" ? "Here is your case"
                : stage === "error" ? "That did not read"
                : "Scan a prescription"}
            </h2>
          </div>
          {stage !== "reading" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Prescription Lens"
              className="shrink-0 rounded-full border border-border/50 p-1.5 text-muted-foreground transition hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {stage === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mt-4 text-sm text-muted-foreground">
                Photograph a prescription, a medication label, a discharge summary or a chart.
                It becomes a playable case in about ten seconds.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInput.current?.click()}
                className={`mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <Upload className="size-7 text-primary" />
                <p className="mt-3 text-sm font-semibold">
                  <span className="hidden sm:inline">Drop a photo here, or click to browse</span>
                  <span className="sm:hidden">Choose a photo</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WEBP, up to 6&nbsp;MB</p>
              </div>

              {/* capture="environment" opens the rear camera straight away on a
                  phone. On a desktop the attribute is ignored and this is just
                  a second file picker, so it is only offered where it helps. */}
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:hidden"
              >
                <Camera className="size-4" /> Take a photo
              </button>

              <p className="mt-4 flex items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  The photo is read once and never stored. Any patient name on it is replaced
                  with a fictional one before anything reaches your screen.
                </span>
              </p>

              <input
                ref={fileInput} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </motion.div>
          )}

          {stage === "reading" && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/40">
                {preview && (
                  <img src={preview} alt="" className="h-full w-full object-contain opacity-70" />
                )}
                <div className="lens-grid pointer-events-none absolute inset-0" />
                {/* The sweep. A bar with a soft leading edge travelling the
                    height of the frame, which is what makes it read as a scan
                    rather than as a progress bar. */}
                <div className="lens-sweep pointer-events-none absolute inset-x-0 top-0 h-14">
                  <div className="h-full w-full bg-gradient-to-b from-transparent via-primary/25 to-primary/70" />
                  <div className="h-px w-full bg-primary shadow-[0_0_18px_4px_var(--color-primary)]" />
                </div>
                {[
                  "left-3 top-3 border-l-2 border-t-2",
                  "right-3 top-3 border-r-2 border-t-2",
                  "left-3 bottom-3 border-b-2 border-l-2",
                  "right-3 bottom-3 border-b-2 border-r-2",
                ].map((pos) => (
                  <span key={pos} className={`lens-bracket pointer-events-none absolute size-7 rounded-sm border-primary ${pos}`} />
                ))}
              </div>

              <ReadingCaption />
            </motion.div>
          )}

          {stage === "preview" && built && (
            <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LensPreview summary={built.summary} />
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={play}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
                >
                  <Play className="size-4" /> Play this case
                </button>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/50 px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <RotateCw className="size-4" /> This doesn't look right
                </button>
              </div>
            </motion.div>
          )}

          {stage === "error" && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 text-center">
              <AlertTriangle className="mx-auto size-8 text-amber-500" />
              <p className="mt-3 font-bold">{error.message}</p>
              {error.hint && (
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{error.hint}</p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  <RotateCw className="size-4" /> Try another photo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/**
 * The caption under the scan.
 *
 * Steps through what is actually happening rather than looping one word, so a
 * ten-second wait reads as progress through a process instead of a stall.
 */
function ReadingCaption() {
  const LINES = [
    "Reading the document",
    "Identifying medicines",
    "Checking them against the formulary",
    "Finding the clinical decision points",
    "Building your case",
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4 text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-semibold text-foreground"
        >
          {LINES[i]}
        </motion.p>
      </AnimatePresence>
      <p className="mt-1 text-xs text-muted-foreground">
        The image is being read in memory and is not being stored.
      </p>
    </div>
  );
}

/** What was found, before committing to play it. */
function LensPreview({ summary }: { summary: LensSummary }) {
  const modeLabel = summary.mode === "hospital" ? "Clinical" : "Community Pharmacy · Rx";

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
          {summary.documentType}
        </span>
        <span className="rounded-full border border-border/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {modeLabel}
        </span>
        <span className="rounded-full border border-border/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {summary.difficulty}
        </span>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/40 p-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Stethoscope className="size-4 text-primary" />
          {summary.patientName}, {summary.patientAge}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{summary.diagnosis}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The name on the document was replaced with a fictional one.
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/40 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Medicines read
        </p>
        <ul className="mt-2 space-y-1.5">
          {summary.resolved.map((r) => (
            <li key={r.matchedTo} className="flex items-center gap-2 text-sm">
              <Pill className="size-3.5 shrink-0 text-primary" />
              <span className="font-semibold">{r.matchedTo}</span>
              {/* Shown when the shelf name differs from what was written, so
                  it is clear what was matched to what. */}
              {r.readAs.toLowerCase() !== r.matchedTo.toLowerCase() && (
                <span className="truncate text-xs text-muted-foreground">read as "{r.readAs}"</span>
              )}
              <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {r.category}
              </span>
            </li>
          ))}
        </ul>
        {summary.dropped.length > 0 && (
          <p className="mt-2 border-t border-border/30 pt-2 text-[11px] text-amber-600 dark:text-amber-300">
            Not stocked here, so left out of the case: {summary.dropped.join(", ")}
          </p>
        )}
      </div>

      {summary.decisionPoints.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            What to watch for
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.decisionPoints.map((d) => (
              <li key={d} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
