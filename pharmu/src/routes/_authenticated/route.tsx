import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SittingBar } from "@/components/game/SittingBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession reads the session already in memory; getUser makes a network
    // round trip to the auth server to revalidate it. This guard runs before
    // every navigation to every authenticated page, so getUser meant a visible
    // stall on each one - the page appearing to load, wait, then load again.
    //
    // Routing off the local session is safe because it is not the security
    // boundary: row-level security in the database is, and it rejects an
    // expired or forged token whatever the client believes.
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.session.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  return (
    <>
      {/* Nothing at all unless a timed assessment is running. */}
      <SittingBar />
      <Outlet />
    </>
  );
}
