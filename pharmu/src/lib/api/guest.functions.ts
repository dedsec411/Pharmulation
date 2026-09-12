import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Starting a demo session.
 *
 * Somebody who has walked up to a stand at a conference will not sign up to
 * see whether a product is worth seeing. This trades one shared account for
 * that friction being gone.
 *
 * The exchange happens on the server so the password never reaches the
 * browser bundle. The client gets back only the pair of tokens it needs to
 * install a session, which is what it would have got from signing in itself.
 *
 * The account is an ordinary student. It has no elevated rights, row-level
 * security confines it to its own rows exactly as for anybody else, and the
 * worst a visitor can do is play cases and change a display name that is
 * meant to be reset anyway.
 */

/**
 * The demo account, for the client-side checks that need to recognise it -
 * keeping it off the leaderboard, and letting the tour run for every visitor
 * rather than once per browser.
 *
 * It changes if the account is ever recreated, because Supabase assigns the id
 * and the admin API will not take one. Server-side checks key on GUEST_EMAIL
 * instead, which survives that.
 */
export const GUEST_USER_ID = "0365782b-d8d1-476f-b36a-5508dface7cf";

export type GuestSession =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; error: string };

export const startGuestSession = createServerFn({ method: "POST" })
  .handler(async (): Promise<GuestSession> => {
    const email = process.env.GUEST_EMAIL;
    const password = process.env.GUEST_PASSWORD;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!email || !password || !url || !key) {
      console.error("[guest] not configured: GUEST_EMAIL / GUEST_PASSWORD missing");
      return { ok: false, error: "The demo account is not set up on this server." };
    }

    // A throwaway client with no session persistence: this one exists to
    // exchange a password for tokens and nothing else, and must not disturb
    // whatever session the server already holds.
    const auth = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.error("[guest] sign-in failed:", error?.message);
      return { ok: false, error: "Could not start the demo. Please sign in instead." };
    }

    return {
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  });
