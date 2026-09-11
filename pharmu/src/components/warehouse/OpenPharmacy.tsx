import { useState } from "react";
import { Building2, Landmark, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STARTING, type Difficulty } from "@/lib/warehouse/bootstrap";

/**
 * Opening a pharmacy.
 *
 * The three difficulties differ in working capital, overheads and overdraft
 * rather than in how forgiving the rules are - the law does not get softer
 * because you are new. On hard there is no overdraft at all, so a single
 * over-ordered week can end the run, which is the position most independent
 * pharmacies in Pakistan actually open in.
 */

const LEVELS: Array<{ key: Difficulty; label: string; blurb: string }> = [
  { key: "easy", label: "Backed", blurb: "Family money behind you and room to get it wrong." },
  { key: "medium", label: "Independent", blurb: "A working shop with a modest overdraft." },
  { key: "hard", label: "On your own", blurb: "No overdraft. One bad order ends it." },
];

export function OpenPharmacy({
  onOpen, opening,
}: {
  onOpen: (data: { name: string; city: string; difficulty: Difficulty }) => void;
  opening: boolean;
}) {
  const [name, setName] = useState("Al-Shifa Pharmacy");
  const [city, setCity] = useState("Karachi");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const start = STARTING[difficulty];
  // Rent and capital are worked out from the catalogue the shop turns out to
  // get, so there is no rupee figure to quote yet - only how tight it will be.
  const squeeze = Math.round(start.overheadShare * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Open a pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are taking over a licensed retail pharmacy with stock on the shelf, a
          Drug Sale Licence, and no narcotics permit. Everything after that is yours:
          what you carry, what you pay for it, where you keep it, and whether the
          paperwork stands up when an inspector walks in.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wh-name">Trading name</Label>
          <Input id="wh-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-city">City</Label>
          <Input id="wh-city" value={city} maxLength={40} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>How you are starting</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {LEVELS.map((level) => {
            const chosen = difficulty === level.key;
            return (
              <button
                key={level.key}
                type="button"
                onClick={() => setDifficulty(level.key)}
                className={`rounded-lg border p-3 text-left transition ${
                  chosen ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                }`}
              >
                <div className="text-sm font-semibold">{level.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{level.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card/60 p-4 sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Working capital</div>
            <div className="text-sm font-semibold">
              {start.capitalWeeks < 1 ? "under a week" : start.capitalWeeks > 1.2 ? "a comfortable week" : "about a week"} of buying
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overdraft</div>
            <div className="text-sm font-semibold">
              {start.overdraftWeeks > 0 ? "a few days of cover" : "none at all"}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Rent and wages</div>
            <div className="text-sm font-semibold">{squeeze}% of a perfect week</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The figures are set against what this pharmacy turns out to sell, so the
        pressure is the same whatever ends up on the shelves. At {squeeze}% a flawless
        week clears what is left - and a stock-out, a batch written off or a fine
        takes it straight back.
      </p>

      <Button
        className="w-full"
        disabled={opening || !name.trim() || !city.trim()}
        onClick={() => onOpen({ name: name.trim(), city: city.trim(), difficulty })}
      >
        {opening ? "Opening..." : "Open for business"}
      </Button>
    </div>
  );
}
