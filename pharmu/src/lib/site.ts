/**
 * Where this app lives, and how it describes itself.
 *
 * One place, because the same few strings are needed by the canonical link,
 * the social card, the sitemap and the manifest - and four copies of a URL is
 * three chances for one of them to be wrong on the day it matters.
 *
 * Change SITE_URL when a real domain is pointed at the deployment. The two
 * static files that cannot import this - public/robots.txt and
 * public/sitemap.xml - carry the same value and have to be changed with it.
 */

export const SITE_URL =
  (import.meta.env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")
  ?? "https://pharmulation.vercel.app";

export const SITE_NAME = "Pharmulation";

export const SITE_TAGLINE = "Train Like a Real Pharmacist";

/**
 * The default description, at the length a search result actually shows.
 * Longer than about 160 characters and the tail is replaced with an ellipsis,
 * so the last clause is wasted.
 */
export const SITE_DESCRIPTION =
  "Practise dispensing on real prescriptions in a browser. Four training modes - community, clinical, industry and warehousing - with instant feedback and no risk to a patient.";

/** Absolute URL for a path, for canonical links and social cards. */
export function canonical(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export const OG_IMAGE = `${SITE_URL}/og-image.png`;
