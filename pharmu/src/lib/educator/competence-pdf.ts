import { MODE_LABEL, type Mode } from "@/lib/game/shared";
import { outstandingErrors, summariseTrend, type CompetenceRecord } from "./competence";

/**
 * The evidence record as a document somebody can sign.
 *
 * Printed on white rather than in the product's colours: this leaves the app
 * and goes into a portfolio, gets photocopied, and is read next to other
 * paperwork. The existing CPD certificate is a dark decorative thing because
 * it is a keepsake; this one is a form.
 *
 * The signature block is the point of the whole feature. The document reports
 * what a learner did and stops there - the judgement about what it means is
 * made by the person who signs, and the wording says so rather than implying
 * the software has decided anything.
 */

export type CompetenceDocument = {
  learnerName: string;
  learnerEmail?: string | null;
  record: CompetenceRecord;
  /** Who asked for it - a lecturer downloading for a student, or the student. */
  issuedFor?: string | null;
  issuedAt?: Date;
};

const NAVY: [number, number, number] = [17, 34, 51];
const GREY: [number, number, number] = [90, 105, 120];
const RULE: [number, number, number] = [200, 210, 220];

const longDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const modeLabel = (mode: string) => MODE_LABEL[mode as Mode] ?? mode;

export async function generateCompetencePdf(doc0: CompetenceDocument): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 52;
  const issuedAt = doc0.issuedAt ?? new Date();
  const { record } = doc0;
  let y = M;

  const heading = (text: string) => {
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(text.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.7);
    doc.line(M, y, W - M, y);
    y += 16;
  };
  const body = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...NAVY);
    for (const line of doc.splitTextToSize(text, W - M * 2)) {
      // A record that silently loses its last error because the page ran out
      // would be worse than one that runs to two pages.
      if (y > H - 90) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += 14;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text("Practice evidence record", M, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text("Pharmulation simulated pharmacy practice", M, y);
  y += 24;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(1.2);
  doc.line(M, y, W - M, y);
  y += 6;

  heading("Learner");
  body(doc0.learnerName);
  if (doc0.learnerEmail) body(doc0.learnerEmail);
  body(record.from && record.to
    ? `Period covered: ${longDate(record.from)} to ${longDate(record.to)}`
    : "Period covered: no completed cases");
  body(`Record produced: ${longDate(issuedAt)}${doc0.issuedFor ? ` for ${doc0.issuedFor}` : ""}`);

  heading("Summary");
  body(summariseTrend(record));
  if (record.accuracy !== null) {
    body(`Overall accuracy across all recorded decisions: ${record.accuracy}%.`);
  }
  body(`Errors recorded: ${record.totalErrors}.`);

  if (record.byMode.length) {
    heading("Practice by area");
    for (const m of record.byMode) {
      body(`${modeLabel(m.mode)} - ${m.cases} case${m.cases === 1 ? "" : "s"}`
        + (m.accuracy === null ? "" : `, ${m.accuracy}% accuracy`));
    }
  }

  if (record.errors.length) {
    heading("Errors recorded");
    for (const e of record.errors) {
      const state = e.resolved ? "not recurred in the later part of the period" : "still occurring";
      body(`${e.errorType} - ${e.count} occurrence${e.count === 1 ? "" : "s"}`
        + `${e.lastSeen ? `, last on ${longDate(e.lastSeen)}` : ""} (${state})`);
    }
  }

  const outstanding = outstandingErrors(record);
  heading("For discussion at review");
  if (!record.casesCompleted) {
    body("No completed cases in this period.");
  } else if (!outstanding.length) {
    body("No error type recurred in the later part of the period on record.");
  } else {
    for (const e of outstanding) body(`- ${e.errorType} (${e.count} occurrence${e.count === 1 ? "" : "s"})`);
  }

  heading("What this document is");
  body(
    "This is a record of activity in a simulator. It reports what this learner did and what "
    + "they got wrong; it does not assess competence and does not certify it. Simulated practice "
    + "is not a substitute for supervised practice. Any judgement about competence is made by the "
    + "reviewer signing below, on the basis of this record and their own observation.",
    9,
  );

  if (y > H - 170) { doc.addPage(); y = M; }
  y = Math.max(y + 20, H - 170);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.7);
  doc.line(M, y, W - M, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("REVIEWED BY", M, y);
  y += 30;

  const half = (W - M * 2 - 24) / 2;
  const field = (label: string, x: number, width: number) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.6);
    doc.line(x, y, x + width, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(label, x, y + 12);
  };
  field("Name and registration number", M, half);
  field("Signature", M + half + 24, half);
  y += 46;
  field("Role / institution", M, half);
  field("Date", M + half + 24, half);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(
    `Generated by Pharmulation on ${issuedAt.toISOString().slice(0, 10)}. `
    + "Figures are computed from this learner's own recorded cases.",
    M, H - 34,
  );

  return doc.output("blob");
}

/** A filename a reviewer can file without renaming. */
export function competenceFileName(learnerName: string, issuedAt = new Date()): string {
  const safe = learnerName.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
  return `practice-evidence-${safe.toLowerCase()}-${issuedAt.toISOString().slice(0, 10)}.pdf`;
}
