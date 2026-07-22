import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Input } from "@/components/fb/Input";
import { toast } from "sonner";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FreBob" },
      { name: "description", content: "Sign in to FreBob with your email or phone number." },
      { property: "og:title", content: "Sign in — FreBob" },
      { property: "og:description", content: "Access your AI-powered SME operations assistant." },
    ],
  }),
  component: AuthPage,
});

type Channel = "email" | "phone";
type Step = "identify" | "verify";

function AuthPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifier = channel === "email" ? email : phone;

  const sendCode = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (channel === "email") {
      if (!email || !/\S+@\S+\.\S+/.test(email)) return setError("Enter a valid email");
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7) return setError("Enter a valid phone number");
    }
    setLoading(true);
    // Mock delay
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
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    toast.success("Signed in (demo)");
    navigate({ to: "/onboarding" });
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

        <div className="rounded-3xl border border-border bg-card shadow-card p-6 sm:p-8">
          {step === "identify" ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">Welcome to FreBob</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in or create an account with your email or phone.
              </p>

              {/* Channel toggle */}
              <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
                <ChannelTab
                  active={channel === "email"}
                  onClick={() => {
                    setChannel("email");
                    setError(null);
                  }}
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                />
                <ChannelTab
                  active={channel === "phone"}
                  onClick={() => {
                    setChannel("phone");
                    setError(null);
                  }}
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                />
              </div>

              <form onSubmit={sendCode} className="mt-5 space-y-4">
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
                      autoFocus
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
                      autoFocus
                    />
                  </Field>
                )}

                <Button type="submit" size="lg" loading={loading} className="w-full">
                  {channel === "email" ? "Send magic link" : "Send OTP code"}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Demo mode — no real message is sent.
              </p>
            </>
          ) : (
            <VerifyStep
              channel={channel}
              identifier={identifier}
              code={code}
              setCode={setCode}
              loading={loading}
              error={error}
              onSubmit={verify}
              onBack={() => {
                setStep("identify");
                setError(null);
              }}
              onResend={sendCode as unknown as () => void}
            />
          )}
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

function ChannelTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-card"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function VerifyStep({
  channel,
  identifier,
  code,
  setCode,
  loading,
  error,
  onSubmit,
  onBack,
  onResend,
}: {
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
          <>
            We sent a magic sign-in link to{" "}
            <span className="font-medium text-foreground">{identifier}</span>.
          </>
        ) : (
          <>
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{identifier}</span>.
          </>
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
          {channel === "email" ? "I clicked the link" : "Verify & continue"}
        </Button>

        <button
          type="button"
          disabled={cooldown > 0}
          onClick={() => {
            setCooldown(30);
            onResend();
          }}
          className="w-full text-center text-sm text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : channel === "email"
              ? "Resend magic link"
              : "Resend code"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Demo mode — any input works. No real {channel === "email" ? "email" : "SMS"} is sent.
      </p>
    </>
  );
}
