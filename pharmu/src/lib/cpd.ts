import { jsPDF } from "jspdf";

export function cpdHoursFromCases(totalCases: number) {
  return Math.floor(totalCases / 10);
}

export const CPD_MILESTONES = [10, 25, 50, 75, 100];

export function nextCpdMilestone(hours: number) {
  return CPD_MILESTONES.find((m) => m > hours) ?? null;
}

export function generateCertificatePdf(opts: {
  fullName: string;
  hours: number;
  issuedAt: Date;
  certId: string;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background border
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(0, 191, 165);
  doc.setLineWidth(3);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);

  // Logo / title
  doc.setTextColor(0, 191, 165);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Pharmulation", w / 2, 110, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("Continuing Professional Development", w / 2, 135, { align: "center" });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text("Certificate of Achievement", w / 2, 210, { align: "center" });

  // Recipient
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("This is to certify that", w / 2, 260, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(0, 191, 165);
  doc.text(opts.fullName, w / 2, 305, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("has successfully earned", w / 2, 340, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(`${opts.hours} CPD Credit Hours`, w / 2, 380, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 220);
  doc.text(
    "through interactive pharmacy training simulations on Pharmulation.",
    w / 2,
    405,
    { align: "center" },
  );

  // Footer
  const dateStr = opts.issuedAt.toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.setFontSize(10);
  doc.text(`Issued: ${dateStr}`, 80, h - 70);
  doc.text(`Certificate ID: ${opts.certId}`, 80, h - 54);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 191, 165);
  doc.text("✓ Verified by Pharmulation", w - 80, h - 60, { align: "right" });

  return doc;
}
