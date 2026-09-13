import { describe, expect, it } from "vitest";
import { generateCompetencePdf } from "./competence-pdf";
import { buildCompetenceRecord, type ScoreRow } from "./competence";

const at = (d: number) => `2026-09-${String(d).padStart(2, "0")}T10:00:00Z`;
const rows: ScoreRow[] = [
  { mode: "rx", accuracy: 0.5, completed_at: at(1), errors_detail: [{ errorType: "Wrong storage zone" }] },
  { mode: "rx", accuracy: 0.6, completed_at: at(2), errors_detail: [] },
  { mode: "warehousing", accuracy: 0.9, completed_at: at(3), errors_detail: [{ errorType: "FEFO violated" }] },
  { mode: "warehousing", accuracy: 0.95, completed_at: at(4), errors_detail: [] },
];

async function header(blob: Blob) {
  return Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString("latin1");
}

describe("the document actually renders", () => {
  it("produces a real PDF", async () => {
    const blob = await generateCompetencePdf({
      learnerName: "Ayesha Malik",
      learnerEmail: "a@example.com",
      record: buildCompetenceRecord(rows),
      issuedAt: new Date("2026-09-13T00:00:00Z"),
    });
    expect(blob.size).toBeGreaterThan(1200);
    expect(await header(blob)).toBe("%PDF-");
  });

  // A learner with nothing recorded still has to get a document rather than a
  // crash, because the button is there before the first case is played.
  it("renders for somebody with no history at all", async () => {
    const blob = await generateCompetencePdf({
      learnerName: "New Starter",
      record: buildCompetenceRecord([]),
      issuedAt: new Date("2026-09-13T00:00:00Z"),
    });
    expect(await header(blob)).toBe("%PDF-");
  });

  it("renders for a learner with a very long error history", async () => {
    const many: ScoreRow[] = Array.from({ length: 120 }, (_, i) => ({
      mode: i % 2 ? "rx" : "hospital",
      accuracy: 0.5 + (i % 40) / 100,
      completed_at: `2026-0${1 + (i % 8)}-${String(1 + (i % 27)).padStart(2, "0")}T10:00:00Z`,
      errors_detail: [{ errorType: `Error type number ${i % 25}` }],
    }));
    const blob = await generateCompetencePdf({
      learnerName: "Prolific Learner",
      record: buildCompetenceRecord(many),
      issuedAt: new Date("2026-09-13T00:00:00Z"),
    });
    expect(await header(blob)).toBe("%PDF-");
    // Twenty-five error types cannot fit on one page; a record that silently
    // dropped the tail would be worse than one that runs long.
    expect(blob.size).toBeGreaterThan(3000);
  });

  it("survives a name that is punctuation and an empty mode", async () => {
    const blob = await generateCompetencePdf({
      learnerName: "###",
      record: buildCompetenceRecord([{ mode: null, accuracy: 0.5, completed_at: at(1) }]),
    });
    expect(await header(blob)).toBe("%PDF-");
  });
});
