import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useAuthStore, L as LogoVideo } from "./router-kIoM_65U.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { J as User, K as LogOut } from "../_libs/lucide-react.mjs";
function Navbar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = reactExports.useState(false);
  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }
  const initials = (profile?.full_name || profile?.email || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const isAdmin = profile?.role === "admin";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "sticky top-0 z-40 glass border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex h-24 max-w-7xl items-center justify-between px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/dashboard", className: "flex h-20 w-60 items-center overflow-visible rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:drop-shadow-[0_16px_34px_oklch(0.74_0.14_180/0.28)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogoVideo, { className: "aspect-video w-full" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:flex items-center gap-1 text-sm", children: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/modes", label: "Modes" },
      { to: "/drugs", label: "Drug DB" },
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/profile", label: "Profile" }
    ].map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: l.to,
        className: "rounded-full border border-transparent px-4 py-2 text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]",
        activeProps: { className: "rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-primary shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]" },
        children: l.label
      },
      l.to
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setOpen((o) => !o),
          className: "flex items-center gap-2 rounded-full glass px-3 py-1.5 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold", children: initials }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:block text-sm", children: profile?.full_name || "Pharmacist" })
          ]
        }
      ),
      open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-0 mt-2 w-48 glass-card p-1 text-sm z-50 shadow-[0_22px_55px_-30px_oklch(0.74_0.14_180/0.8)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/profile", onClick: () => setOpen(false), className: "flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4" }),
          " Profile"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/settings", onClick: () => setOpen(false), className: "flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]", children: "⚙️ Settings" }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/admin", onClick: () => setOpen(false), className: "flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)] text-primary", children: "🛡️ Admin" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: signOut, className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)] text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }),
          " Sign out"
        ] })
      ] })
    ] })
  ] }) });
}
export {
  Navbar as N
};
