/**
 * The mentor character, in one place.
 *
 * These constants were previously copy-pasted into five components. Changing
 * the artwork therefore meant editing five files in lockstep, which is exactly
 * how the "fixed dr hakim gender" chain ended up spanning five commits. Import
 * from here instead so a re-skin is a one-line change.
 */

/** Mentor avatar, served from `public/`. */
export const MENTOR_IMAGE = "/dr-hakim-clean.png";

/** Display name, for headings and chat labels. */
export const MENTOR_NAME = "Dr. Hakim";

/** Role subtitle shown alongside the name. */
export const MENTOR_ROLE = "Pharmacist mentor";
