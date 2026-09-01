import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X as XIcon } from "lucide-react";
import { buildBooklet, type BookletInput } from "@/lib/game/batch-booklet";

/**
 * The batch manufacturing record, open on the bench.
 *
 * A production pharmacist works from the record rather than from memory, so it
 * is reachable at every phase rather than shown once at the start. It holds the
 * formula, the environmental limits, what each stage is for and what each QC
 * test measures - but never which option is correct for this batch, which would
 * turn the process and QC steps into a lookup.
 */
export function BatchBooklet(props: BookletInput) {
  const [open, setOpen] = useState(false);
  const sections = buildBooklet(props);
  const [active, setActive] = useState(sections[0]?.key ?? "");
  const section = sections.find((s) => s.key === active) ?? sections[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-200 transition hover:bg-amber-400/20"
      >
        <BookOpen className="h-3.5 w-3.5" /> Batch record
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-200/25 bg-slate-950 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-amber-200/20 bg-amber-400/5 px-5 py-4">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    <BookOpen className="h-3.5 w-3.5" /> Batch manufacturing record
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-50">{props.product}</h2>
                  <p className="text-xs text-slate-400">
                    {props.batchSize} · Batch {props.batchNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close batch record"
                  className="rounded-full border border-slate-600/50 p-1.5 text-slate-400 transition hover:text-slate-100"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-amber-200/15 px-5 py-2">
                {sections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      s.key === section.key
                        ? "bg-amber-400/20 text-amber-100"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-3 text-xs text-slate-400">{section.caption}</p>
                <dl className="space-y-2">
                  {section.entries.map((entry) => (
                    <div
                      key={entry.term}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <dt className="font-bold text-slate-100">{entry.term}</dt>
                        {/* On the formula page this is the number to weigh; on the
                            others it is the sentence that explains the step. */}
                        <dd className="font-mono text-sm text-amber-200">{entry.detail}</dd>
                      </div>
                      {entry.note && <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{entry.note}</p>}
                    </div>
                  ))}
                </dl>
              </div>

              <p className="border-t border-amber-200/15 px-5 py-2.5 text-[11px] text-slate-500">
                Reference only. The record states what each step is for, not which option to pick for this batch.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
