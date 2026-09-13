/**
 * Where Dr. Hakim flies to, and where his speech bubble goes when he lands.
 *
 * The guide points at real controls on real pages, and real pages are not kind
 * to that. A target can be a nav link thirty pixels tall at the top of the
 * screen, a batch record taller than a phone, or a slider in the last strip
 * above the fold. Each of those is a way for a tour to park its bubble on top
 * of the very thing it is explaining, or half off the edge.
 *
 * So placement is arithmetic with tests rather than CSS with hope. A callout is
 * tried below the target, then above, then beside it; only when none of those
 * fit - a panel bigger than the room left around it - does it sit over the
 * target, on whichever end of the screen the target leaves freer.
 */

export type Rect = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

/** Nothing the guide draws comes closer to the edge of the screen than this. */
export const EDGE = 16;
/** Space between the thing being explained and the callout explaining it. */
export const GAP = 12;
/** The avatar's box. */
export const AVATAR = 64;
/** How much of the avatar overlaps the bubble he is perched on. */
export const PERCH = 22;
/** The widest a bubble gets; narrower on a phone. */
export const BUBBLE_MAX = 360;

export type Side = "below" | "above" | "right" | "left" | "over-top" | "over-bottom" | "centre";

export type Callout = {
  side: Side;
  /** Top-left corner of the bubble. */
  bubble: Point;
  /** Top-left corner of the avatar. */
  avatar: Point;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

export function bubbleWidth(viewport: Size): number {
  return Math.max(0, Math.min(BUBBLE_MAX, viewport.width - EDGE * 2));
}

/**
 * The part of a target actually on screen, or null when none of it is.
 *
 * Placement works from this rather than the whole element: a batch record that
 * runs off the bottom of the screen has no "below" to put a bubble in, and
 * treating it as if it did put the bubble out of sight.
 */
export function visiblePart(rect: Rect, viewport: Size): Rect | null {
  const left = Math.max(rect.left, 0);
  const top = Math.max(rect.top, 0);
  const right = Math.min(rect.left + rect.width, viewport.width);
  const bottom = Math.min(rect.top + rect.height, viewport.height);
  if (right - left < 1 || bottom - top < 1) return null;
  return { left, top, width: right - left, height: bottom - top };
}

export function placeCallout(input: { target: Rect | null; viewport: Size; bubble: Size }): Callout {
  const { viewport } = input;
  const w = Math.min(input.bubble.width, bubbleWidth(viewport));
  const h = input.bubble.height;
  // How far the perched avatar stands out beyond the bubble's edge.
  const lift = AVATAR - PERCH;
  const maxX = viewport.width - EDGE - w;
  const target = input.target ? visiblePart(input.target, viewport) : null;

  // He stands on the bubble's edge nearest the target, shuffled along it
  // towards what he is pointing at, but never off the end of the bubble.
  const alongBubble = (bx: number, towardX: number) =>
    clamp(towardX - AVATAR / 2, bx - 8, bx + w - AVATAR + 8);
  const onTop = (bx: number, by: number, towardX: number): Point => ({ x: alongBubble(bx, towardX), y: by - lift });
  const underneath = (bx: number, by: number, towardX: number): Point => ({ x: alongBubble(bx, towardX), y: by + h - PERCH });

  if (!target) {
    const bx = clamp((viewport.width - w) / 2, EDGE, maxX);
    const by = clamp((viewport.height - h + lift) / 2, EDGE + lift, viewport.height - EDGE - h);
    return { side: "centre", bubble: { x: bx, y: by }, avatar: onTop(bx, by, bx) };
  }

  const cx = target.left + target.width / 2;
  const stack = h + lift;
  const centredX = clamp(cx - w / 2, EDGE, maxX);

  const belowTop = target.top + target.height + GAP;
  if (belowTop + stack <= viewport.height - EDGE) {
    const by = belowTop + lift;
    return { side: "below", bubble: { x: centredX, y: by }, avatar: onTop(centredX, by, cx) };
  }

  const aboveBottom = target.top - GAP;
  if (aboveBottom - stack >= EDGE) {
    const by = aboveBottom - stack;
    return { side: "above", bubble: { x: centredX, y: by }, avatar: underneath(centredX, by, cx) };
  }

  const sideY = clamp(target.top + target.height / 2 - h / 2, EDGE + lift, viewport.height - EDGE - h);
  const rightX = target.left + target.width + GAP;
  if (rightX + w <= viewport.width - EDGE) {
    return { side: "right", bubble: { x: rightX, y: sideY }, avatar: onTop(rightX, sideY, rightX) };
  }
  const leftEdge = target.left - GAP;
  if (leftEdge - w >= EDGE) {
    const bx = leftEdge - w;
    return { side: "left", bubble: { x: bx, y: sideY }, avatar: onTop(bx, sideY, bx + w) };
  }

  const roomAbove = target.top;
  const roomBelow = viewport.height - (target.top + target.height);
  if (roomBelow >= roomAbove) {
    const by = Math.max(EDGE + lift, viewport.height - EDGE - h);
    return { side: "over-bottom", bubble: { x: centredX, y: by }, avatar: onTop(centredX, by, cx) };
  }
  const by = EDGE + lift;
  return { side: "over-top", bubble: { x: centredX, y: by }, avatar: onTop(centredX, by, cx) };
}

/** Where he waits between tours: the bottom-left corner, where the mentor button always was. */
export function dockPoint(viewport: Size): Point {
  return { x: EDGE + 4, y: Math.max(EDGE, viewport.height - EDGE - 4 - AVATAR) };
}

/**
 * How high he rises on the way between two points.
 *
 * A straight line reads as sliding; a rise and fall reads as flight. A short
 * hop - following a slider that moved a few pixels as the page scrolled - gets
 * none, or he would bounce every time the page moved.
 */
export function hopHeight(from: Point, to: Point): number {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  if (d < 48) return 0;
  return Math.round(Math.min(120, 24 + d * 0.18));
}

/**
 * How far to scroll the window so a target can be seen, or null if it already can.
 *
 * `topInset` is the sticky header. Centring a target in the whole window tucks
 * the top of it under the game bar, which is how the first version of this
 * pointed at a timer nobody could see.
 */
export function scrollDelta(rect: Rect, viewport: Size, topInset = 0): number | null {
  const roomTop = topInset + EDGE;
  const roomBottom = viewport.height - EDGE;
  if (rect.top >= roomTop && rect.top + rect.height <= roomBottom) return null;
  const room = roomBottom - roomTop;
  if (rect.height <= room) {
    const middle = roomTop + room / 2;
    return Math.round(rect.top + rect.height / 2 - middle);
  }
  // Taller than the screen: bring its top into view, which is where anybody reads from.
  return Math.round(rect.top - roomTop);
}

/** The lit-up hole around a target: padded, kept on screen, corners no rounder than the box allows. */
export function spotlightFrame(rect: Rect, viewport: Size, pad = 8): Rect & { radius: number } {
  const left = Math.max(2, rect.left - pad);
  const top = Math.max(2, rect.top - pad);
  const right = Math.min(viewport.width - 2, rect.left + rect.width + pad);
  const bottom = Math.min(viewport.height - 2, rect.top + rect.height + pad);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return { left, top, width, height, radius: Math.min(16, height / 2, width / 2) };
}
