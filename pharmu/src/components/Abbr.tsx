import { useState } from "react";
import { useSettings } from "@/lib/settings-store";
import { expanded, lookup, tooltip } from "@/lib/glossary";

/**
 * A short form that can explain itself.
 *
 * The demo jury said the screens assume you already know what a GRN or FEFO
 * is. Three ways in, because three different people hit this:
 *
 *  - hover, for somebody at a desk who wants a reminder;
 *  - tap, because `title` does nothing on a phone and half the audience is on
 *    one - so this is a real button with a panel, not a tooltip attribute;
 *  - and the plain-English switch, which expands every one of them at once
 *    for somebody who would rather not keep asking.
 *
 * An unknown term renders as itself rather than throwing, so wrapping text is
 * always safe.
 */
export function Abbr({ term, className = "" }: { term: string; className?: string }) {
  const plainEnglish = useSettings((s) => s.plainEnglish);
  const [open, setOpen] = useState(false);
  const entry = lookup(term);

  if (!entry) return <>{term}</>;
  if (plainEnglish) return <span className={className}>{expanded(entry)}</span>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        title={tooltip(entry)}
        aria-expanded={open}
        aria-label={`${term}: ${tooltip(entry)}`}
        /* A term inside a sentence cannot grow to 44px without breaking the
           line it sits in, so the finger gets a taller invisible box around it
           on a phone and the text keeps its place. */
        className={`cursor-help underline decoration-dotted decoration-from-font underline-offset-2 transition hover:text-primary max-sm:relative max-sm:after:absolute max-sm:after:-inset-x-1 max-sm:after:-inset-y-3.5 max-sm:after:content-[''] ${className}`}
      >
        {entry.term}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1.5 w-60 -translate-x-1/2 rounded-xl border border-border/60 bg-popover p-3 text-left text-xs font-normal normal-case tracking-normal text-popover-foreground shadow-xl"
        >
          <span className="block font-semibold">{entry.full}</span>
          <span className="mt-1 block text-muted-foreground">{entry.plain}</span>
        </span>
      )}
    </span>
  );
}
