import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startGuestSession } from "@/lib/api/guest.functions";

/**
 * One click into the product, for somebody who has not signed up.
 *
 * The server hands back a token pair and the browser installs it as a normal
 * session, so everything downstream - the auth store, row-level security,
 * every query - behaves exactly as it does for a real account. Nothing else
 * in the app needs to know a guest is a guest.
 *
 * The account is pre-seeded with six weeks of history on purpose. A blank one
 * would open on "no cases yet" in every panel, and an empty product is a bad
 * demonstration of a product.
 */
export function GuestButton({
  className = "", label = "Try it as a guest",
}: { className?: string; label?: string }) {
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function start() {
    if (starting) return;
    setStarting(true);
    try {
      const result = await startGuestSession();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) {
        toast.error("Could not start the demo. Please sign in instead.");
        return;
      }
      // The previous visitor's answers are not this one's.
      await queryClient.invalidateQueries();
      toast.success("You are in the demo account", {
        description: "Everything works. Nothing you do here can break anything.",
      });
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("[guest]", error);
      toast.error("Could not start the demo. Please sign in instead.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={starting}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 active:scale-[0.98] disabled:opacity-60 sm:text-base ${className}`}
    >
      {starting
        ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        : <Play className="size-4" aria-hidden="true" />}
      {starting ? "Opening the demo..." : label}
    </button>
  );
}
