import { describe, expect, it } from "vitest";
import {
  AVATAR, EDGE, PERCH, bubbleWidth, dockPoint, hopHeight, placeCallout, scrollDelta,
  spotlightFrame, visiblePart, type Rect, type Size,
} from "./guide-flight";

const DESKTOP: Size = { width: 1280, height: 800 };
const PHONE: Size = { width: 390, height: 844 };

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.left + b.width && b.left < a.left + a.width &&
  a.top < b.top + b.height && b.top < a.top + a.height;

function bubbleRect(viewport: Size, height: number, point: { x: number; y: number }): Rect {
  return { left: point.x, top: point.y, width: bubbleWidth(viewport), height };
}

function avatarRect(point: { x: number; y: number }): Rect {
  return { left: point.x, top: point.y, width: AVATAR, height: AVATAR };
}

describe("placeCallout", () => {
  it("puts the bubble under a nav link at the top of the screen", () => {
    const target = { left: 400, top: 30, width: 80, height: 36 };
    const c = placeCallout({ target, viewport: DESKTOP, bubble: { width: 360, height: 200 } });
    expect(c.side).toBe("below");
    expect(c.bubble.y).toBeGreaterThan(target.top + target.height);
  });

  it("puts it above a button near the bottom of the screen", () => {
    const target = { left: 500, top: 720, width: 160, height: 44 };
    const c = placeCallout({ target, viewport: DESKTOP, bubble: { width: 360, height: 200 } });
    expect(c.side).toBe("above");
    expect(c.bubble.y + 200).toBeLessThan(target.top);
  });

  it("goes beside a tall column rather than over it", () => {
    const target = { left: 16, top: 100, width: 400, height: 680 };
    const c = placeCallout({ target, viewport: DESKTOP, bubble: { width: 360, height: 220 } });
    expect(c.side).toBe("right");
  });

  it("sits over a panel that fills the screen, at the end with more room", () => {
    const high = { left: 0, top: 0, width: 1280, height: 650 };
    expect(placeCallout({ target: high, viewport: DESKTOP, bubble: { width: 360, height: 200 } }).side)
      .toBe("over-bottom");
    const low = { left: 0, top: 150, width: 1280, height: 650 };
    expect(placeCallout({ target: low, viewport: DESKTOP, bubble: { width: 360, height: 200 } }).side)
      .toBe("over-top");
  });

  // The phone case: a stack of cards taller than the screen, scrolled so its
  // top sits under the sticky bar. The bubble used to take the top, where the
  // heading the reader was just brought to is.
  it("keeps the visible top edge of a target taller than the screen clear", () => {
    const tall = { left: 16, top: 82, width: 358, height: 1600 };
    const c = placeCallout({ target: tall, viewport: PHONE, bubble: { width: 358, height: 260 } });
    expect(c.side).toBe("over-bottom");
    expect(c.bubble.y).toBeGreaterThan(PHONE.height / 2);
  });

  it("keeps the visible bottom edge clear when that is the end on screen", () => {
    const tall = { left: 16, top: -900, width: 358, height: 1500 };
    expect(placeCallout({ target: tall, viewport: PHONE, bubble: { width: 358, height: 260 } }).side)
      .toBe("over-top");
  });

  it("centres a step with nothing to point at", () => {
    const c = placeCallout({ target: null, viewport: DESKTOP, bubble: { width: 360, height: 200 } });
    expect(c.side).toBe("centre");
    expect(c.bubble.x).toBeCloseTo((DESKTOP.width - 360) / 2);
  });

  it("treats a target scrolled completely out of view as nothing to point at", () => {
    const gone = { left: 100, top: 2000, width: 200, height: 40 };
    expect(placeCallout({ target: gone, viewport: DESKTOP, bubble: { width: 360, height: 200 } }).side)
      .toBe("centre");
  });

  it("stands the avatar under the middle of what he is pointing at", () => {
    const target = { left: 400, top: 30, width: 80, height: 36 };
    const c = placeCallout({ target, viewport: DESKTOP, bubble: { width: 360, height: 200 } });
    expect(c.avatar.x + AVATAR / 2).toBeCloseTo(440);
  });

  /**
   * The property that matters, checked across the whole screen rather than at
   * a few hand-picked spots: wherever the target is and whatever size the
   * bubble turns out to be, the bubble and the avatar stay on screen, the
   * avatar is standing on the bubble, and - unless there was no room anywhere
   * else - neither one covers the thing being explained.
   */
  for (const [name, viewport] of [["desktop", DESKTOP], ["phone", PHONE]] as const) {
    it(`keeps everything on screen and off the target on a ${name}`, () => {
      const width = bubbleWidth(viewport);
      for (let top = 0; top < viewport.height; top += 37) {
        for (let left = 0; left < viewport.width; left += 53) {
          for (const [tw, th] of [[40, 30], [220, 60], [360, 300], [viewport.width, 520]]) {
            for (const height of [150, 260, 380]) {
              const target = { left, top, width: Math.min(tw, viewport.width - left), height: th };
              const c = placeCallout({ target, viewport, bubble: { width, height } });
              const bubble = bubbleRect(viewport, height, c.bubble);
              const avatar = avatarRect(c.avatar);

              expect(bubble.left).toBeGreaterThanOrEqual(EDGE - 0.001);
              expect(bubble.left + bubble.width).toBeLessThanOrEqual(viewport.width - EDGE + 0.001);
              expect(bubble.top).toBeGreaterThanOrEqual(EDGE - 0.001);
              expect(bubble.top + bubble.height).toBeLessThanOrEqual(viewport.height - EDGE + 0.001);
              expect(avatar.left).toBeGreaterThanOrEqual(0);
              expect(avatar.top).toBeGreaterThanOrEqual(0);
              expect(avatar.left + AVATAR).toBeLessThanOrEqual(viewport.width);
              expect(avatar.top + AVATAR).toBeLessThanOrEqual(viewport.height);
              expect(overlaps(avatar, bubble)).toBe(true);

              const onScreen = visiblePart(target, viewport);
              if (onScreen && ["below", "above", "right", "left"].includes(c.side)) {
                expect(overlaps(bubble, onScreen)).toBe(false);
                expect(overlaps(avatar, onScreen)).toBe(false);
              }
            }
          }
        }
      }
    });
  }

  it("perches the avatar by the same overlap every time", () => {
    const c = placeCallout({ target: { left: 400, top: 30, width: 80, height: 36 }, viewport: DESKTOP, bubble: { width: 360, height: 200 } });
    expect(c.avatar.y + AVATAR - c.bubble.y).toBe(PERCH);
  });
});

describe("visiblePart", () => {
  it("clips a target that runs off the bottom", () => {
    expect(visiblePart({ left: 10, top: 700, width: 100, height: 400 }, DESKTOP))
      .toEqual({ left: 10, top: 700, width: 100, height: 100 });
  });

  it("is null for an element with no size, which is what a hidden one reports", () => {
    expect(visiblePart({ left: 0, top: 0, width: 0, height: 0 }, DESKTOP)).toBeNull();
  });
});

describe("bubbleWidth", () => {
  it("leaves the side margins on a phone", () => {
    expect(bubbleWidth(PHONE)).toBe(390 - EDGE * 2);
    expect(bubbleWidth(DESKTOP)).toBe(360);
  });
});

describe("dockPoint", () => {
  it("waits in the bottom-left corner, fully on screen", () => {
    for (const viewport of [DESKTOP, PHONE, { width: 320, height: 480 }]) {
      const p = dockPoint(viewport);
      expect(p.x).toBeLessThan(40);
      expect(p.y + AVATAR).toBeLessThanOrEqual(viewport.height - EDGE);
    }
  });
});

describe("hopHeight", () => {
  it("does not bounce when following a target the page nudged", () => {
    expect(hopHeight({ x: 0, y: 0 }, { x: 20, y: 10 })).toBe(0);
  });

  it("rises further for a longer flight, up to a ceiling", () => {
    const short = hopHeight({ x: 0, y: 0 }, { x: 200, y: 0 });
    const long = hopHeight({ x: 0, y: 0 }, { x: 900, y: 500 });
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
    expect(hopHeight({ x: 0, y: 0 }, { x: 5000, y: 5000 })).toBe(120);
  });
});

describe("scrollDelta", () => {
  it("leaves a target that is already in view alone", () => {
    expect(scrollDelta({ left: 0, top: 300, width: 100, height: 60 }, DESKTOP, 64)).toBeNull();
  });

  it("centres a target below the fold in the room under the sticky header", () => {
    const rect = { left: 0, top: 1200, width: 100, height: 60 };
    const delta = scrollDelta(rect, DESKTOP, 64)!;
    const after = rect.top - delta + rect.height / 2;
    const middle = 64 + EDGE + (DESKTOP.height - EDGE - (64 + EDGE)) / 2;
    expect(after).toBeCloseTo(middle, 0);
  });

  // The bug this exists to prevent: centring in the whole window put the top
  // of a target under the game bar.
  it("never scrolls a target up under the sticky header", () => {
    const rect = { left: 0, top: 40, width: 100, height: 60 };
    const delta = scrollDelta(rect, DESKTOP, 64)!;
    expect(rect.top - delta).toBeGreaterThanOrEqual(64);
  });

  it("brings the top of something taller than the screen into view", () => {
    const rect = { left: 0, top: 900, width: 100, height: 1400 };
    expect(900 - scrollDelta(rect, DESKTOP, 64)!).toBe(64 + EDGE);
  });
});

describe("spotlightFrame", () => {
  it("pads the target and keeps the hole on screen", () => {
    const f = spotlightFrame({ left: 0, top: 0, width: 100, height: 40 }, DESKTOP);
    expect(f.left).toBeGreaterThanOrEqual(0);
    expect(f.top).toBeGreaterThanOrEqual(0);
    expect(f.width).toBeGreaterThan(100);
  });

  it("never rounds a corner more than the hole is tall", () => {
    expect(spotlightFrame({ left: 100, top: 100, width: 200, height: 4 }, DESKTOP, 0).radius).toBe(2);
  });
});
