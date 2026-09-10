/**
 * The part a pharmacy can lose its licence over.
 *
 * Everything here is pure and works off a snapshot, so an inspection can be
 * replayed and an educator can see exactly which finding cost what.
 *
 * The rules are the ones a Pakistani drug inspector actually turns up to
 * check: is the Drug Sale Licence in date, are the controlled medicines in the
 * safe, does the register balance, is the cold chain where it should be, and
 * is there expired stock still sitting on the shelf. None of them are about
 * tidiness. Each is a thing a real inspection closes a pharmacy for.
 */

import type { Paisa, StorageZone } from "./economics";
import { RUPEE } from "./economics";

export type LicenceKind = "drug_sale" | "narcotics";

export type Licence = {
  kind: LicenceKind;
  status: "active" | "expired" | "pending" | "refused";
  expiresPeriod: number;
};

export type ComplianceStock = {
  drugId: string;
  batchNo: string;
  qty: number;
  expiresPeriod: number;
  location: StorageZone;
  /** Where this medicine is supposed to live. */
  requiredZone: Exclude<StorageZone, "quarantine">;
  controlled: boolean;
};

export type Severity = "advisory" | "minor" | "major" | "critical";

export type Finding = {
  code: string;
  severity: Severity;
  /** What the inspector wrote down. */
  detail: string;
  /** What it costs. Critical findings can also close the pharmacy. */
  fine: Paisa;
};

/* ------------------------------------------------------------------ *
 * Licences
 * ------------------------------------------------------------------ */

/**
 * A licence is valid up to and including the week it expires.
 *
 * Trading a week past it is not a paperwork slip - it is trading unlicensed,
 * and it is the one finding that stops the pharmacy rather than fining it.
 */
export function licenceValid(licence: Licence | undefined, period: number): boolean {
  return Boolean(licence && licence.status === "active" && licence.expiresPeriod >= period);
}

export function find(licences: readonly Licence[], kind: LicenceKind): Licence | undefined {
  return licences.find((l) => l.kind === kind);
}

export function canTrade(licences: readonly Licence[], period: number): boolean {
  return licenceValid(find(licences, "drug_sale"), period);
}

/**
 * Controlled medicines need their own permit, on top of the sale licence.
 * Without both, they cannot be held or ordered at all.
 */
export function canHandleControlled(licences: readonly Licence[], period: number): boolean {
  return canTrade(licences, period) && licenceValid(find(licences, "narcotics"), period);
}

/** Weeks until a licence lapses. Negative once it already has. */
export function weeksUntilExpiry(licence: Licence | undefined, period: number): number | null {
  return licence ? licence.expiresPeriod - period : null;
}

/**
 * Worth warning about before it bites. Renewal takes time and money, and a
 * learner who finds out the week it lapses has already lost the argument.
 */
export function renewalDue(
  licences: readonly Licence[], period: number, noticeWeeks = 4,
): Licence[] {
  return licences.filter((l) => {
    const left = weeksUntilExpiry(l, period);
    return l.status === "active" && left !== null && left <= noticeWeeks;
  });
}

/* ------------------------------------------------------------------ *
 * The controlled drugs register
 * ------------------------------------------------------------------ */

export type RegisterLine = {
  drugId: string;
  name: string;
  /** What the running balance says should be there. */
  expected: number;
  /** What the learner counted on the shelf. */
  counted: number;
};

/**
 * A controlled drugs register has to reconcile exactly.
 *
 * Not "close enough", and not "within tolerance" - a missing ampoule of
 * morphine is a criminal matter, not a stock variance, so any difference at
 * all is a finding and a shortfall is a worse one than a surplus.
 */
export function reconcileRegister(lines: readonly RegisterLine[]): Finding[] {
  const findings: Finding[] = [];
  for (const line of lines) {
    const diff = line.counted - line.expected;
    if (diff === 0) continue;
    findings.push({
      code: diff < 0 ? "cd-shortfall" : "cd-surplus",
      severity: diff < 0 ? "critical" : "major",
      detail: diff < 0
        ? `${line.name}: register says ${line.expected}, ${line.counted} on the shelf. ${Math.abs(diff)} unaccounted for.`
        : `${line.name}: ${line.counted} on the shelf against a register balance of ${line.expected}. Unrecorded stock.`,
      fine: diff < 0 ? 50_000 * RUPEE : 20_000 * RUPEE,
    });
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * The inspection
 * ------------------------------------------------------------------ */

export type InspectionInput = {
  period: number;
  licences: readonly Licence[];
  stock: readonly ComplianceStock[];
  register: readonly RegisterLine[];
  /** Whether the fridge temperature log was kept this period. */
  temperatureLogKept: boolean;
};

export type InspectionResult = {
  findings: Finding[];
  totalFine: Paisa;
  /** True when the pharmacy may not keep trading. */
  suspended: boolean;
  passed: boolean;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0, major: 1, minor: 2, advisory: 3,
};

export function inspect(input: InspectionInput): InspectionResult {
  const findings: Finding[] = [];
  const { period } = input;

  // 1. The licence to be open at all.
  const sale = find(input.licences, "drug_sale");
  if (!licenceValid(sale, period)) {
    findings.push({
      code: "no-licence",
      severity: "critical",
      detail: sale
        ? `Drug Sale Licence expired in week ${sale.expiresPeriod}. The pharmacy has been trading unlicensed.`
        : "No Drug Sale Licence held.",
      fine: 100_000 * RUPEE,
    });
  }

  // 2. Controlled medicines, held at all and held properly.
  const controlled = input.stock.filter((s) => s.controlled && s.qty > 0);
  if (controlled.length && !licenceValid(find(input.licences, "narcotics"), period)) {
    findings.push({
      code: "controlled-no-permit",
      severity: "critical",
      detail: `${controlled.length} controlled line(s) held without a narcotics permit.`,
      fine: 75_000 * RUPEE,
    });
  }
  const looseCD = controlled.filter((s) => s.location !== "cd-safe");
  if (looseCD.length) {
    findings.push({
      code: "cd-not-secured",
      severity: "critical",
      detail: `Controlled medicines outside the safe: ${looseCD.map((s) => s.batchNo).join(", ")}.`,
      fine: 60_000 * RUPEE,
    });
  }

  // 3. The cold chain. A vaccine kept warm is not a filing error.
  const warm = input.stock.filter(
    (s) => s.qty > 0 && s.requiredZone === "cold-chain" && s.location !== "cold-chain"
      && s.location !== "quarantine");
  if (warm.length) {
    findings.push({
      code: "cold-chain-broken",
      severity: "major",
      detail: `Cold chain medicines stored out of the fridge: ${warm.map((s) => s.batchNo).join(", ")}.`,
      fine: 40_000 * RUPEE,
    });
  }
  if (!input.temperatureLogKept) {
    findings.push({
      code: "no-temperature-log",
      severity: "minor",
      detail: "No fridge temperature log for this period.",
      fine: 10_000 * RUPEE,
    });
  }

  // 4. Expired stock still where it could be sold.
  const expiredOnShelf = input.stock.filter(
    (s) => s.qty > 0 && s.expiresPeriod <= period && s.location !== "quarantine");
  if (expiredOnShelf.length) {
    findings.push({
      code: "expired-on-shelf",
      severity: "major",
      detail: `Expired stock not separated: ${expiredOnShelf.map((s) => s.batchNo).join(", ")}.`,
      fine: 30_000 * RUPEE,
    });
  }

  // 5. The register.
  findings.push(...reconcileRegister(input.register));

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const totalFine = findings.reduce((sum, f) => sum + f.fine, 0);

  return {
    findings,
    totalFine,
    // Trading unlicensed, or controlled drugs unaccounted for, stops the
    // pharmacy. Everything else is paid for and learned from.
    suspended: findings.some(
      (f) => f.code === "no-licence" || f.code === "controlled-no-permit" || f.code === "cd-shortfall"),
    passed: findings.length === 0,
  };
}

/** What renewing costs. Paid when applied for, not when granted. */
export const LICENCE_FEE: Record<LicenceKind, Paisa> = {
  drug_sale: 15_000 * RUPEE,
  narcotics: 25_000 * RUPEE,
};

/** How long a renewal lasts, and how long a fresh permit takes to come through. */
export const LICENCE_TERM_WEEKS = 52;
export const NARCOTICS_LEAD_WEEKS = 3;

/**
 * How long a suspended pharmacy stays shut.
 *
 * Being closed down is temporary and recoverable - you shut, you put it right,
 * you reopen. The weeks of no takings against unchanged rent are the
 * punishment, and they are far heavier than any of the fines.
 */
export const SUSPENSION_WEEKS = 2;
