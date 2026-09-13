import { describe, expect, it } from "vitest";
import { competenceFileName } from "./competence-pdf";

describe("competenceFileName", () => {
  it("names the file so a reviewer can file it without renaming", () => {
    expect(competenceFileName("Ayesha Malik", new Date("2026-09-13T00:00:00Z")))
      .toBe("practice-evidence-ayesha-malik-2026-09-13.pdf");
  });

  it("survives a name with punctuation or non-latin characters", () => {
    const name = competenceFileName("Dr. Wasiq / Ahmed", new Date("2026-09-13T00:00:00Z"));
    expect(name).toBe("practice-evidence-dr-wasiq-ahmed-2026-09-13.pdf");
    expect(name).not.toMatch(/[/\:*?"<>|]/);
  });

  it("falls back rather than producing a nameless file", () => {
    expect(competenceFileName("   ", new Date("2026-09-13T00:00:00Z")))
      .toBe("practice-evidence-learner-2026-09-13.pdf");
    expect(competenceFileName("###", new Date("2026-09-13T00:00:00Z")))
      .toBe("practice-evidence-learner-2026-09-13.pdf");
  });
});
