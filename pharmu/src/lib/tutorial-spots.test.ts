import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCENES, SPOTS, guideSteps, newHereSteps, sceneSeenKey, scenesCovered, scenesToIntroduce,
  screenSteps, spotStep,
} from "./tutorial-spots";
import { GUIDES } from "./tutorial";

/** Every component and route, read as text - the only way to check an attribute is really on the page. */
function sourceFiles(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const dir of ["src/routes", "src/components"]) {
    for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
      if (!entry.endsWith(".tsx")) continue;
      const path = join(dir, entry);
      out.push({ path, text: readFileSync(path, "utf8") });
    }
  }
  return out;
}

const files = sourceFiles();
const all = files.map((f) => f.text).join("\n");
const attributeValues = (name: string) =>
  [...all.matchAll(new RegExp(`${name}="([a-z0-9-]+)"`, "g"))].map((m) => m[1]);

describe("spots and the page agree", () => {
  it("has words for every element marked on a page", () => {
    const missing = [...new Set(attributeValues("data-tour"))].filter((id) => !SPOTS[id]);
    expect(missing).toEqual([]);
  });

  // A spot with no element is a stop the tour can never make. The id has to
  // appear as a quoted string in a component - literally on the attribute, or
  // in a list the attribute is filled from, as the navigation does.
  it("marks an element for every spot it has words for", () => {
    const unused = Object.keys(SPOTS).filter((id) => !all.includes(`"${id}"`));
    expect(unused).toEqual([]);
  });

  it("names every screen that is marked", () => {
    const missing = [...new Set(attributeValues("data-tour-scene"))].filter((id) => !SCENES[id]);
    expect(missing).toEqual([]);
  });

  it("marks every screen it names", () => {
    const unused = Object.keys(SCENES).filter((id) => !all.includes(`data-tour-scene="${id}"`));
    expect(unused).toEqual([]);
  });

  it("only sends a guide step to a spot that exists", () => {
    for (const guide of Object.values(GUIDES)) {
      for (const step of guide.steps) {
        if (step.target) expect(SPOTS[step.target], `${guide.key}: ${step.title}`).toBeDefined();
      }
    }
  });
});

describe("what the spots say", () => {
  it("says something real at every stop", () => {
    for (const [id, spot] of Object.entries(SPOTS)) {
      expect(spot.title.length, id).toBeGreaterThan(3);
      expect(spot.body.length, id).toBeGreaterThan(40);
      // Short enough to read in a bubble without scrolling it.
      expect(spot.body.length, id).toBeLessThan(220);
    }
  });

  // The cases carry doses and ranges a pharmacist has checked. A number in
  // the guide would be one nobody checked.
  it("carries no doses, strengths or storage figures", () => {
    const text = JSON.stringify(SPOTS);
    expect(text).not.toMatch(/\d+\s?(mg|mcg|ml|g|°c|deg|%)\b/i);
  });

  it("promises nothing that was taken out of the product", () => {
    const text = JSON.stringify(SPOTS).toLowerCase();
    for (const gone of ["emergency mode", "cosmetic", "oncology"]) expect(text).not.toContain(gone);
  });
});

describe("screenSteps", () => {
  it("keeps page order and moves the navigation and case bar to the end", () => {
    const steps = screenSteps([
      { id: "case-timer", scene: "case-header" },
      { id: "wh-manifests", scene: "wh-receiving" },
      { id: "nav-modes", scene: null },
      { id: "wh-zones", scene: "wh-receiving" },
    ]);
    expect(steps.map((s) => s.target)).toEqual(["wh-manifests", "wh-zones", "case-timer", "nav-modes"]);
  });

  it("drops duplicates and anything it has no words for", () => {
    const steps = screenSteps([
      { id: "lens-entry", scene: "dashboard" },
      { id: "lens-entry", scene: "dashboard" },
      { id: "not-a-spot", scene: "dashboard" },
    ]);
    expect(steps).toHaveLength(1);
  });

  it("labels each stop with the screen it belongs to", () => {
    expect(screenSteps([{ id: "wh-fefo", scene: "wh-dispatch" }])[0].eyebrow).toBe("Dispatch");
  });
});

describe("spotStep", () => {
  it("explains one control on its own", () => {
    expect(spotStep({ id: "industry-temp-slider", scene: "industry-room-controls" })?.title).toBe("Set the temperature");
  });

  it("is null for something it cannot explain", () => {
    expect(spotStep({ id: "nope", scene: null })).toBeNull();
  });
});

describe("scenesToIntroduce", () => {
  const seenOnly = (keys: string[]) => (key: string) => keys.includes(key);

  it("introduces screens not seen before, once each, in page order", () => {
    expect(scenesToIntroduce(["case-header", "industry-env", "case-header"], seenOnly([])))
      .toEqual(["case-header", "industry-env"]);
  });

  it("skips a screen already introduced", () => {
    expect(scenesToIntroduce(["case-header", "industry-env"], seenOnly([sceneSeenKey("case-header")])))
      .toEqual(["industry-env"]);
  });

  // The first-run tour walks the dashboard already.
  it("does not walk the dashboard again for somebody who had the tour", () => {
    expect(scenesToIntroduce(["dashboard"], seenOnly(["tour"]))).toEqual([]);
  });

  it("ignores a scene name it does not know", () => {
    expect(scenesToIntroduce(["made-up"], seenOnly([]))).toEqual([]);
  });
});

describe("newHereSteps", () => {
  const found = [
    { id: "case-timer", scene: "case-header" },
    { id: "case-pause", scene: "case-header" },
    { id: "industry-formula", scene: "industry-record" },
    { id: "industry-ack", scene: "industry-record" },
  ];

  it("opens with the mode's overview, then flies to each new screen's controls", () => {
    const steps = newHereSteps(GUIDES.industry, found, ["case-header", "industry-record"]);
    expect(steps[0].target).toBeNull();
    expect(steps[0].list).toEqual(GUIDES.industry.steps.map((s) => s.title));
    expect(steps.slice(1).map((s) => s.target)).toEqual(["case-timer", "case-pause", "industry-formula", "industry-ack"]);
  });

  it("introduces only the screens it was asked to", () => {
    const steps = newHereSteps(null, found, ["industry-record"]);
    expect(steps.map((s) => s.target)).toEqual(["industry-formula", "industry-ack"]);
  });

  it("records which screens it covered", () => {
    expect(scenesCovered(newHereSteps(GUIDES.industry, found, ["case-header", "industry-record"])))
      .toEqual(["case-header", "industry-record"]);
  });
});

describe("guideSteps", () => {
  it("walks a guide in order, keeping each step's action", () => {
    const steps = guideSteps(GUIDES.warehousing);
    expect(steps).toHaveLength(GUIDES.warehousing.steps.length);
    expect(steps[1].action).toBe(GUIDES.warehousing.steps[1].action);
  });
});
