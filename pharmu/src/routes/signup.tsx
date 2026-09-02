import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-oauth";
import { BackButton } from "@/components/BackButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { joinCodeProblem, normaliseJoinCode } from "@/lib/educator/codes";
import { redeemJoinCode, stashJoinCode } from "@/lib/educator/join";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up - Pharmulation" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "graduate" | "educator">("student");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isEducator = role === "educator";
  // An educator creates classes rather than joining one, so a code they left
  // in the box before switching role must not be validated or redeemed.
  const codeProblem = isEducator ? null : joinCodeProblem(joinCode);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (codeProblem) return toast.error(codeProblem);

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);

    // The class is joined only if sign-up produced a session. Where the
    // project requires email confirmation it does not, so the code is kept
    // and redeemed the first time they reach the dashboard signed in - a
    // wrong code must never be what stops an account being created.
    const code = isEducator ? "" : normaliseJoinCode(joinCode);
    if (code) {
      if (data.session) {
        const joined = await redeemJoinCode(code);
        if (joined.ok) toast.success(`You joined ${joined.className}`);
        else toast.error("That join code did not match a class", {
          description: "Your account is ready. Ask your lecturer for the current code.",
        });
      } else {
        stashJoinCode(code);
      }
    }

    toast.success("Welcome to Pharmulation!");
    // Faculty land on their own side of the product, not the student one.
    navigate({ to: isEducator ? "/educator/dashboard" : "/dashboard" });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle("/dashboard");
    if (error) {
      setGoogleLoading(false);
      toast.error(error.message || "Google sign-up failed");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="fixed left-4 top-4 z-10">
        <BackButton to="/" />
      </div>
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8"
      >
        <Link to="/" className="text-2xl font-extrabold text-gradient-teal">Pharmulation</Link>
        <h1 className="mt-6 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start training in under a minute.</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 font-medium transition hover:border-primary/50 disabled:cursor-wait disabled:opacity-70 glass"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.83h5.32c-.23 1.43-1.66 4.2-5.32 4.2-3.2 0-5.81-2.65-5.81-5.93s2.61-5.93 5.81-5.93c1.82 0 3.04.78 3.74 1.45l2.55-2.46C16.71 4.7 14.6 3.8 12 3.8 6.97 3.8 2.9 7.87 2.9 12.9s4.07 9.1 9.1 9.1c5.25 0 8.73-3.69 8.73-8.89 0-.6-.06-1.05-.13-1.5z"/></svg>
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl px-4 py-3 outline-none focus:border-primary glass"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl px-4 py-3 outline-none focus:border-primary glass"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full rounded-xl px-4 py-3 outline-none focus:border-primary glass"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full rounded-xl px-4 py-3 outline-none focus:border-primary glass"
          >
            <option value="student" className="bg-card">Pharmacy Student</option>
            <option value="graduate" className="bg-card">Graduate Pharmacist</option>
            <option value="educator" className="bg-card">Educator / Faculty</option>
          </select>
          {isEducator ? (
            <p className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-xs text-muted-foreground">
              You will be able to create classes and hand out join codes as soon as you sign in.
            </p>
          ) : (
            <div>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Class join code (optional)"
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full rounded-xl px-4 py-3 font-mono tracking-[0.2em] outline-none glass ${
                  codeProblem ? "border-rose-400/60" : "focus:border-primary"
                }`}
              />
              <p className={`mt-1.5 px-1 text-xs ${codeProblem ? "text-rose-400" : "text-muted-foreground"}`}>
                {codeProblem ?? "Have one from your university? Enter it to join your class."}
              </p>
            </div>
          )}
          <button
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-primary">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
