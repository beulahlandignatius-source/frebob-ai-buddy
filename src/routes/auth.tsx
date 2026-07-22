import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Input } from "@/components/fb/Input";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FreBob" },
      { name: "description", content: "Sign in or create your FreBob account." },
      { property: "og:title", content: "Sign in — FreBob" },
      { property: "og:description", content: "Access your AI-powered SME operations assistant." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (mode !== "forgot" && password.length < 6)
      e.password = "At least 6 characters";
    if (mode === "register" && (!phone || phone.length < 7))
      e.phone = "Enter your phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { phone },
          },
        });
        if (error) throw error;
        toast.success("Account created! Let's set you up.");
        navigate({ to: "/onboarding" });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset link sent");
        setMode("login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-glow flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Logo size={48} />
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-foreground">Fre</span>
              <span className="text-accent">bob</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI Operations Assistant</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-soft p-6 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "login" && "Welcome back"}
            {mode === "register" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" && "Sign in to run your business with FreBob."}
            {mode === "register" && "Start turning conversations into business memory."}
            {mode === "forgot" && "We'll send you a reset link."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
              />
            </Field>

            {mode === "register" && (
              <Field label="Phone number" error={errors.phone}>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                />
              </Field>
            )}

            {mode !== "forgot" && (
              <Field label="Password" error={errors.password}>
                <Input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Continue
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Create account
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to FreBob's Terms & Privacy.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </p>
      </div>
    </div>
  );
}
