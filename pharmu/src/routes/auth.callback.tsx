import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in - Pharmulation" }] }),
  component: AuthCallbackPage,
});

function safeNextPath(value: string | null) {
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const url = new URL(window.location.href);
      const next = safeNextPath(url.searchParams.get("next"));
      const providerError = getOAuthError();

      if (providerError) throw new Error(providerError);

      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        throw new Error("Google sign-in finished, but no session was created.");
      }

      if (!cancelled) {
        navigate({ to: next as never, replace: true });
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

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass-card w-full max-w-md p-5 sm:p-8 text-center">
        {!error ? (
          <>
            <div className="mx-auto size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <h1 className="mt-5 text-2xl font-bold">Signing you in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Finishing Google authentication...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-destructive">Google sign-in failed</h1>
            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
