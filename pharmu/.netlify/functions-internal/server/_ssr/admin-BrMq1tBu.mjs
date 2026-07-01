import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { S as redirect } from "../_libs/tanstack__router-core.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { N as Navbar } from "./Navbar-DUNEtWun.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { u as useAuthStore } from "./router-DEiKTBt8.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { E as Users, I as ChartColumn, i as FlaskConical, P as Pill } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "./vendor-tanstack-Z7Fi8gb-.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/framer-motion.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
function AdminPage() {
  const {
    profile
  } = useAuthStore();
  const [tab, setTab] = reactExports.useState("overview");
  if (profile && profile.role !== "admin") {
    throw redirect({
      to: "/dashboard"
    });
  }
  const {
    data: users = []
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("xp", {
      ascending: false
    })).data ?? []
  });
  const {
    data: cases = []
  } = useQuery({
    queryKey: ["admin-cases"],
    queryFn: async () => (await supabase.from("cases").select("*").order("created_at", {
      ascending: false
    })).data ?? []
  });
  const {
    data: drugs = []
  } = useQuery({
    queryKey: ["admin-drugs"],
    queryFn: async () => (await supabase.from("drugs").select("*").order("name")).data ?? []
  });
  const {
    data: scoresToday = []
  } = useQuery({
    queryKey: ["admin-scores-today"],
    queryFn: async () => {
      const since = /* @__PURE__ */ new Date();
      since.setHours(0, 0, 0, 0);
      const {
        data
      } = await supabase.from("scores").select("mode, accuracy").gte("completed_at", since.toISOString());
      return data ?? [];
    }
  });
  const {
    data: recentErrors = []
  } = useQuery({
    queryKey: ["admin-recent-errors"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("scores").select("mode, errors_detail").order("completed_at", {
        ascending: false
      }).limit(500);
      return data ?? [];
    }
  });
  const errorAgg = {};
  recentErrors.forEach((row) => {
    const list = Array.isArray(row.errors_detail) ? row.errors_detail : [];
    list.forEach((e) => {
      const m = e?.mode ?? row.mode ?? "unknown";
      const t = e?.errorType ?? "Unknown";
      errorAgg[m] = errorAgg[m] ?? {};
      errorAgg[m][t] = (errorAgg[m][t] ?? 0) + 1;
    });
  });
  const modeCounts = {};
  scoresToday.forEach((s) => {
    modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1;
  });
  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const avgAcc = scoresToday.length > 0 ? Math.round(scoresToday.reduce((s, x) => s + x.accuracy, 0) / scoresToday.length * 100) : 0;
  async function promoteUser(uid) {
    await supabase.from("profiles").update({
      role: "admin"
    }).eq("user_id", uid);
  }
  async function deleteCase(id) {
    if (!confirm("Delete this case?")) return;
    await supabase.from("cases").delete().eq("id", id);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-6xl px-6 py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/dashboard" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "Admin Panel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Manage users, cases and drugs." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 flex gap-1 glass rounded-full p-1 text-sm w-fit", children: ["overview", "users", "cases", "drugs"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-5 py-1.5 rounded-full capitalize transition ${tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`, children: t }, t)) }),
      tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: Users, label: "Total users", value: users.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: ChartColumn, label: "Cases today", value: scoresToday.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: FlaskConical, label: "Top mode today", value: topMode }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: Pill, label: "Avg accuracy today", value: `${avgAcc}%` })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 glass-card p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Most common errors (last 500 cases)" }),
          Object.keys(errorAgg).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "No errors logged yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: Object.entries(errorAgg).map(([mode, types]) => {
            const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const max = sorted[0]?.[1] ?? 1;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-background/40 p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold capitalize", children: mode }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-2", children: sorted.map(([type, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: type }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-muted-foreground", children: count })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 h-1.5 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-primary", style: {
                  width: `${count / max * 100}%`
                } }) })
              ] }, type)) })
            ] }, mode);
          }) })
        ] })
      ] }),
      tab === "users" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right p-3", children: "Level" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right p-3", children: "Cases" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: users.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: u.full_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-muted-foreground", children: u.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 capitalize", children: u.role }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right", children: u.level }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right", children: u.total_cases_completed }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right", children: u.role !== "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => promoteUser(u.user_id), className: "text-xs text-primary hover:underline", children: "Promote" }) })
        ] }, u.user_id)) })
      ] }) }),
      tab === "cases" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Title" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Difficulty" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Created" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-3" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: cases.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: c.title ?? c.id.slice(0, 8) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 capitalize", children: c.mode }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 capitalize", children: c.difficulty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-muted-foreground", children: new Date(c.created_at).toLocaleDateString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteCase(c.id), className: "text-xs text-rose-400 hover:underline", children: "Delete" }) })
        ] }, c.id)) })
      ] }) }),
      tab === "drugs" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Generic" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Class" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Category" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: drugs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 font-semibold", children: d.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-muted-foreground", children: d.generic_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: d.drug_class }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: d.category })
        ] }, d.id)) })
      ] }) })
    ] })
  ] });
}
function Stat({
  icon: Icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5 text-primary mb-2" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: label })
  ] });
}
export {
  AdminPage as component
};
