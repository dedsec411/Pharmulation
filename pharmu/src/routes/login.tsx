import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — PharmaVerse" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (res.error) toast.error(res.error.message || "Google sign-in failed");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="fixed left-4 top-4 z-10">
        <BackButton to="/" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8"
      >
        <Link to="/" className="text-2xl font-extrabold text-gradient-teal">PharmaVerse</Link>
        <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>

        <button onClick={handleGoogle} className="mt-6 w-full rounded-full border border-border glass py-3 font-medium hover:border-primary/50 transition flex items-center justify-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.83h5.32c-.23 1.43-1.66 4.2-5.32 4.2-3.2 0-5.81-2.65-5.81-5.93s2.61-5.93 5.81-5.93c1.82 0 3.04.78 3.74 1.45l2.55-2.46C16.71 4.7 14.6 3.8 12 3.8 6.97 3.8 2.9 7.87 2.9 12.9s4.07 9.1 9.1 9.1c5.25 0 8.73-3.69 8.73-8.89 0-.6-.06-1.05-.13-1.5z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="w-full rounded-xl glass px-4 py-3 outline-none focus:border-primary" />
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="w-full rounded-xl glass px-4 py-3 outline-none focus:border-primary" />
          <button disabled={loading} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:scale-[1.02] transition disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="text-primary font-medium">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
