import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { N as Navbar } from "./Navbar-CYUOBZOZ.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import { c as create, p as persist } from "../_libs/zustand.mjs";
import { u as useAuthStore } from "./router-2sXgeX9i.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { t as toast } from "../_libs/sonner.mjs";
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
import "../_libs/lucide-react.mjs";
import "../_libs/framer-motion.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
const useSettings = create()(
  persist(
    (set) => ({
      soundEnabled: true,
      mentorTipsEnabled: true,
      timerWarningsEnabled: true,
      setSound: (v) => set({ soundEnabled: v }),
      setMentorTips: (v) => set({ mentorTipsEnabled: v }),
      setTimerWarnings: (v) => set({ timerWarningsEnabled: v })
    }),
    { name: "pharmaverse-settings" }
  )
);
function SettingsPage() {
  const s = useSettings();
  const {
    profile
  } = useAuthStore();
  const [name, setName] = reactExports.useState(profile?.full_name ?? "");
  const [password, setPassword] = reactExports.useState("");
  async function saveName() {
    if (!profile) return;
    const {
      error
    } = await supabase.from("profiles").update({
      full_name: name
    }).eq("user_id", profile.user_id);
    if (error) return toast.error(error.message);
    toast.success("Display name updated");
  }
  async function changePassword() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    const {
      error
    } = await supabase.auth.updateUser({
      password
    });
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setPassword("");
  }
  async function deleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    if (!profile) return;
    await supabase.from("profiles").delete().eq("user_id", profile.user_id);
    await supabase.auth.signOut();
    toast.success("Account deleted");
    window.location.href = "/";
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-2xl px-6 py-8 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/profile" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass-card p-6 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-bold", children: "Preferences" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Sound effects", desc: "Chimes for answers, level-ups and timers", checked: s.soundEnabled, onChange: s.setSound }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Mentor tips", desc: "Show tip popups during gameplay", checked: s.mentorTipsEnabled, onChange: s.setMentorTips }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Timer warnings", desc: "Audible ticking in the last 30 seconds", checked: s.timerWarningsEnabled, onChange: s.setTimerWarnings })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass-card p-6 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-bold", children: "Profile" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs text-muted-foreground", children: "Display name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: name, onChange: (e) => setName(e.target.value), className: "w-full rounded-xl glass px-4 py-2.5 outline-none" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveName, className: "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground", children: "Save" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass-card p-6 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-bold", children: "Change password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "New password", className: "w-full rounded-xl glass px-4 py-2.5 outline-none" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: changePassword, className: "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground", children: "Update" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass-card p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-bold text-destructive", children: "Danger zone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Permanently delete your account and all data." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: deleteAccount, className: "mt-3 rounded-full bg-destructive/20 text-destructive border border-destructive/40 px-5 py-2 text-sm font-semibold hover:bg-destructive/30", children: "Delete account" })
      ] })
    ] })
  ] });
}
function Toggle({
  label,
  desc,
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold text-sm", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: desc })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(!checked), className: `relative w-11 h-6 rounded-full transition ${checked ? "bg-primary" : "bg-white/15"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-5" : "left-0.5"}` }) })
  ] });
}
export {
  SettingsPage as component
};
