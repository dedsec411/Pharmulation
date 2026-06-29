import { j as jsxRuntimeExports } from "../_libs/react.mjs";
function normalizeMode(mode) {
  if (mode === "rx" || mode === "otc") return "community";
  if (mode === "clinical") return "hospital";
  return mode;
}
function ModeAmbientLayer({ mode, intensity = "card" }) {
  const normalized = normalizeMode(mode);
  const screen = intensity === "screen";
  const base = "pointer-events-none absolute inset-0 overflow-hidden";
  const soft = screen ? "opacity-35" : "opacity-55";
  if (normalized === "community") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `${base} ${soft}`, "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ambient-pill left-[8%] top-[22%] bg-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ambient-pill right-[12%] top-[16%] bg-cyan-300 [animation-delay:-4s]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ambient-pill bottom-[18%] left-[42%] bg-emerald-300 [animation-delay:-8s]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ambient-pill bottom-[28%] right-[26%] bg-white [animation-delay:-11s]" })
    ] });
  }
  if (normalized === "hospital") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `${base} ${screen ? "opacity-30" : "opacity-65"}`, "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-[-35%] top-[18%] h-16 ekg-scroll", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 480 72", className: "h-full w-[200%]", preserveAspectRatio: "none", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "polyline",
          {
            points: "0,38 38,38 50,20 64,54 78,38 120,38 132,10 146,62 160,38 218,38 236,28 252,48 268,38 320,38 334,18 350,58 366,38 480,38",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "3",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            className: "text-indigo-300/70"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "polyline",
          {
            points: "480,38 518,38 530,20 544,54 558,38 600,38 612,10 626,62 640,38 698,38 716,28 732,48 748,38 800,38 814,18 830,58 846,38 960,38",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "3",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            className: "text-indigo-300/70"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vital-monitor-scan absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-indigo-200/20 to-transparent" })
    ] });
  }
  if (normalized === "industry") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `${base} ${screen ? "opacity-30" : "opacity-60"}`, "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Gear, { className: "gear-spin absolute -right-5 -top-6 h-28 w-28 text-amber-300/35" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Gear, { className: "gear-spin absolute -bottom-8 left-8 h-20 w-20 text-amber-200/30 [animation-duration:16s] [animation-direction:reverse]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Gear, { className: "gear-spin absolute right-[36%] top-[38%] h-12 w-12 text-yellow-100/20 [animation-duration:12s]" })
    ] });
  }
  if (normalized === "warehousing") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `${base} ${screen ? "opacity-[0.32]" : "opacity-65"}`, "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-4 h-14 overflow-hidden border-y border-sky-300/20 bg-sky-400/5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conveyor-scroll flex h-full w-[calc(100%+96px)] items-center gap-4", children: Array.from({ length: 14 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-6 w-6 shrink-0 rounded-[3px] border border-sky-300/70 bg-sky-300/10" }, i)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-[4.2rem] h-px bg-gradient-to-r from-transparent via-sky-200/40 to-transparent" })
    ] });
  }
  return null;
}
function Gear({ className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 100 100", className, fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        d: "M50 9l7 10 12-3 3 12 12 3-3 12 10 7-10 7 3 12-12 3-3 12-12-3-7 10-7-10-12 3-3-12-12-3 3-12-10-7 10-7-3-12 12-3 3-12 12 3 7-10z",
        stroke: "currentColor",
        strokeWidth: "8",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "50", cy: "50", r: "16", stroke: "currentColor", strokeWidth: "8" })
  ] });
}
export {
  ModeAmbientLayer as M
};
