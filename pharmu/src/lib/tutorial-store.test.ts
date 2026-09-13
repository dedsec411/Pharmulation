import { beforeEach, describe, expect, it } from "vitest";
import { guideLocked, pausesClock, useTutorialStore } from "./tutorial-store";

describe("pausesClock", () => {
  it("stops the case clock while the guide is covering the page", () => {
    expect(pausesClock("touring")).toBe(true);
    expect(pausesClock("picking")).toBe(true);
    expect(pausesClock("library")).toBe(true);
  });

  // A menu left open would otherwise be a free pause.
  it("does not stop it for the menu, or while he waits in the corner", () => {
    expect(pausesClock("menu")).toBe(false);
    expect(pausesClock("docked")).toBe(false);
  });
});

describe("guideLocked", () => {
  it("stays out of a graded sitting", () => {
    expect(guideLocked({ pathname: "/game/industry", sitting: true })).toBe(true);
  });

  it("stays out of a live session, on both sides of it", () => {
    expect(guideLocked({ pathname: "/live", sitting: false })).toBe(true);
    expect(guideLocked({ pathname: "/educator/live", sitting: false })).toBe(true);
  });

  it("is there everywhere else", () => {
    for (const pathname of ["/dashboard", "/game/warehousing", "/educator/dashboard", "/settings"]) {
      expect(guideLocked({ pathname, sitting: false })).toBe(false);
    }
  });
});

describe("the guide's state", () => {
  beforeEach(() => {
    const s = useTutorialStore.getState();
    s.dock();
    s.hold(false);
    s.setChatOpen(false);
  });

  it("restarts a tour that is asked for twice", () => {
    useTutorialStore.getState().startTour({ kind: "screen" });
    const first = useTutorialStore.getState().requestId;
    useTutorialStore.getState().startTour({ kind: "screen" });
    expect(useTutorialStore.getState().requestId).toBe(first + 1);
  });

  it("lets a promised introduction through when it starts", () => {
    useTutorialStore.getState().hold(true);
    useTutorialStore.getState().startTour({ kind: "new", guideKey: "industry" });
    expect(useTutorialStore.getState().holding).toBe(false);
    expect(useTutorialStore.getState().activity).toBe("touring");
  });

  it("goes back to the corner when the chat opens", () => {
    useTutorialStore.getState().openMenu();
    useTutorialStore.getState().setChatOpen(true);
    expect(useTutorialStore.getState().activity).toBe("docked");
    expect(useTutorialStore.getState().chatOpen).toBe(true);
  });
});
