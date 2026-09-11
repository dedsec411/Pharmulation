import { describe, expect, it } from "vitest";
import {
  licenceValid, canTrade, canHandleControlled, weeksUntilExpiry, renewalDue,
  reconcileRegister, inspect,
  type Licence, type ComplianceStock, type RegisterLine,
} from "./compliance";
import { RUPEE } from "./economics";

const sale = (over: Partial<Licence> = {}): Licence => ({
  kind: "drug_sale", status: "active", issuedPeriod: 1, expiresPeriod: 50, ...over,
});
const narcotics = (over: Partial<Licence> = {}): Licence => ({
  kind: "narcotics", status: "active", issuedPeriod: 1, expiresPeriod: 50, ...over,
});

const item = (over: Partial<ComplianceStock> = {}): ComplianceStock => ({
  drugId: "d1", batchNo: "B1", qty: 10, expiresPeriod: 99,
  location: "ambient", requiredZone: "ambient", controlled: false, ...over,
});

function inspection(over: Partial<Parameters<typeof inspect>[0]> = {}) {
  return inspect({
    period: 10,
    licences: [sale()],
    stock: [],
    register: [],
    temperatureLogKept: true,
    cdRegisterKept: true,
    ...over,
  });
}

describe("licences", () => {
  // Valid up to and including the week it expires.
  it("lasts through its final week and not past it", () => {
    expect(licenceValid(sale({ expiresPeriod: 10 }), 10)).toBe(true);
    expect(licenceValid(sale({ expiresPeriod: 10 }), 11)).toBe(false);
  });

  it("is worthless before the week it takes effect, and after a refusal", () => {
    expect(licenceValid(undefined, 1)).toBe(false);
    expect(licenceValid(sale({ status: "pending", issuedPeriod: 5 }), 1)).toBe(false);
    expect(licenceValid(sale({ status: "refused" }), 1)).toBe(false);
  });

  // A learner told the permit arrives in week four, who reaches week four and
  // finds it still pending, has been lied to by a field nobody got round to
  // rewriting. The dates decide, not the label.
  it("counts from the week it was granted, whatever the paperwork still says", () => {
    expect(licenceValid(narcotics({ status: "pending", issuedPeriod: 4 }), 4)).toBe(true);
    expect(licenceValid(narcotics({ status: "pending", issuedPeriod: 4 }), 3)).toBe(false);
  });

  // Controlled medicines need the permit on top of the sale licence, not
  // instead of it.
  it("needs both licences before a controlled medicine may be handled", () => {
    expect(canHandleControlled([sale(), narcotics()], 10)).toBe(true);
    expect(canHandleControlled([sale()], 10)).toBe(false);
    expect(canHandleControlled([narcotics()], 10)).toBe(false);
    expect(canTrade([sale()], 10)).toBe(true);
  });

  // Renewal costs time and money. A learner who finds out the week it lapses
  // has already lost the argument.
  it("warns before a licence lapses, not after", () => {
    const due = renewalDue([sale({ expiresPeriod: 12 }), narcotics({ expiresPeriod: 40 })], 10, 4);
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("drug_sale");
    expect(weeksUntilExpiry(sale({ expiresPeriod: 12 }), 10)).toBe(2);
    expect(weeksUntilExpiry(sale({ expiresPeriod: 8 }), 10)).toBe(-2);
  });
});

describe("the controlled drugs register", () => {
  const line = (over: Partial<RegisterLine> = {}): RegisterLine => ({
    drugId: "morph", name: "Morphine 10mg", expected: 20, counted: 20, ...over,
  });

  it("passes only when it reconciles exactly", () => {
    expect(reconcileRegister([line()])).toEqual([]);
  });

  // A missing ampoule of morphine is a criminal matter, not a stock variance.
  it("treats a shortfall as critical", () => {
    const [finding] = reconcileRegister([line({ counted: 18 })]);
    expect(finding.code).toBe("cd-shortfall");
    expect(finding.severity).toBe("critical");
    expect(finding.detail).toContain("2 unaccounted for");
  });

  it("treats a surplus as serious but not criminal", () => {
    const [finding] = reconcileRegister([line({ counted: 22 })]);
    expect(finding.code).toBe("cd-surplus");
    expect(finding.severity).toBe("major");
  });

  it("has no tolerance band at all", () => {
    expect(reconcileRegister([line({ counted: 19 })])).toHaveLength(1);
  });
});

describe("the inspection", () => {
  it("passes a pharmacy with nothing wrong", () => {
    const result = inspection();
    expect(result.passed).toBe(true);
    expect(result.totalFine).toBe(0);
    expect(result.suspended).toBe(false);
  });

  // Trading unlicensed stops the pharmacy rather than fining it.
  it("suspends a pharmacy trading on an expired licence", () => {
    const result = inspection({ licences: [sale({ expiresPeriod: 4 })] });
    expect(result.findings[0].code).toBe("no-licence");
    expect(result.findings[0].severity).toBe("critical");
    expect(result.suspended).toBe(true);
  });

  it("suspends a pharmacy holding controlled stock with no permit", () => {
    const result = inspection({
      stock: [item({ controlled: true, requiredZone: "cd-safe", location: "cd-safe" })],
    });
    expect(result.findings.some((f) => f.code === "controlled-no-permit")).toBe(true);
    expect(result.suspended).toBe(true);
  });

  it("writes up controlled medicines left outside the safe", () => {
    const result = inspection({
      licences: [sale(), narcotics()],
      stock: [item({ batchNo: "CD1", controlled: true, requiredZone: "cd-safe", location: "ambient" })],
    });
    const finding = result.findings.find((f) => f.code === "cd-not-secured");
    expect(finding?.severity).toBe("critical");
    expect(finding?.detail).toContain("CD1");
  });

  // A vaccine kept warm is not a filing error.
  it("writes up a broken cold chain", () => {
    const result = inspection({
      stock: [item({ batchNo: "VAX", requiredZone: "cold-chain", location: "ambient" })],
    });
    expect(result.findings.some((f) => f.code === "cold-chain-broken")).toBe(true);
  });

  // Quarantine is where stock goes to be dealt with. Finding it there is the
  // system working, not a breach.
  it("does not write up cold chain sitting in quarantine", () => {
    const result = inspection({
      stock: [item({ requiredZone: "cold-chain", location: "quarantine" })],
    });
    expect(result.findings.some((f) => f.code === "cold-chain-broken")).toBe(false);
  });

  it("writes up expired stock left where it could be sold", () => {
    const result = inspection({
      period: 10,
      stock: [item({ batchNo: "OLD", expiresPeriod: 9 })],
    });
    expect(result.findings.some((f) => f.code === "expired-on-shelf")).toBe(true);
  });

  it("accepts expired stock that has been separated", () => {
    const result = inspection({
      period: 10,
      stock: [item({ expiresPeriod: 9, location: "quarantine" })],
    });
    expect(result.findings.some((f) => f.code === "expired-on-shelf")).toBe(false);
  });

  // An empty book against an empty safe is not a pass. It is a pharmacy that
  // has been handling controlled medicines with no record of any of it.
  it("writes up controlled stock held with no register at all", () => {
    const result = inspection({
      licences: [sale(), narcotics()],
      stock: [item({ controlled: true, requiredZone: "cd-safe", location: "cd-safe" })],
      cdRegisterKept: false,
    });
    const finding = result.findings.find((f) => f.code === "no-cd-register");
    expect(finding?.severity).toBe("critical");
  });

  it("asks for no register from a pharmacy holding nothing controlled", () => {
    const result = inspection({ cdRegisterKept: false });
    expect(result.findings.some((f) => f.code === "no-cd-register")).toBe(false);
    expect(result.passed).toBe(true);
  });

  it("notes a missing temperature log without closing anyone down", () => {
    const result = inspection({ temperatureLogKept: false });
    const finding = result.findings.find((f) => f.code === "no-temperature-log");
    expect(finding?.severity).toBe("minor");
    expect(result.suspended).toBe(false);
  });

  it("reports the worst finding first and totals the fines", () => {
    const result = inspection({
      licences: [sale({ expiresPeriod: 1 })],
      temperatureLogKept: false,
      period: 10,
    });
    expect(result.findings[0].severity).toBe("critical");
    expect(result.totalFine).toBe(110_000 * RUPEE);
  });
});
