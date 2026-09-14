/**
 * Which section the phone bar says you are in.
 *
 * On a desktop the bar lists every destination and highlights the current
 * one, so where you are is never in question. A phone has room for one control
 * beside the logo, and a bare "Menu" there left the dashboard - which has no
 * page heading of its own - with nothing on screen saying where you were. The
 * menu button carries the section name instead.
 *
 * Prefix matching, so a nested page (a class inside the educator area, an
 * assessment id) still reports the section it belongs to.
 */

export type SectionLink = { to: string; label: string };

const STUDENT_SECTIONS: SectionLink[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/modes", label: "Modes" },
  { to: "/class", label: "Class" },
  { to: "/drugs", label: "Drug DB" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
  { to: "/live", label: "Live session" },
  { to: "/assessment", label: "Assessment" },
  { to: "/admin", label: "Admin" },
];

/** Matches on a whole path segment, so /class does not claim /classes. */
function within(pathname: string, to: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return path === to || path.startsWith(`${to}/`);
}

export function sectionLabel(pathname: string, sections: readonly SectionLink[], fallback = "Menu"): string {
  // Longest match first, so a more specific entry beats its parent.
  const match = [...sections].sort((a, b) => b.to.length - a.to.length).find((s) => within(pathname, s.to));
  return match?.label ?? fallback;
}

export function studentSectionLabel(pathname: string): string {
  return sectionLabel(pathname, STUDENT_SECTIONS);
}
