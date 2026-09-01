import { describe, expect, it } from "vitest";
import { buildBooklet, qcGuide, stageGuide, type BookletInput } from "./batch-booklet";

const input: BookletInput = {
  product: "Film-coated tablet",
  batchSize: "20,000 tablets",
  batchNumber: "B482913",
  ingredients: [
    { name: "Ibuprofen", role: "Active", target: 4000, min: 3920, max: 4080, unit: "g" },
    { name: "Magnesium stearate", role: "Lubricant", target: 400, min: 380, max: 420, unit: "g" },
  ],
  env: { tempRange: [20, 25], humidityRange: [35, 55] },
  stages: [
    { key: "mixing", label: "blend" },
    { key: "compression", label: "compression" },
    { key: "packaging", label: "blister packing" },
  ],
  qc: [{ test: "Average weight" }, { test: "Friability" }, { test: "Content uniformity" }],
};

describe("buildBooklet", () => {
  it("covers formula, environment, preparation, QC and release", () => {
    expect(buildBooklet(input).map((s) => s.key))
      .toEqual(["formula", "environment", "preparation", "qc", "release"]);
  });

  it("states each ingredient's target and its acceptable range", () => {
    const formula = buildBooklet(input)[0];
    const api = formula.entries.find((e) => e.term === "Ibuprofen")!;
    expect(api.detail).toContain("4000 g");
    expect(api.note).toContain("3920-4080 g");
  });

  it("explains the stages by the label this product gives them", () => {
    const prep = buildBooklet(input).find((s) => s.key === "preparation")!;
    expect(prep.entries.map((e) => e.term)).toEqual(["blend", "compression", "blister packing"]);
  });

  it("explains every QC test on the batch", () => {
    const qc = buildBooklet(input).find((s) => s.key === "qc")!;
    expect(qc.entries).toHaveLength(input.qc.length);
    for (const entry of qc.entries) expect(entry.note?.trim()).toBeTruthy();
  });

  // The record is a reference, not an answer key. If it named the correct
  // option for this batch, the process and QC steps would become a lookup.
  it("never names a correct answer for the batch", () => {
    const text = JSON.stringify(buildBooklet(input)).toLowerCase();
    for (const giveaway of ["shouldpass", "correct answer", "the answer is", "select option"]) {
      expect(text).not.toContain(giveaway);
    }
  });

  it("omits a section rather than printing an empty one", () => {
    const bare = buildBooklet({ ...input, stages: [{ key: "unknown", label: "unknown" }], qc: [{ test: "Nonexistent test" }] });
    expect(bare.map((s) => s.key)).not.toContain("preparation");
    expect(bare.map((s) => s.key)).not.toContain("qc");
  });
});

describe("guides", () => {
  it("knows the stages the formulas actually use", () => {
    for (const label of [
      "blend", "solution mixing", "granulation", "homogenization", "dissolution",
      "drying", "heat hold", "compression", "capsule filling", "filtration",
      "viscosity set", "coating", "flavoring", "microbial hold",
      "blister packing", "bottle filling", "bottle packing",
    ]) {
      expect(stageGuide(label), label).not.toBeNull();
    }
  });

  it("knows every QC test the formulas actually run", () => {
    for (const test of [
      "Appearance", "Assay", "Average weight", "Blend uniformity", "Content uniformity",
      "Fill volume", "Fill weight variation", "Friability", "Microbial limit",
      "Net content", "Viscosity", "pH",
    ]) {
      expect(qcGuide(test), test).not.toBeNull();
    }
  });

  it("returns nothing for something it has no entry for", () => {
    expect(stageGuide("teleportation")).toBeNull();
    expect(qcGuide("vibes check")).toBeNull();
  });
});
