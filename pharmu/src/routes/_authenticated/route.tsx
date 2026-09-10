import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SittingBar } from "@/components/game/SittingBar";

/**
 * The gate in front of everything a signed-in learner sees.
 *
 * The check deliberately does NOT live in beforeLoad any more. Redirecting
 * from there changes which route the client matches, and the server has
 * already committed to a different one: it rendered the /dashboard branch,
 * the client rendered /login instead, and React answered with "Hydration
 * failed ... this tree will be regenerated on the client" and rebuilt the
 * whole page. Opening any authenticated link while signed out therefore
 * painted once, threw that away, and painted again.
 *
 * Doing it after mount keeps both sides matching the same route, so hydration
 * agrees and the redirect is an ordinary navigation afterwards.
 *
 * Routing off the local session is safe because it is not the security
 * boundary: row-level security in the database is, and it rejects an expired
 * or forged token whatever the client believes.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    // getSession reads what is already in memory rather than revalidating over
    // the network, so this settles in the same tick for a signed-in visitor.
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session?.user) setAllowed(true);
      else navigate({ to: "/login", replace: true });
    });
    return () => { alive = false; };
  }, [navigate]);

  // Nothing while the session is being read. It is a local read, so this is a
  // frame, not a spinner's worth of waiting - and rendering the page underneath
  // a signed-out visitor first would be a worse flash than none.
  if (!allowed) return null;

  return (
    <>
      {/* Nothing at all unless a timed assessment is running. */}
      <SittingBar />
      <Outlet />
    </>
  );
}
