import { describe, expect, it } from "vitest";
import { buildQuiz, flashcardFacts, hasStudyContent, type StudyDrug } from "./drug-study";
import { prepareDrugCatalog } from "./drug-catalog";

const catalogue = prepareDrugCatalog([]) as StudyDrug[];

describe("buildQuiz", () => {
  it("generates the requested number of questions from the catalogue", () => {
    const questions = buildQuiz(catalogue.slice(0, 40), catalogue, 10);
    expect(questions).toHaveLength(10);
  });

  it("still generates a full quiz from a small study list", () => {
    // The old builder produced one question per drug, so a four-drug study list
    // gave a four-question quiz however many were asked for.
    const questions = buildQuiz(catalogue.slice(0, 4), catalogue, 10);
    expect(questions.length).toBeGreaterThan(4);
  });

  it("mixes question types rather than repeating one", () => {
    const kinds = new Set(buildQuiz(catalogue.slice(0, 40), catalogue, 12).map((q) => q.kind));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("always includes the correct answer among the options", () => {
    for (const q of buildQuiz(catalogue.slice(0, 40), catalogue, 15)) {
      expect(q.options).toContain(q.correct);
    }
  });

  it("offers four distinct options, so nothing is answerable by elimination", () => {
    for (const q of buildQuiz(catalogue.slice(0, 40), catalogue, 15)) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it("never asks the same question twice in one quiz", () => {
    const ids = buildQuiz(catalogue.slice(0, 40), catalogue, 20).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("explains every answer, so a wrong one still teaches", () => {
    for (const q of buildQuiz(catalogue.slice(0, 30), catalogue, 10)) {
      expect(q.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("returns nothing rather than throwing when there is no material", () => {
    expect(buildQuiz([], [], 10)).toEqual([]);
    expect(buildQuiz([{ id: "x", name: "Lone drug" }], [], 5)).toEqual([]);
  });
});

describe("flashcardFacts", () => {
  it("lists only fields that have content", () => {
    const facts = flashcardFacts({
      id: "a", name: "Test", drug_class: "NSAID",
      indications: ["Pain"], side_effects: [], dosage: null,
    });
    expect(facts.map((f) => f.label)).toEqual(["Class", "Indications"]);
  });

  it("gives real catalogue drugs something to show", () => {
    const withFacts = catalogue.filter((d) => flashcardFacts(d).length > 0);
    expect(withFacts.length).toBeGreaterThan(catalogue.length / 2);
  });
});

describe("question validity", () => {
  const cat = catalogue.slice(0, 80);

  // Same-class distractors used to share the target's indication, so several
  // options were correct. Each question must have exactly one right answer.
  it("never offers a distractor that is also correct", () => {
    for (const q of buildQuiz(cat, catalogue, 25)) {
      const target = catalogue.find((d) => d.name === q.correct || d.drug_class === q.correct);
      if (!target) continue;

      if (q.kind === "indication") {
        const wanted = q.question.replace(/^Which medicine is indicated for /, "").replace(/\?$/, "");
        for (const option of q.options) {
          if (option === q.correct) continue;
          const other = catalogue.find((d) => d.name === option);
          const alsoTreats = (other?.indications ?? []).some(
            (i) => String(i).toLowerCase() === wanted.toLowerCase(),
          );
          expect(alsoTreats, `"${option}" is also indicated for ${wanted}`).toBe(false);
        }
      }
    }
  });
});

describe("hasStudyContent", () => {
  // The book-derived drugs were seeded with a class and brand but no clinical
  // detail, so the Study list showed cards reading "Indications: —".
  it("rejects a drug carrying nothing but a name", () => {
    expect(hasStudyContent({ id: "x", name: "Unreviewed drug" })).toBe(false);
    expect(hasStudyContent({
      id: "y", name: "Unreviewed drug",
      indications: [], side_effects: [], contraindications: [], dosage: null,
    })).toBe(false);
  });

  it("accepts a drug with even one usable fact", () => {
    expect(hasStudyContent({ id: "z", name: "Atenolol", drug_class: "Beta-blocker" })).toBe(true);
  });

  it("keeps the great majority of the catalogue as study material", () => {
    const usable = catalogue.filter(hasStudyContent);
    expect(usable.length).toBeGreaterThan(catalogue.length * 0.8);
  });
});
