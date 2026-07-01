import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { N as Navbar } from "./Navbar-Cy4lBQ3b.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import { u as useAuthStore } from "./router-Cn57AZkw.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { M as MODE_TIMERS } from "./shared-Bfopko4w.mjs";
import { M as ModeAmbientLayer } from "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { P as Pill, H as Hospital, F as Factory, j as Package, q as Clock, L as Lock } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/framer-motion.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
import "./vendor-tanstack-DQdgH_5g.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
const MODES = [{
  slug: "rx",
  to: "/game/community",
  label: "Community Pharmacy",
  desc: "Prescriptions & OTC consultations - the full dispensary experience.",
  icon: Pill,
  emoji: "💊🏪",
  tag: "Beginner",
  accent: "#00BFA5",
  tint: "from-teal-500/25 to-cyan-500/10"
}, {
  slug: "hospital",
  to: "/game/hospital",
  label: "Clinical",
  desc: "Build medication orders, check interactions.",
  icon: Hospital,
  emoji: "🏥",
  tag: "Medium",
  accent: "#6366F1",
  tint: "from-[#6366F1]/25 to-[#A78BFA]/10"
}, {
  slug: "industry",
  to: "/game/industry",
  label: "Industry",
  desc: "Run a tablet batch from formula to release.",
  icon: Factory,
  emoji: "🏭",
  tag: "Medium",
  accent: "#F59E0B",
  tint: "from-[#F59E0B]/25 to-[#FBBF24]/10"
}, {
  slug: "warehousing",
  to: "/game/warehousing",
  label: "Warehousing",
  desc: "Receive stock, FEFO, cold chain & reconciliation.",
  icon: Package,
  emoji: "📦",
  tag: "Medium",
  accent: "#0EA5E9",
  tint: "from-[#0EA5E9]/25 to-[#38BDF8]/10"
}];
function Modes() {
  const {
    profile
  } = useAuthStore();
  const {
    data: count = 0
  } = useQuery({
    queryKey: ["all-cases-count", profile?.user_id],
    queryFn: async () => {
      if (!profile) return 0;
      const {
        count: count2
      } = await supabase.from("scores").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", profile.user_id);
      return count2 ?? 0;
    },
    enabled: !!profile
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-7xl px-6 py-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/dashboard" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "Training Modes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-muted-foreground", children: "Pick a mode - each case has a timer and a mentor tip." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: MODES.map((m) => {
        const Icon = m.icon;
        const locked = m.gated && count < 10;
        const inner = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `group relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br ${m.tint} p-5 transition hover:-translate-y-0.5`, style: {
          borderColor: `color-mix(in oklab, ${m.accent} 38%, transparent)`
        }, onMouseEnter: (e) => {
          e.currentTarget.style.boxShadow = `0 18px 40px -18px ${m.accent}99, 0 0 0 1px ${m.accent}55`;
        }, onMouseLeave: (e) => {
          e.currentTarget.style.boxShadow = "none";
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ModeAmbientLayer, { mode: m.slug, intensity: "card" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-start justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-5", style: {
              color: m.accent
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur", children: m.tag })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "relative mt-4 text-lg font-bold", style: {
            color: m.accent
          }, children: m.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "relative mt-1 text-sm text-muted-foreground", children: m.desc }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-4 flex items-center justify-between text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "size-3" }),
              " ",
              MODE_TIMERS[m.slug],
              "s"
            ] }),
            locked && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-amber-500", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3" }),
              " ",
              count,
              "/10"
            ] })
          ] })
        ] });
        return locked ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "opacity-60", children: inner }, m.slug) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: m.to, children: inner }, m.slug);
      }) })
    ] })
  ] });
}
export {
  Modes as component
};
