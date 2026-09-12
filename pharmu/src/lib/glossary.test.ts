import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { GLOSSARY, expanded, glossaryAlphabetical, lookup, tooltip } from "./glossary";

describe("lookup", () => {
  it("finds a term however it was typed", () => {
    expect(lookup("fefo")?.full).toBe("First Expired, First Out");
    expect(lookup(" GRN ")?.full).toBe("Goods Received Note");
  });

  it("returns nothing rather than guessing", () => {
    expect(lookup("ZZZ")).toBeNull();
    expect(lookup("")).toBeNull();
  });
});

describe("the entries themselves", () => {
  it("lists each short form once", () => {
    const terms = GLOSSARY.map((e) => e.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });

  /**
   * The jury's objection was that the screens assume knowledge. An expansion
   * that only spells out the letters does not fix that - knowing GRN stands
   * for Goods Received Note does not tell you what one is for - so every entry
   * carries a sentence as well.
   */
  it("explains what the thing is for, not just what the letters are", () => {
    for (const entry of GLOSSARY) {
      expect(entry.full.length).toBeGreaterThan(entry.term.length);
      expect(entry.plain.length).toBeGreaterThan(35);
      expect(entry.plain).toMatch(/\.$/);
    }
  });

  it("does not explain a term using the term", () => {
    for (const entry of GLOSSARY) {
      // "GRN is the GRN you write" would be no help to anybody.
      const bare = new RegExp(`\b${entry.term}\b`, "i");
      if (entry.term === "FEFO") continue; // FIFO's entry contrasts the two on purpose.
      expect(bare.test(entry.plain)).toBe(false);
    }
  });

  it("writes plainly, without leaning on other short forms", () => {
    const others = GLOSSARY.map((e) => e.term).filter((t) => !["FEFO", "FIFO"].includes(t));
    for (const entry of GLOSSARY) {
      for (const other of others) {
        if (other === entry.term) continue;
        expect(new RegExp(`\b${other}\b`).test(entry.plain)).toBe(false);
      }
    }
  });
});

describe("rendering helpers", () => {
  it("expands to the words with the short form kept", () => {
    expect(expanded(lookup("DC")!)).toBe("Delivery Challan (DC)");
  });

  it("puts both halves in the tooltip", () => {
    const text = tooltip(lookup("GRN")!);
    expect(text).toContain("Goods Received Note");
    expect(text).toContain("what actually arrived");
  });

  it("sorts the glossary for somebody scanning it", () => {
    const terms = glossaryAlphabetical().map((e) => e.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
  });
});

/**
 * The objection came from screens, so the guard belongs against the screens:
 * a short form the interface shows and the glossary has never heard of is
 * exactly the gap that was reported.
 */
describe("against the interface", () => {
  const SHOWN = ["FEFO", "GRN", "BMR", "CAPA", "GMP", "QC", "GTIN", "OTC", "CPD", "API", "RH", "SOP", "MRP", "SPC"];

  it("covers every short form the screens actually use", () => {
    for (const term of SHOWN) expect(lookup(term), `${term} is on screen but not in the glossary`).not.toBeNull();
  });
});
