import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Camera } from "lucide-react";
import { PrescriptionLens } from "./PrescriptionLens";
import { AnimatePresence } from "framer-motion";

/**
 * The way in to Prescription Lens.
 *
 * Deliberately not a fifth mode card. The four modes are places you go to
 * practise; this is a thing you do to a document in your hand, and giving it
 * the same card shape would file it as "another mode" and lose that. It is a
 * wide banner with its own halo instead, so it reads as an instrument rather
 * than a destination.
 *
 * Owns its own modal state so a page can drop it in without wiring anything.
 */
export function LensEntry({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        className={`group relative w-full overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent p-5 text-left transition duration-300 hover:border-primary/70 ${className}`}
      >
        {/* The halo, behind everything and non-interactive. */}
        <span className="lens-halo pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/15 text-primary transition duration-300 group-hover:scale-105">
            <ScanLine className="size-6" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black">Prescription Lens</span>
              <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                New
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Photograph a real prescription and play it as a case in seconds.
            </span>
          </span>

          <span className="hidden shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground sm:inline-flex">
            <Camera className="size-3.5" /> Scan
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && <PrescriptionLens open={open} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
