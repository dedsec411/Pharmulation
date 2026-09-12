import { GUEST_USER_ID } from "@/lib/api/guest.functions";

/**
 * Remembering which guides somebody has already been shown.
 *
 * Kept apart from the guides themselves because the interesting decision here
 * is not what to store but *where*, and that differs by who is asking.
 *
 * A signed-in account is one person, so what they have seen belongs in
 * localStorage and should outlive the tab. The guest account is not one
 * person: at a stand it is whoever picked up the laptop thirty seconds ago.
 * Storing its progress in localStorage would mean the first visitor gets the
 * tour and everybody after them gets nothing, which is exactly backwards for
 * the account that exists so strangers can find their way around. So guest
 * remembers for the session and forgets when the tab closes.
 */

type Bin = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "pharmulation.guide";

export const seenKey = (userId: string, guideKey: string) => `${PREFIX}.${userId}.${guideKey}`;

/** The guest's progress lives for one session; everybody else's persists. */
export function isSharedAccount(userId: string): boolean {
  return userId === GUEST_USER_ID;
}

/**
 * The right bin for this user, or null when the browser will not give us one.
 *
 * Private windows, blocked site data and screenshot tooling all throw on
 * access rather than returning empty, so every caller has to cope with null.
 * Losing this state shows somebody a guide twice, which is survivable; a
 * thrown error on page load is not.
 */
export function binFor(userId: string): Bin | null {
  try {
    return isSharedAccount(userId) ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenGuide(bin: Bin | null, userId: string, guideKey: string): boolean {
  if (!bin) return false;
  try {
    return bin.getItem(seenKey(userId, guideKey)) === "seen";
  } catch {
    return false;
  }
}

export function markGuideSeen(bin: Bin | null, userId: string, guideKey: string): void {
  if (!bin) return;
  try {
    bin.setItem(seenKey(userId, guideKey), "seen");
  } catch {
    // A full or blocked store is not worth interrupting anybody over.
  }
}

export function forgetGuides(bin: Bin | null, userId: string, guideKeys: string[]): void {
  if (!bin) return;
  for (const key of guideKeys) {
    try {
      bin.removeItem(seenKey(userId, key));
    } catch {
      // As above.
    }
  }
}

/**
 * A first-timer gets walked through it. Somebody coming back for a reminder
 * wants to find one thing, not click Next eight times to reach it.
 */
export function initialView(seen: boolean): "walkthrough" | "contents" {
  return seen ? "contents" : "walkthrough";
}
