import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { N as Navbar } from "./Navbar-Cr9atqma.mjs";
import { u as useAuthStore } from "./router-BsXYMHWD.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { t as tierFor, x as xpProgress } from "./levels-7qe6_GyK.mjs";
import { M as MODE_LABEL } from "./shared-DDCPKmqL.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import { n as Target, o as Award, p as Clock, q as Flame, L as Lock, T as Trophy, r as Download } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
function cpdHoursFromCases(totalCases) {
  return Math.floor(totalCases / 10);
}
const CPD_MILESTONES = [10, 25, 50, 75, 100];
function nextCpdMilestone(hours) {
  return CPD_MILESTONES.find((m) => m > hours) ?? null;
}
async function generateCertificatePdf(opts) {
  const { jsPDF } = await import("../_libs/jspdf.mjs").then(function(n) {
    return n.j;
  });
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(0, 191, 165);
  doc.setLineWidth(3);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);
  doc.setTextColor(0, 191, 165);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Pharmulation", w / 2, 110, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("Continuing Professional Development", w / 2, 135, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.text("Certificate of Achievement", w / 2, 210, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("This is to certify that", w / 2, 260, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(0, 191, 165);
  doc.text(opts.fullName, w / 2, 305, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 200, 220);
  doc.text("has successfully earned", w / 2, 340, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(`${opts.hours} CPD Credit Hours`, w / 2, 380, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 220);
  doc.text(
    "through interactive pharmacy training simulations on Pharmulation.",
    w / 2,
    405,
    { align: "center" }
  );
  const dateStr = opts.issuedAt.toLocaleDateString(void 0, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  doc.setFontSize(10);
  doc.text(`Issued: ${dateStr}`, 80, h - 70);
  doc.text(`Certificate ID: ${opts.certId}`, 80, h - 54);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 191, 165);
  doc.text("✓ Verified by Pharmulation", w - 80, h - 60, { align: "right" });
  return doc;
}
function ProfilePage() {
  const {
    profile
  } = useAuthStore();
  const userId = profile?.user_id;
  const [tab, setTab] = reactExports.useState("overview");
  const [downloadingCertId, setDownloadingCertId] = reactExports.useState(null);
  const {
    data: scores = []
  } = useQuery({
    queryKey: ["my-scores", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from("scores").select("*").eq("user_id", userId).order("completed_at", {
        ascending: false
      });
      return data ?? [];
    },
    enabled: !!userId
  });
  const {
    data: allBadges = []
  } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => (await supabase.from("badges").select("*").order("name")).data ?? []
  });
  const {
    data: earnedBadges = []
  } = useQuery({
    queryKey: ["my-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId);
      return data ?? [];
    },
    enabled: !!userId
  });
  const {
    data: certs = [],
    refetch: refetchCerts
  } = useQuery({
    queryKey: ["certs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from("cpd_certificates").select("*").eq("user_id", userId).order("issued_at", {
        ascending: false
      });
      return data ?? [];
    },
    enabled: !!userId
  });
  if (!profile) return null;
  const tier = tierFor(profile.xp);
  const prog = xpProgress(profile.xp);
  const cpdHours = cpdHoursFromCases(profile.total_cases_completed);
  const nextMs = nextCpdMilestone(cpdHours);
  const earnedMap = new Map(earnedBadges.map((b) => [b.badge_id, b.earned_at]));
  const byMode = {};
  scores.forEach((s) => {
    byMode[s.mode] = (byMode[s.mode] ?? 0) + 1;
  });
  const maxMode = Math.max(1, ...Object.values(byMode));
  async function claimCertificate(hours) {
    if (!userId) return;
    const existing = certs.find((c) => c.hours_earned === hours);
    if (existing) {
      await downloadCert(profile.full_name || "Pharmacist", hours, new Date(existing.issued_at), existing.id);
      return;
    }
    const {
      data,
      error
    } = await supabase.from("cpd_certificates").insert({
      user_id: userId,
      hours_earned: hours
    }).select("id, issued_at").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`🎓 You've earned a ${hours} hour CPD Certificate!`);
    refetchCerts();
    await downloadCert(profile.full_name || "Pharmacist", hours, new Date(data.issued_at), data.id);
  }
  async function downloadCert(name, hours, issuedAt, certId) {
    setDownloadingCertId(certId);
    try {
      const doc = await generateCertificatePdf({
        fullName: name,
        hours,
        issuedAt,
        certId
      });
      doc.save(`pharmaverse-cpd-${hours}h.pdf`);
    } finally {
      setDownloadingCertId(null);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-5xl px-6 py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/dashboard" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 10
      }, animate: {
        opacity: 1,
        y: 0
      }, className: "glass-card p-6 flex flex-col md:flex-row items-center gap-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-20 w-20 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-3xl font-bold", children: (profile.full_name || "U").slice(0, 1).toUpperCase() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-center md:text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: profile.full_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: profile.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-2 justify-center md:justify-start", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs rounded-full bg-primary/20 text-primary px-3 py-1 font-semibold", children: tier.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs rounded-full bg-white/10 px-3 py-1 capitalize", children: profile.role })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center md:text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-extrabold text-primary", children: [
            profile.xp.toLocaleString(),
            " XP"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: prog.next ? `${prog.next.min - profile.xp} XP to ${prog.next.title}` : "Max tier reached" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-2 w-48 rounded-full bg-white/10 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { className: "h-full bg-gradient-to-r from-primary to-cyan-400", initial: {
            width: 0
          }, animate: {
            width: `${prog.pct}%`
          }, transition: {
            duration: 1
          } }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 flex gap-1 glass rounded-full p-1 text-sm w-fit mx-auto", children: ["overview", "badges", "history", "certificates"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-5 py-1.5 rounded-full capitalize transition ${tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`, children: t }, t)) }),
      tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-4", children: [{
          icon: Target,
          label: "Cases completed",
          value: profile.total_cases_completed
        }, {
          icon: Award,
          label: "Accuracy",
          value: `${Math.round(profile.accuracy_rate)}%`
        }, {
          icon: Clock,
          label: "Avg time / case",
          value: `${Math.round(profile.avg_time_per_case)}s`
        }, {
          icon: Flame,
          label: "Streak",
          value: `${profile.streak_days} days`
        }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(s.icon, { className: "mx-auto h-5 w-5 text-primary mb-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-bold", children: s.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 glass-card p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold mb-4", children: "Cases by mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: ["rx", "otc", "hospital", "oncology", "cosmetic", "emergency", "industry", "warehousing"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-24 text-sm text-muted-foreground", children: MODE_LABEL[m] ?? m }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-2 rounded-full bg-white/10 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-primary", style: {
              width: `${(byMode[m] ?? 0) / maxMode * 100}%`
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 text-right text-sm", children: byMode[m] ?? 0 })
          ] }, m)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 glass-card p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold", children: "CPD Hours" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "1 hour earned per 10 cases completed." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-extrabold text-primary", children: [
              cpdHours,
              " / 100"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-2 rounded-full bg-white/10 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-to-r from-primary to-cyan-400", style: {
            width: `${Math.min(100, cpdHours)}%`
          } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2", children: CPD_MILESTONES.map((m) => {
            const unlocked = cpdHours >= m;
            const claimed = certs.some((c) => c.hours_earned === m);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: !unlocked, onClick: () => claimCertificate(m), className: `text-xs rounded-xl py-3 transition ${unlocked ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-white/5 text-muted-foreground"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold text-base", children: [
                m,
                "h"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: claimed ? "📜 Download" : unlocked ? "🎓 Claim" : /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3 inline" }) })
            ] }, m);
          }) }),
          nextMs && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: [
            "Next milestone: ",
            nextMs,
            "h (",
            (nextMs - cpdHours) * 10,
            " more cases)"
          ] })
        ] })
      ] }),
      tab === "badges" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid sm:grid-cols-2 md:grid-cols-3 gap-4", children: allBadges.map((b) => {
        const earned = earnedMap.get(b.id);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { whileHover: {
          scale: 1.02
        }, className: `glass-card p-5 text-center ${earned ? "border-primary/40" : "opacity-60"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-4xl mb-2 ${earned ? "" : "grayscale"}`, children: b.icon || "🏅" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold", children: b.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: b.description }),
          earned ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-[10px] text-primary uppercase", children: [
            "Earned ",
            new Date(earned).toLocaleDateString()
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-[10px] text-muted-foreground flex items-center justify-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3" }),
            " Locked"
          ] })
        ] }, b.id);
      }) }),
      tab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 glass-card overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left p-3", children: "Mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right p-3", children: "Score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right p-3", children: "Accuracy" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right p-3", children: "Time" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          scores.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/50 hover:bg-white/5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: new Date(s.completed_at).toLocaleDateString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3", children: MODE_LABEL[s.mode] ?? s.mode }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-3 text-right font-bold text-primary", children: s.score }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-3 text-right", children: [
              Math.round(s.accuracy * 100),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-3 text-right", children: [
              s.time_taken,
              "s"
            ] })
          ] }, s.id)),
          scores.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "p-10 text-center text-muted-foreground", children: "No cases played yet." }) })
        ] })
      ] }) }),
      tab === "certificates" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 space-y-3", children: [
        certs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-10 text-center text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "h-8 w-8 mx-auto mb-2 text-primary" }),
          "Complete more cases to earn your first CPD certificate."
        ] }),
        certs.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-5 flex items-center gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-4xl", children: "🎓" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold", children: [
              c.hours_earned,
              " CPD Credit Hours"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
              "Issued ",
              new Date(c.issued_at).toLocaleDateString(),
              " · ID ",
              c.id.slice(0, 8)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: downloadingCertId === c.id, onClick: () => downloadCert(profile.full_name || "Pharmacist", c.hours_earned, new Date(c.issued_at), c.id), className: "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
            " PDF"
          ] })
        ] }, c.id))
      ] })
    ] })
  ] });
}
export {
  ProfilePage as component
};
