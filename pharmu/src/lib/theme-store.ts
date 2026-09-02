import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Dark or light, chosen by the person using it.
 *
 * Dark stays the default and stays exactly as it was - this adds a second
 * theme rather than reworking the first. Light is Green Cross, the pharmacy
 * sign palette from the colour study.
 *
 * No "system" option. The product is dark by identity, and a lecturer opening
 * it on a machine set to light would otherwise get a theme nobody chose for
 * a showcase.
 */

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "pharmulation.theme";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: THEME_STORAGE_KEY }
  )
);

/** Stamp the choice on <html>, which is what the CSS selects on. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Keep the document in step with the store.
 *
 * Mounted once at the root. The inline script in the document head has already
 * stamped the attribute by the time this runs; this exists to follow later
 * changes, not to do the first paint.
 */
export function useThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => applyTheme(theme), [theme]);
}

/**
 * Read the stored choice and stamp it before the first paint.
 *
 * Runs as a blocking inline script in <head>. Without it the page paints dark,
 * React hydrates, and a light-theme user watches the whole app flash from
 * black to white on every navigation.
 *
 * Kept as a string because it has to be inlined into the document rather than
 * bundled - by the time a module has loaded, the flash has already happened.
 */
export const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var raw = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = raw ? (JSON.parse(raw).state || {}).theme : null;
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`.trim();
