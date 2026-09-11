/**
 * The mentor character, in one place.
 *
 * These constants were previously copy-pasted into five components. Changing
 * the artwork therefore meant editing five files in lockstep, which is exactly
 * how the "fixed dr hakim gender" chain ended up spanning five commits. Import
 * from here instead so a re-skin is a one-line change.
 */

/** Mentor avatar, served from `public/`. */
/**
 * 42 KB rather than 1.3 MB.
 *
 * The original was 1516x1967 and shipped in full on every page that shows the
 * mentor. It is never drawn larger than eighty pixels tall, so more than
 * ninety-five percent of that download was thrown away by the browser before
 * anything appeared.
 */
export const MENTOR_IMAGE = "/dr-hakim.webp";

/** Display name, for headings and chat labels. */
export const MENTOR_NAME = "Dr. Hakim";

/** Role subtitle shown alongside the name. */
export const MENTOR_ROLE = "Pharmacist mentor";
