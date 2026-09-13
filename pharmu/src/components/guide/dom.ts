import type { Rect } from "@/lib/guide-flight";

/**
 * Reading the page the guide is flying over.
 *
 * Kept in one place because three things ask the same question - the tour,
 * the What's-this outlines and the automatic introductions - and if they
 * answered it differently the guide would offer to show something it then
 * could not find.
 */

/** Everything the guide draws carries this, so it never mistakes itself for the page. */
export const GUIDE_LAYER = "data-guide-layer";

export type PageAnchor = { id: string; scene: string | null; el: Element };

export function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function isShown(el: Element): boolean {
  if (el.closest(`[${GUIDE_LAYER}]`)) return false;
  const r = el.getBoundingClientRect();
  // Something hidden at this width - the bar's links on a phone - reports no
  // size at all, which is the signal the tour should skip it.
  if (r.width < 2 || r.height < 2) return false;
  return window.getComputedStyle(el).visibility !== "hidden";
}

/** Every marked control currently shown, in page order. */
export function findAnchors(): PageAnchor[] {
  const out: PageAnchor[] = [];
  for (const el of Array.from(document.querySelectorAll("[data-tour]"))) {
    const id = el.getAttribute("data-tour");
    if (!id || !isShown(el)) continue;
    const scene = el.closest("[data-tour-scene]")?.getAttribute("data-tour-scene") ?? null;
    out.push({ id, scene, el });
  }
  return out;
}

export function findAnchor(id: string): Element | null {
  for (const el of Array.from(document.querySelectorAll(`[data-tour="${CSS.escape(id)}"]`))) {
    if (isShown(el)) return el;
  }
  return null;
}

export function scenesOnPage(anchors: { scene: string | null }[]): string[] {
  return [...new Set(anchors.map((a) => a.scene).filter((s): s is string => !!s))];
}

/**
 * Whether something modal is over the page - the difficulty picker, a mistake
 * being explained, the results screen.
 *
 * The guide never flies in over one of those. They all cover the screen with a
 * fixed full-screen layer that takes clicks. The ambient backgrounds use the
 * same classes but let clicks through, and that is what tells the two apart.
 */
export function pageIsCovered(): boolean {
  return Array.from(document.querySelectorAll(".fixed.inset-0, [aria-modal='true']")).some((el) => {
    if (el.closest(`[${GUIDE_LAYER}]`)) return false;
    const style = window.getComputedStyle(el);
    if (style.pointerEvents === "none" || style.visibility === "hidden" || style.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/** The bottom of the sticky bar, so a target is never scrolled up underneath it. */
export function stickyTop(): number {
  const bar = document.querySelector("header.sticky, nav.sticky");
  return bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
}
