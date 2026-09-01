import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, ClipboardList, StickyNote,
  AlertTriangle, MessageSquare, Trash2, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { buildCaseFile, type LabReading, type PatientInfo, type Slide } from "@/lib/game/case-file";
import { toast } from "sonner";

/**
 * The clinical case file, read one slide at a time.
 *
 * Four tabs in a 200px box asked the learner to hold the whole picture in their
 * head while clicking between fragments of it. A handover is sequential, so the
 * file is too: admission, history, observations, labs, medications, order.
 *
 * Notes hang off the deck rather than sitting in a separate screen, because the
 * thing being annotated is on screen when the annotation is written.
 */

const NOTE_KINDS = [
  { key: "issue", label: "Mistake in the file", icon: AlertTriangle, tone: "text-amber-300 border-amber-300/40 bg-amber-400/10" },
  { key: "opinion", label: "My reasoning", icon: MessageSquare, tone: "text-sky-300 border-sky-300/40 bg-sky-400/10" },
] as const;

type NoteKind = (typeof NOTE_KINDS)[number]["key"];

type CaseNote = {
  id: string;
  kind: NoteKind;
  body: string;
  slide: string | null;
  created_at: string;
};

/**
 * case_notes is newer than the checked-in Supabase types, which are generated
 * from the live schema - so they cannot name the table until its migration has
 * been applied and they are regenerated. One narrow cast here beats hand-editing
 * a generated file that the next regeneration would overwrite. Replace with the
 * plain client once the types include it.
 */
const caseNotes = () => (supabase as unknown as {
  from: (table: string) => any;
}).from("case_notes");

const FLAG_STYLE: Record<LabReading["flag"], string> = {
  high: "border-rose-400/45 bg-rose-400/10 text-rose-100",
  low: "border-amber-400/45 bg-amber-400/10 text-amber-100",
  normal: "border-sky-300/25 bg-sky-400/10 text-sky-50",
  unknown: "border-slate-400/25 bg-slate-400/10 text-slate-200",
};

const FLAG_MARK: Record<LabReading["flag"], string> = {
  high: "▲ High", low: "▼ Low", normal: "Normal", unknown: "",
};

function SlideBody({ slide }: { slide: Slide }) {
  return (
    <div className="space-y-3">
      {slide.rows && (
        <dl className="grid gap-1.5">
          {slide.rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                row.emphasis === "alert"
                  ? "border-amber-300/45 bg-amber-400/10 text-amber-50"
                  : "border-indigo-200/15 bg-slate-950/40 text-slate-100"
              }`}
            >
              <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">{row.label}</dt>
              <dd className="min-w-0 text-right font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {slide.labs && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {slide.labs.map((lab) => (
            <div key={lab.name} className={`rounded-lg border px-3 py-2 ${FLAG_STYLE[lab.flag]}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{lab.name}</span>
                {lab.flag !== "unknown" && lab.flag !== "normal" && (
                  <span className="shrink-0 text-[10px] font-black">{FLAG_MARK[lab.flag]}</span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-bold">{lab.value}</p>
              {/* The range is what makes the number mean something. */}
              {lab.range && <p className="text-[10px] opacity-70">Ref {lab.range}</p>}
            </div>
          ))}
        </div>
      )}

      {slide.bullets && (
        <ul className="space-y-1.5">
          {slide.bullets.map((line, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border border-indigo-200/15 bg-slate-950/40 px-3 py-2 text-sm text-slate-100">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-300" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.body && (
        <p className="rounded-lg border border-indigo-300/25 bg-indigo-400/10 px-3 py-2.5 text-sm text-indigo-50">
          {slide.body}
        </p>
      )}
    </div>
  );
}

export function CaseFileSlides({
  caseId, caseTitle, patient, currentMeds, labs, physicianOrder,
}: {
  caseId: string;
  caseTitle: string;
  patient: PatientInfo;
  currentMeds: string[];
  labs: Record<string, string | number>;
  physicianOrder: string;
}) {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const qc = useQueryClient();

  const file = useMemo(
    () => buildCaseFile({ seed: caseId, title: caseTitle, patient, currentMeds, labs, physicianOrder }),
    [caseId, caseTitle, patient, currentMeds, labs, physicianOrder],
  );

  const [index, setIndex] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<NoteKind>("issue");

  const slide = file.slides[Math.min(index, file.slides.length - 1)];
  useEffect(() => { setIndex(0); }, [caseId]);

  const go = (delta: number) =>
    setIndex((i) => Math.min(file.slides.length - 1, Math.max(0, i + delta)));

  // Arrow keys page the deck, but not while a note is being typed.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { data: notes = [], isError: notesUnavailable } = useQuery({
    queryKey: ["case-notes", userId, caseId],
    enabled: !!userId,
    // Failure here must not take the case down with it, so the error is kept
    // local and surfaced as a disabled panel rather than thrown to the global
    // handler.
    retry: false,
    queryFn: async () => {
      const { data, error } = await caseNotes()
        .select("id, kind, body, slide, created_at")
        .eq("user_id", userId!)
        .eq("case_ref", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const body = draft.trim();
      if (!userId || !body) return;
      const { error } = await caseNotes().insert({
        user_id: userId,
        case_ref: caseId,
        case_title: caseTitle,
        slide: slide.key,
        kind,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["case-notes", userId, caseId] });
      toast.success("Note saved");
    },
    onError: (error) => {
      console.error("[supabase] could not save case note:", error);
      toast.error("Could not save that note.");
    },
  });

  const removeNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await caseNotes().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case-notes", userId, caseId] }),
  });

  return (
    <div className="rounded-xl border border-indigo-200/20 bg-slate-950/45 p-4 shadow-inner backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200">
          <ClipboardList className="h-3.5 w-3.5" /> Case file
        </p>
        <button
          type="button"
          onClick={() => setNotesOpen((open) => !open)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
            notesOpen
              ? "border-indigo-300/60 bg-indigo-400/20 text-indigo-100"
              : "border-indigo-200/25 text-indigo-200 hover:bg-indigo-400/10"
          }`}
        >
          <StickyNote className="h-3 w-3" /> Notes{notes.length > 0 ? ` (${notes.length})` : ""}
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-slate-50">{slide.title}</h2>
        <span className="shrink-0 font-mono text-[11px] text-slate-400">
          {index + 1} / {file.slides.length}
        </span>
      </div>
      <p className="mb-3 border-b border-indigo-200/15 pb-2 text-xs text-slate-400">{slide.caption}</p>

      <div className="min-h-56">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <SlideBody slide={slide} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-indigo-200/15 pt-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-full border border-indigo-200/25 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="flex gap-1.5">
          {file.slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-indigo-300" : "w-1.5 bg-indigo-200/30 hover:bg-indigo-200/60"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === file.slides.length - 1}
          className="inline-flex items-center gap-1 rounded-full border border-indigo-200/25 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/10 disabled:opacity-30"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-indigo-200/15 pt-3">
              {notesUnavailable ? (
                <p className="rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  Notes are not available yet - the case_notes table has not been created on this database.
                </p>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    {NOTE_KINDS.map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => setKind(k.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                          kind === k.key ? k.tone : "border-indigo-200/20 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <k.icon className="h-3 w-3" /> {k.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder={kind === "issue"
                      ? `What looks wrong on "${slide.title}"?`
                      : `Your reasoning about "${slide.title}"`}
                    className="mt-2 w-full resize-y rounded-lg border border-indigo-200/25 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-300/60"
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || addNote.isPending}
                    onClick={() => addNote.mutate()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add note
                  </button>

                  {notes.length > 0 && (
                    <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                      {notes.map((note) => {
                        const meta = NOTE_KINDS.find((k) => k.key === note.kind) ?? NOTE_KINDS[1];
                        return (
                          <li key={note.id} className={`rounded-lg border px-3 py-2 text-xs ${meta.tone}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                                <meta.icon className="h-3 w-3" /> {note.slide ?? "case"}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeNote.mutate(note.id)}
                                aria-label="Delete note"
                                className="shrink-0 opacity-60 transition hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-slate-100">{note.body}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
