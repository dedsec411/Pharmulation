import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { M as ModeAmbientLayer } from "./ModeAmbientLayer-B2Acv9Tx.mjs";
const MODE_ACCENTS = {
  rx: "oklch(0.62 0.19 240)",
  otc: "oklch(0.72 0.16 165)",
  community: "oklch(0.74 0.14 180)",
  hospital: "oklch(0.60 0.20 270)",
  oncology: "oklch(0.62 0.22 300)",
  cosmetic: "oklch(0.68 0.22 340)",
  cosmetics: "oklch(0.68 0.22 340)",
  emergency: "oklch(0.65 0.22 25)",
  industry: "oklch(0.78 0.16 75)",
  warehousing: "oklch(0.60 0.18 220)"
};
function ModeTheme({ mode, children }) {
  reactExports.useEffect(() => {
    const accent = MODE_ACCENTS[mode] ?? MODE_ACCENTS.rx;
    document.documentElement.style.setProperty("--mode-accent", accent);
    document.body.classList.add("mode-themed", `mode-${mode}`);
    return () => {
      document.documentElement.style.removeProperty("--mode-accent");
      document.body.classList.remove("mode-themed", `mode-${mode}`);
    };
  }, [mode]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ModeAmbientLayer, { mode, intensity: "screen" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-10", children })
  ] });
}
export {
  ModeTheme as M
};
