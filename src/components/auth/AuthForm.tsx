import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Input } from "@/components/fb/Input";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnterDemoButton } from "@/components/demo/EnterDemoButton";
import { lovable } from "@/integrations/lovable";


type Channel = "email" | "phone";
type Step = "identify" | "verify";
export type AuthMode = "signin" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setGoogleLoading(false);
        setError(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) {
        // Browser redirected to Google — nothing else to do.
        return;
      }
      toast.success(isSignup ? "Account created" : "Signed in");
      navigate({ to: isSignup ? "/onboarding" : "/dashboard" });
    } catch (e) {
      setGoogleLoading(false);
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  };

  const identifier = channel === "email" ? email : phone;
  const isSignup = mode === "signup";

  const sendCode = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (isSignup && !name.trim()) return setError("Enter your name");
    if (channel === "email") {
      if (!email || !/\S+@\S+\.\S+/.test(email)) return setError("Enter a valid email");
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7) return setError("Enter a valid phone number");
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setCode("");
    setStep("verify");
    toast.success(
      channel === "email"
        ? `Magic link sent to ${email} (demo)`
        : `OTP sent to ${phone} (demo)`,
    );
  };

  const verify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (channel === "phone" && code.length !== 6) {
      return setError("Enter the 6-digit code");
    }
    // Persist the display name so the app greets the actual user, not "You".
    try {
      if (isSignup && name.trim()) {
        window.localStorage.setItem("frebob.userName", name.trim());
      }
      if (identifier) {
        window.localStorage.setItem(
          channel === "email" ? "frebob.userEmail" : "frebob.userPhone",
          identifier,
        );
      }
    } catch { /* ignore */ }
    toast.success(isSignup ? "Account created" : "Signed in");
    navigate({ to: isSignup ? "/onboarding" : "/dashboard" });
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_45%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_40%),var(--surface-tinted)]">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-md glass-card rounded-[32px] p-5 sm:p-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Logo size={48} />
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-foreground">Fre</span>
              <span className="text-accent">bob</span>
            </h1>
            <p className="text-xs text-muted-foreground">Smart Business Assistant for Every SME</p>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8">


          {step === "identify" ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                {isSignup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignup
                  ? "Start managing your business with FreBob in minutes."
                  : "Sign in to continue to your FreBob dashboard."}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
                <ChannelTab
                  active={channel === "email"}
                  onClick={() => { setChannel("email"); setError(null); }}
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                />
                <ChannelTab
                  active={channel === "phone"}
                  onClick={() => { setChannel("phone"); setError(null); }}
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                />
              </div>

              <form onSubmit={sendCode} className="mt-5 space-y-4">
                {isSignup && (
                  <Field label="Your name">
                    <Input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Amaka Okoye"
                    />
                  </Field>
                )}
                {channel === "email" ? (
                  <Field
                    label="Email address"
                    hint="We'll send you a magic sign-in link."
                    error={error ?? undefined}
                  >
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                    />
                  </Field>
                ) : (
                  <Field
                    label="Phone number"
                    hint="We'll text you a 6-digit code."
                    error={error ?? undefined}
                  >
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

                <Button type="submit" size="lg" loading={loading} className="w-full">
                  {channel === "email" ? "Send magic link" : "Send OTP code"}
                </Button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="mt-3 w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-card hover:bg-muted transition disabled:opacity-60 disabled:cursor-not-allowed focus-ring"
                aria-label={isSignup ? "Sign up with Google" : "Sign in with Google"}
              >
                <GoogleGlyph />
                {googleLoading
                  ? "Opening Google…"
                  : isSignup ? "Sign up with Google" : "Continue with Google"}
              </button>

              <EnterDemoButton
                variant="ghost"
                className="mt-3"
                label="Explore Demo"
                subtitle="Try FreBob with a sample Nigerian business — no account required."
              />
            </>

          ) : (
            <VerifyStep
              mode={mode}
              channel={channel}
              identifier={identifier}
              code={code}
              setCode={setCode}
              loading={loading}
              error={error}
              onSubmit={verify}
              onBack={() => { setStep("identify"); setError(null); }}
              onResend={sendCode as unknown as () => void}
            />
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          {isSignup ? (
            <>
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/signin" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">New to FreBob? </span>
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </>
          )}
        </p>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          By continuing you agree to FreBob's Terms & Privacy.
        </p>
      </div>
    </div>
  );
}

function ChannelTab({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active ? "bg-background text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.9 35.4 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function VerifyStep({
  mode, channel, identifier, code, setCode, loading, error, onSubmit, onBack, onResend,
}: {
  mode: AuthMode;
  channel: Channel;
  identifier: string;
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onResend: () => void;
}) {
  const [cooldown, setCooldown] = useState(30);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const isSignup = mode === "signup";

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="mt-3 text-2xl font-bold tracking-tight">
        {channel === "email" ? "Check your inbox" : "Enter your code"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {channel === "email" ? (
          <>We sent a magic sign-in link to <span className="font-medium text-foreground">{identifier}</span>.</>
        ) : (
          <>We sent a 6-digit code to <span className="font-medium text-foreground">{identifier}</span>.</>
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {channel === "phone" && (
          <Field label="6-digit code" error={error ?? undefined}>
            <Input
              ref={firstRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-lg tracking-[0.6em] font-semibold"
            />
          </Field>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {channel === "email"
            ? "I clicked the link"
            : isSignup ? "Verify & create account" : "Verify & sign in"}
        </Button>

        <button
          type="button"
          disabled={cooldown > 0}
          onClick={() => { setCooldown(30); onResend(); }}
          className="w-full text-center text-sm text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : channel === "email" ? "Resend magic link" : "Resend code"}
        </button>
      </form>

    </>
  );
}
