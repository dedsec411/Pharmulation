import { describe, expect, it } from "vitest";
import {
  VERIFIED_SHIPMENTS, ZONES, buildWarehouseShift, describeShift, isVerifiedCombination,
} from "./warehouse-case";
import type { Difficulty } from "./shared";

const NOW = new Date("2026-09-13T00:00:00Z");
const LEVELS: Difficulty[] = ["easy", "medium", "hard"];
const shift = (seed: string, d: Difficulty = "medium") => buildWarehouseShift(seed, d, NOW);

describe("nothing clinical is invented", () => {
  /**
   * The whole reason this generator recombines rather than generates. `drugs`
   * has no storage column, so deciding a medicine belongs at 2-8°C would be
   * inventing a storage condition for a real product and then marking a
   * student wrong against it.
   */
  it("only ever emits a medicine, requirement and zone somebody signed off together", () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 40; i += 1) {
        for (const s of shift(`seed-${i}`, level).shipments) {
          expect(isVerifiedCombination(s)).toBe(true);
        }
      }
    }
  });

  it("never sends stock to a bay the store does not have", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const s of shift(`seed-${i}`).shipments) expect(ZONES).toContain(s.correctZone);
    }
  });

  it("keeps a controlled medicine controlled", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const s of shift(`seed-${i}`).shipments) {
        const source = VERIFIED_SHIPMENTS.find((v) => v.drug === s.drug && v.correctZone === s.correctZone)!;
        expect(!!s.controlled).toBe(!!source.controlled);
      }
    }
  });
});

describe("a shift is playable", () => {
  it("gives every phase something to do", () => {
    for (const level of LEVELS) {
      const s = shift("play", level);
      expect(s.shipments.length).toBeGreaterThan(1);
      expect(s.dispatch.length).toBeGreaterThan(0);
      expect(s.expiring.length).toBeGreaterThan(0);
      expect(s.reconciliation.length).toBeGreaterThan(0);
    }
  });

  it("numbers every batch uniquely, because a recall names one and nothing else", () => {
    for (let i = 0; i < 40; i += 1) {
      const s = shift(`seed-${i}`);
      const batches = s.shipments.map((x) => x.batch);
      expect(new Set(batches).size).toBe(batches.length);
      for (const order of s.dispatch) {
        const inner = order.batches.map((b) => b.batch);
        expect(new Set(inner).size).toBe(inner.length);
      }
    }
  });

  it("makes FEFO answerable: the correct batch really is the earliest expiry", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const order of shift(`seed-${i}`).dispatch) {
        const earliest = [...order.batches].sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
        expect(order.correctBatch).toBe(earliest.batch);
        expect(new Set(order.batches.map((b) => b.expiry)).size).toBe(order.batches.length);
      }
    }
  });

  it("keeps the expiry decision consistent with whether anybody wants the stock", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const item of shift(`seed-${i}`).expiring) {
        expect(item.correctAction).toBe(
          item.hasOrder ? "Mark for Priority Dispatch" : "Mark for Return to Supplier",
        );
      }
    }
  });

  // Counts are produced from the decision, so a line flagged for investigation
  // is unmistakably short and a clean line reconciles exactly.
  it("does not ask anyone to judge a variance that is not there", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const row of shift(`seed-${i}`).reconciliation) {
        if (row.investigate) expect(row.actual).toBeLessThan(row.expected);
        else expect(row.actual).toBe(row.expected);
      }
    }
  });

  it("logs a temperature for cold storage and not for a dry shelf", () => {
    for (let i = 0; i < 30; i += 1) {
      for (const s of shift(`seed-${i}`).shipments) {
        const cold = s.correctZone === "Cool Room 2-8°C" || s.correctZone === "Freezer";
        expect(!!s.tempLog).toBe(cold);
      }
    }
  });

  it("marks an excursion only when the log actually leaves the range", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const s of shift(`seed-${i}`).shipments) {
        if (!s.tempLog) continue;
        if (s.correctZone === "Freezer") {
          expect(s.tempLog.excursion).toBe(s.tempLog.max > -15);
        } else {
          expect(s.tempLog.excursion).toBe(s.tempLog.max > 8);
        }
      }
    }
  });

  it("leaves at least one cold consignment sound, so quarantine stays a decision", () => {
    for (let i = 0; i < 40; i += 1) {
      const cold = shift(`seed-${i}`).shipments.filter((s) => s.tempLog);
      if (cold.length < 2) continue;
      expect(cold.some((s) => !s.tempLog!.excursion)).toBe(true);
    }
  });
});

describe("it does not hand the same shift back", () => {
  it("gives the same seed the same shift, so a result can be reproduced", () => {
    expect(shift("same")).toEqual(shift("same"));
  });

  it("gives different seeds different shifts", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) seen.add(JSON.stringify(shift(`seed-${i}`)));
    expect(seen.size).toBe(60);
  });

  /** The defect being fixed: eight fixed cases, two per difficulty bucket. */
  it("does not repeat a delivery within a long run of play", () => {
    const deliveries = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      deliveries.add(shift(`play-${i}`).shipments.map((s) => `${s.drug}:${s.batch}`).sort().join("|"));
    }
    expect(deliveries.size).toBe(200);
  });
});

describe("difficulty reaches the content", () => {
  it("gives Expert more to get through than Trainee", () => {
    const easy = shift("ladder", "easy");
    const hard = shift("ladder", "hard");
    expect(hard.shipments.length).toBeGreaterThan(easy.shipments.length);
    expect(hard.reconciliation.length).toBeGreaterThan(easy.reconciliation.length);
    expect(hard.dispatch.length).toBeGreaterThanOrEqual(easy.dispatch.length);
  });

  it("never gets lighter as you climb", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      const sizes = LEVELS.map((l) => shift(seed, l).shipments.length);
      expect(sizes[1]).toBeGreaterThanOrEqual(sizes[0]);
      expect(sizes[2]).toBeGreaterThanOrEqual(sizes[1]);
    }
  });
});

describe("describeShift", () => {
  it("names the shift after what actually arrived", () => {
    for (let i = 0; i < 40; i += 1) {
      const s = shift(`seed-${i}`);
      const { title, explanation } = describeShift(s);
      expect(title.length).toBeGreaterThan(8);
      expect(explanation).toContain(String(s.shipments.length));
      const excursions = s.shipments.filter((x) => x.tempLog?.excursion).length;
      if (excursions >= 2) expect(title.toLowerCase()).toContain("cold-chain heavy");
    }
  });

  it("does not claim a controlled line on a shift that has none", () => {
    for (let i = 0; i < 40; i += 1) {
      const s = shift(`seed-${i}`);
      if (s.shipments.some((x) => x.controlled)) continue;
      expect(describeShift(s).explanation.toLowerCase()).not.toContain("controlled");
      expect(describeShift(s).title.toLowerCase()).not.toContain("controlled");
    }
  });
});
