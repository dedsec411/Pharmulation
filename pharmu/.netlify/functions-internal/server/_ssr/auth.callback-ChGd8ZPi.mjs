import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function safeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
function getOAuthError() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.get("error_description") || hash.get("error_description") || search.get("error") || hash.get("error");
}
function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let cancelled = false;
    async function finishSignIn() {
      const url = new URL(window.location.href);
      const next = safeNextPath(url.searchParams.get("next"));
      const providerError = getOAuthError();
      if (providerError) throw new Error(providerError);
      const code = url.searchParams.get("code");
      if (code) {
        const {
          error: exchangeError
        } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
      const {
        data,
        error: sessionError
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        throw new Error("Google sign-in finished, but no session was created.");
      }
      if (!cancelled) {
        navigate({
          to: next,
          replace: true
        });
      }
    }
    finishSignIn().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-screen place-items-center px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "glass-card w-full max-w-md p-8 text-center", children: !error ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-5 text-2xl font-bold", children: "Signing you in" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Finishing Google authentication..." })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-destructive", children: "Google sign-in failed" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground", children: "Back to sign in" })
  ] }) }) });
}
export {
  AuthCallbackPage as component
};
