import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * The chrome around a policy page.
 *
 * Plain and readable on purpose. These are the two pages somebody opens
 * because they want to know something specific, so they get a measured column
 * and real headings rather than the landing page's treatment.
 */
export function LegalPage({
  title, updated, children,
}: {
  title: string;
  /** The date the wording last changed, not the date it was rendered. */
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Pharmulation
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>

        <div className="legal-prose mt-8 space-y-6 text-[0.95rem] leading-relaxed text-foreground/90">
          {children}
        </div>

        <footer className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/" className="transition-colors hover:text-primary">Home</Link>
            <Link to="/privacy" className="transition-colors hover:text-primary">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-primary">Terms</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

/** A titled block. Kept here so both pages indent and space identically. */
export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
