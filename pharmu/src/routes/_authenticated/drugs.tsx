import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Heart, BookOpen, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { prepareDrugCatalog } from "@/lib/drug-catalog";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { unwrapList } from "@/lib/supabase-query";
import { drugTagColor } from "@/lib/drug-colors";
import { flashcardFacts } from "@/lib/drug-study";
import { DrugQuiz } from "@/components/game/DrugQuiz";

export const Route = createFileRoute("/_authenticated/drugs")({
  head: () => ({ meta: [{ title: "Drug Database - Pharmulation" }] }),
  component: DrugsPage,
});

type Drug = {
  id: string;
  name: string;
  generic_name: string | null;
  drug_class: string | null;
  category: string | null;
  dosage: string | null;
  indications: string[] | null;
  side_effects: string[] | null;
  contraindications: string[] | null;
  interactions: string[] | null;
};

function DrugsPage() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "study" | "flashcards" | "quiz">("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [drugClass, setDrugClass] = useState("");
  const [selected, setSelected] = useState<Drug | null>(null);
  const [studySource, setStudySource] = useState<string>("all");

  const { data: drugs = [] } = useQuery({
    queryKey: ["drugs"],
    queryFn: async () => unwrapList(
      await supabase.from("drugs").select("*").order("name"),
      "the drug database",
    ) as Drug[],
  });
  const catalogDrugs = useMemo(() => prepareDrugCatalog(drugs) as Drug[], [drugs]);

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const data = unwrapList(
        await supabase.from("drug_bookmarks").select("drug_ref").eq("user_id", userId),
        "your bookmarks",
      );
      return data.map((b: any) => b.drug_ref as string);
    },
    enabled: !!userId,
  });

  const toggleBookmark = useMutation({
    // Every catalogue entry is bookmarkable now, generated or not: drug_ref is
    // text, so it holds a real drug's uuid or a "catalog-..." key equally.
    mutationFn: async (drug: Drug) => {
      if (!userId) return;
      if (bookmarks.includes(drug.id)) {
        const { error } = await supabase.from("drug_bookmarks").delete()
          .eq("user_id", userId).eq("drug_ref", drug.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("drug_bookmarks")
          .insert({ user_id: userId, drug_ref: drug.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", userId] }),
    onError: (error) => {
      console.error("[supabase] bookmark toggle failed:", error);
      toast.error("Could not update your study list.");
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(catalogDrugs.map((d) => d.category).filter(Boolean))) as string[],
    [catalogDrugs],
  );
  const classes = useMemo(
    () => Array.from(new Set(catalogDrugs.map((d) => d.drug_class).filter(Boolean))) as string[],
    [catalogDrugs],
  );

  const list = catalogDrugs.filter((d) => {
    const term = q.toLowerCase();
    return (
      (!term || d.name.toLowerCase().includes(term) || d.generic_name?.toLowerCase().includes(term)) &&
      (!category || d.category === category) &&
      (!drugClass || d.drug_class === drugClass)
    );
  });

  // What the study tools draw from. Previously hardcoded to bookmarks, so all
  // three tabs sat empty until four drugs had been bookmarked - which read as
  // unimplemented rather than unstarted.
  const bookmarkedDrugs = catalogDrugs.filter((d) => bookmarks.includes(d.id));
  const studyDrugs = useMemo(() => {
    if (studySource === "bookmarks") return bookmarkedDrugs;
    if (studySource === "all") return catalogDrugs;
    return catalogDrugs.filter((d) => d.category === studySource);
  }, [studySource, catalogDrugs, bookmarks]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        
        <div className="mb-6"><BackButton to="/dashboard" /></div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Drug Database</h1>
            <p className="text-muted-foreground text-sm">{catalogDrugs.length} drugs indexed · {bookmarks.length} bookmarked</p>
          </div>
          <div className="flex gap-1 glass rounded-full p-1 text-sm">
            {(["all", "study", "flashcards", "quiz"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full transition capitalize ${
                  tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t === "all" ? "All" : t === "study" ? "Study list" : t === "flashcards" ? "Flashcards" : "Quiz"}
              </button>
            ))}
          </div>
        </div>

        {tab === "all" && (
          <>
            <div className="mt-6 grid md:grid-cols-[1fr_220px_220px] gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by brand or generic name…"
                  className="w-full rounded-full glass pl-11 pr-4 py-3 outline-none focus:border-primary" />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="rounded-full glass px-4 py-3 text-sm outline-none">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={drugClass} onChange={(e) => setDrugClass(e.target.value)}
                className="rounded-full glass px-4 py-3 text-sm outline-none">
                <option value="">All classes</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((d) => {
                const bookmarked = bookmarks.includes(d.id);
                return (
                  <motion.button
                    layout key={d.id} onClick={() => setSelected(d)}
                    whileHover={{ y: -2 }}
                    className="glass-card p-5 text-left hover:border-primary/40 transition relative">
                    {(
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark.mutate(d); }}
                        title={bookmarked ? `Remove ${d.name} from your study list` : `Save ${d.name} to your study list`}
                        aria-label={bookmarked ? `Remove ${d.name} from your study list` : `Save ${d.name} to your study list`}
                        aria-pressed={bookmarked}
                        className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          bookmarked
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-white/5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400"
                        }`}>
                        <Heart className="h-3.5 w-3.5" fill={bookmarked ? "currentColor" : "none"} />
                        {bookmarked ? "Saved" : "Save"}
                      </button>
                    )}
                    <div className="font-bold pr-20">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.generic_name}</div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {d.drug_class && (
                        <span
                          className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider"
                          style={drugTagColor(d.drug_class)}
                        >{d.drug_class}</span>
                      )}
                      {d.category && (
                        <span
                          className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider"
                          style={drugTagColor(d.category)}
                        >{d.category}</span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              {list.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">No drugs match your filters.</div>}
            </div>
          </>
        )}

        {tab !== "all" && (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card/40 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Studying</span>
            <button
              onClick={() => setStudySource("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                studySource === "all" ? "border-primary bg-primary/15 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"
              }`}
            >
              Whole catalogue ({catalogDrugs.length})
            </button>
            <button
              onClick={() => setStudySource("bookmarks")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                studySource === "bookmarks" ? "border-primary bg-primary/15 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"
              }`}
            >
              My saved ({bookmarkedDrugs.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setStudySource(c)}
                style={studySource === c ? drugTagColor(c) : undefined}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  studySource === c ? "" : "border-border/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {tab === "study" && (
          <div className="mt-6">
            {studyDrugs.length === 0 ? (
              <div className="glass-card p-10 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                Nothing to study in this selection. Pick another source above.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {studyDrugs.map((d) => (
                  <div key={d.id} className="glass-card p-5">
                    <div className="font-bold">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.generic_name}</div>
                    <div className="mt-2 text-xs">Indications: {d.indications?.join(", ") || "—"}</div>
                    <button onClick={() => toggleBookmark.mutate(d)} className="mt-3 text-xs text-rose-400 hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "flashcards" && <Flashcards drugs={studyDrugs} />}
        {tab === "quiz" && <DrugQuiz drugs={studyDrugs} pool={catalogDrugs} />}
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold">{selected.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selected.generic_name}
                    {selected.drug_class && (
                      <span
                        className="ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        style={drugTagColor(selected.drug_class)}
                      >{selected.drug_class}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="h-4 w-4" /></button>
              </div>
              <Section title="Dosage & administration" body={selected.dosage} />
              <ListSection title="Indications" items={selected.indications} />
              <ListSection title="Side effects" items={selected.side_effects} />
              <ListSection title="Contraindications" items={selected.contraindications} />
              <ListSection title="Drug interactions" items={selected.interactions} />
              <button
                onClick={() => toggleBookmark.mutate(selected)}
                className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2">
                <Heart className="h-4 w-4" fill={bookmarks.includes(selected.id) ? "currentColor" : "none"} />
                {bookmarks.includes(selected.id) ? "Remove from study list" : "Add to study list"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="mt-5">
      <div className="text-xs uppercase tracking-wider text-primary font-semibold">{title}</div>
      <div className="mt-1 text-sm">{body}</div>
    </div>
  );
}
function ListSection({ title, items }: { title: string; items: string[] | null }) {
  if (!items?.length) return null;
  return (
    <div className="mt-5">
      <div className="text-xs uppercase tracking-wider text-primary font-semibold">{title}</div>
      <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}

function Flashcards({ drugs }: { drugs: Drug[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (drugs.length === 0)
    return <div className="mt-6 glass-card p-10 text-center text-muted-foreground">Add drugs to your study list to start flashcards.</div>;
  const d = drugs[i % drugs.length];
  return (
    <div className="mt-6 max-w-xl mx-auto">
      <div onClick={() => setFlipped((f) => !f)}
        className="glass-card p-10 min-h-[260px] grid place-items-center text-center cursor-pointer hover:border-primary/40 transition">
        {!flipped ? (
          <div>
            <Sparkles className="mx-auto h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-bold">{d.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{d.generic_name}</div>
            <div className="text-xs text-muted-foreground mt-4">Click to flip</div>
          </div>
        ) : (
          <div className="w-full text-left">
            {flashcardFacts(d).map((fact) => (
              <div key={fact.label} className="mb-3 last:mb-0">
                <div className="text-xs font-semibold uppercase text-primary">{fact.label}</div>
                <div className="text-sm">{fact.value}</div>
              </div>
            ))}
            {flashcardFacts(d).length === 0 && (
              <p className="text-sm text-muted-foreground">No detail recorded for this medicine yet.</p>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between text-sm">
        <button onClick={() => { setI((p) => (p - 1 + drugs.length) % drugs.length); setFlipped(false); }} className="rounded-full glass px-4 py-2">← Prev</button>
        <div className="text-muted-foreground self-center">{(i % drugs.length) + 1} / {drugs.length}</div>
        <button onClick={() => { setI((p) => (p + 1) % drugs.length); setFlipped(false); }} className="rounded-full glass px-4 py-2">Next →</button>
      </div>
    </div>
  );
}
