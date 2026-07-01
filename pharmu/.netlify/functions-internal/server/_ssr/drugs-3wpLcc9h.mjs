import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { a as useQueryClient, u as useQuery, b as useMutation } from "../_libs/tanstack__react-query.mjs";
import { N as Navbar } from "./Navbar-DUNEtWun.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { u as useAuthStore } from "./router-DEiKTBt8.mjs";
import { p as prepareDrugCatalog } from "./drug-catalog-DKPW6qki.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import "../_libs/seroval.mjs";
import { u as Search, v as Heart, f as BookOpen, X, w as Sparkles } from "../_libs/lucide-react.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-router.mjs";
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
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
function DrugsPage() {
  const {
    profile
  } = useAuthStore();
  const userId = profile?.user_id;
  const qc = useQueryClient();
  const [tab, setTab] = reactExports.useState("all");
  const [q, setQ] = reactExports.useState("");
  const [category, setCategory] = reactExports.useState("");
  const [drugClass, setDrugClass] = reactExports.useState("");
  const [selected, setSelected] = reactExports.useState(null);
  const {
    data: drugs = []
  } = useQuery({
    queryKey: ["drugs"],
    queryFn: async () => (await supabase.from("drugs").select("*").order("name")).data ?? []
  });
  const catalogDrugs = reactExports.useMemo(() => prepareDrugCatalog(drugs), [drugs]);
  const {
    data: bookmarks = []
  } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from("drug_bookmarks").select("drug_id").eq("user_id", userId);
      return (data ?? []).map((b) => b.drug_id);
    },
    enabled: !!userId
  });
  const toggleBookmark = useMutation({
    mutationFn: async (drug) => {
      if (!userId) return;
      if (drug.id.startsWith("catalog-")) {
        toast.info("Training catalog medicines can be studied from the card, but are not bookmarkable yet.");
        return;
      }
      if (bookmarks.includes(drug.id)) {
        await supabase.from("drug_bookmarks").delete().eq("user_id", userId).eq("drug_id", drug.id);
      } else {
        await supabase.from("drug_bookmarks").insert({
          user_id: userId,
          drug_id: drug.id
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({
      queryKey: ["bookmarks", userId]
    })
  });
  const categories = reactExports.useMemo(() => Array.from(new Set(catalogDrugs.map((d) => d.category).filter(Boolean))), [catalogDrugs]);
  const classes = reactExports.useMemo(() => Array.from(new Set(catalogDrugs.map((d) => d.drug_class).filter(Boolean))), [catalogDrugs]);
  const list = catalogDrugs.filter((d) => {
    const term = q.toLowerCase();
    return (!term || d.name.toLowerCase().includes(term) || d.generic_name?.toLowerCase().includes(term)) && (!category || d.category === category) && (!drugClass || d.drug_class === drugClass);
  });
  const studyDrugs = catalogDrugs.filter((d) => bookmarks.includes(d.id));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-6xl px-6 py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/dashboard" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "Drug Database" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground text-sm", children: [
            catalogDrugs.length,
            " drugs indexed · ",
            bookmarks.length,
            " bookmarked"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 glass rounded-full p-1 text-sm", children: ["all", "study", "flashcards", "quiz"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-4 py-1.5 rounded-full transition capitalize ${tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`, children: t === "all" ? "All" : t === "study" ? "Study list" : t === "flashcards" ? "Flashcards" : "Quiz" }, t)) })
      ] }),
      tab === "all" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid md:grid-cols-[1fr_220px_220px] gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search by brand or generic name…", className: "w-full rounded-full glass pl-11 pr-4 py-3 outline-none focus:border-primary" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "rounded-full glass px-4 py-3 text-sm outline-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All categories" }),
            categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: drugClass, onChange: (e) => setDrugClass(e.target.value), className: "rounded-full glass px-4 py-3 text-sm outline-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All classes" }),
            classes.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
          list.map((d) => {
            const bookmarked = bookmarks.includes(d.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { layout: true, onClick: () => setSelected(d), whileHover: {
              y: -2
            }, className: "glass-card p-5 text-left hover:border-primary/40 transition relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => {
                e.stopPropagation();
                toggleBookmark.mutate(d);
              }, className: `absolute top-4 right-4 p-1.5 rounded-full transition ${bookmarked ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-muted-foreground hover:text-rose-400"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Heart, { className: "h-4 w-4", fill: bookmarked ? "currentColor" : "none" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold pr-8", children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: d.generic_name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex gap-2 flex-wrap", children: [
                d.drug_class && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-wider rounded-full bg-primary/15 text-primary px-2 py-1", children: d.drug_class }),
                d.category && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-wider rounded-full bg-white/10 text-muted-foreground px-2 py-1", children: d.category })
              ] })
            ] }, d.id);
          }),
          list.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full text-center text-muted-foreground py-10", children: "No drugs match your filters." })
        ] })
      ] }),
      tab === "study" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: studyDrugs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-10 text-center text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "h-8 w-8 mx-auto mb-2 text-primary" }),
        "No drugs in your study list yet. Bookmark drugs from the All tab."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: studyDrugs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold", children: d.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: d.generic_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-xs", children: [
          "Indications: ",
          d.indications?.join(", ") || "—"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleBookmark.mutate(d), className: "mt-3 text-xs text-rose-400 hover:underline", children: "Remove" })
      ] }, d.id)) }) }),
      tab === "flashcards" && /* @__PURE__ */ jsxRuntimeExports.jsx(Flashcards, { drugs: studyDrugs }),
      tab === "quiz" && /* @__PURE__ */ jsxRuntimeExports.jsx(Quiz, { drugs: studyDrugs, pool: catalogDrugs })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: selected && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: {
      opacity: 0
    }, animate: {
      opacity: 1
    }, exit: {
      opacity: 0
    }, className: "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4", onClick: () => setSelected(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
      scale: 0.95,
      opacity: 0
    }, animate: {
      scale: 1,
      opacity: 1
    }, exit: {
      scale: 0.95,
      opacity: 0
    }, onClick: (e) => e.stopPropagation(), className: "glass-card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold", children: selected.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-muted-foreground", children: [
            selected.generic_name,
            " · ",
            selected.drug_class
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSelected(null), className: "p-2 hover:bg-white/5 rounded-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Dosage & administration", body: selected.dosage }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListSection, { title: "Indications", items: selected.indications }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListSection, { title: "Side effects", items: selected.side_effects }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListSection, { title: "Contraindications", items: selected.contraindications }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListSection, { title: "Drug interactions", items: selected.interactions }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => toggleBookmark.mutate(selected), className: "mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Heart, { className: "h-4 w-4", fill: bookmarks.includes(selected.id) ? "currentColor" : "none" }),
        bookmarks.includes(selected.id) ? "Remove from study list" : "Add to study list"
      ] })
    ] }) }) })
  ] });
}
function Section({
  title,
  body
}) {
  if (!body) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-primary font-semibold", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm", children: body })
  ] });
}
function ListSection({
  title,
  items
}) {
  if (!items?.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-primary font-semibold", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 text-sm list-disc pl-5 space-y-0.5", children: items.map((i, k) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: i }, k)) })
  ] });
}
function Flashcards({
  drugs
}) {
  const [i, setI] = reactExports.useState(0);
  const [flipped, setFlipped] = reactExports.useState(false);
  if (drugs.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card p-10 text-center text-muted-foreground", children: "Add drugs to your study list to start flashcards." });
  const d = drugs[i % drugs.length];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 max-w-xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { onClick: () => setFlipped((f) => !f), className: "glass-card p-10 min-h-[260px] grid place-items-center text-center cursor-pointer hover:border-primary/40 transition", children: !flipped ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "mx-auto h-5 w-5 text-primary mb-2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-bold", children: d.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground mt-1", children: d.generic_name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-4", children: "Click to flip" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase text-primary font-semibold mb-1", children: "Indications" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: d.indications?.join(", ") || "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase text-primary font-semibold mt-3 mb-1", children: "Side effects" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: d.side_effects?.join(", ") || "—" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex justify-between text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        setI((p) => (p - 1 + drugs.length) % drugs.length);
        setFlipped(false);
      }, className: "rounded-full glass px-4 py-2", children: "← Prev" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground self-center", children: [
        i % drugs.length + 1,
        " / ",
        drugs.length
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        setI((p) => (p + 1) % drugs.length);
        setFlipped(false);
      }, className: "rounded-full glass px-4 py-2", children: "Next →" })
    ] })
  ] });
}
function Quiz({
  drugs,
  pool
}) {
  const [questions] = reactExports.useState(() => buildQuiz(drugs, pool, 10));
  const [answers, setAnswers] = reactExports.useState({});
  const [done, setDone] = reactExports.useState(false);
  if (drugs.length < 4) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card p-10 text-center text-muted-foreground", children: "Bookmark at least 4 drugs to generate a quiz." });
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 max-w-2xl mx-auto space-y-4", children: [
    questions.map((q, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-primary font-semibold uppercase", children: [
        "Q",
        i + 1
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold mt-1", children: q.question }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid sm:grid-cols-2 gap-2", children: q.options.map((o) => {
        const sel = answers[i] === o;
        const correct = done && o === q.correct;
        const wrong = done && sel && o !== q.correct;
        return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: done, onClick: () => setAnswers((a) => ({
          ...a,
          [i]: o
        })), className: `text-left text-sm rounded-xl px-4 py-2.5 border transition ${correct ? "border-emerald-400 bg-emerald-400/10" : wrong ? "border-rose-400 bg-rose-400/10" : sel ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/30"}`, children: o }, o);
      }) })
    ] }, i)),
    !done ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setDone(true), className: "w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground", children: [
      "Submit (",
      Object.keys(answers).length,
      "/",
      questions.length,
      ")"
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-bold text-primary", children: [
        score,
        " / ",
        questions.length
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Quiz complete." })
    ] })
  ] });
}
function buildQuiz(drugs, pool, n) {
  const out = [];
  const ds = [...drugs].sort(() => Math.random() - 0.5).slice(0, n);
  for (const d of ds) {
    const ind = d.indications?.[0];
    if (!ind) continue;
    const wrongs = pool.filter((p) => p.id !== d.id && p.indications?.[0]).map((p) => p.name).sort(() => Math.random() - 0.5).slice(0, 3);
    out.push({
      question: `Which drug is indicated for ${ind}?`,
      options: [...wrongs, d.name].sort(() => Math.random() - 0.5),
      correct: d.name
    });
  }
  return out;
}
export {
  DrugsPage as component
};
