/**
 * What a mode shows while its case is being built.
 *
 * This was a line of grey text on an empty screen, which reads as nothing
 * happening - and case generation does real work (templates, a drug pool,
 * brands, a seen-cases check), so it is the one moment where the app most
 * needs to look like it is thinking.
 *
 * A capsule filling and a pair of shimmering bars, animated with transform and
 * background-position only. The shimmer is a CSS animation, so the global
 * prefers-reduced-motion rule already flattens it without any work here.
 */
export function CaseLoading({ label = "Building your case" }: { label?: string }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10">
          {/* The capsule from the mark, filling and emptying. */}
          <svg viewBox="0 0 64 26" className="h-5 w-12" aria-hidden="true">
            <rect x="1" y="1" width="62" height="24" rx="12" fill="none"
              stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" className="text-primary" />
            <rect x="1" y="1" width="62" height="24" rx="12" className="capsule-fill fill-primary" />
          </svg>
        </div>

        <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>

        <div className="mt-5 space-y-2" aria-hidden="true">
          <div className="shimmer-bar h-2.5 w-full rounded-full" />
          <div className="shimmer-bar h-2.5 w-4/5 mx-auto rounded-full" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Picking the patient, the medicines and the mistakes worth making.
        </p>
      </div>
    </main>
  );
}
