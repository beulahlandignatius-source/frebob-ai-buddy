import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Camera, Sparkles, Shirt, ShoppingBag, UtensilsCrossed, Pill, Store, Scissors, Cpu, Sprout, MoreHorizontal, Globe, Languages, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select } from "@/components/fb/Input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { enterDemoMode } from "@/lib/demo/mode";

export const Route = createFileRoute("/business-setup")({
  head: () => ({
    meta: [
      { title: "Set up your business — FreBob" },
      { name: "description", content: "A quick 3-step setup so FreBob can start working for your business." },
      { property: "og:title", content: "Set up your business — FreBob" },
      { property: "og:description", content: "Three quick questions. Under two minutes. Then straight to your dashboard." },
    ],
  }),
  component: BusinessSetup,
});

/* ----- config ----- */

const BUSINESS_TYPES = [
  { key: "Fashion", label: "Fashion", icon: Shirt },
  { key: "Retail Shop", label: "Retail Shop", icon: ShoppingBag },
  { key: "Restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { key: "Pharmacy", label: "Pharmacy", icon: Pill },
  { key: "Supermarket", label: "Supermarket", icon: Store },
  { key: "Beauty", label: "Beauty", icon: Scissors },
  { key: "Electronics", label: "Electronics", icon: Cpu },
  { key: "Agriculture", label: "Agriculture", icon: Sprout },
  { key: "Other", label: "Other", icon: MoreHorizontal },
] as const;

const COUNTRIES = [
  { code: "NG", label: "Nigeria" },
  { code: "GH", label: "Ghana" },
  { code: "KE", label: "Kenya" },
  { code: "ZA", label: "South Africa" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "OTHER", label: "Other" },
];

const NG_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT — Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

const CURRENCIES = [
  { code: "NGN", label: "₦ Nigerian Naira", symbol: "₦" },
  { code: "USD", label: "$ US Dollar", symbol: "$" },
  { code: "GHS", label: "₵ Ghanaian Cedi", symbol: "₵" },
  { code: "KES", label: "KSh Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "R South African Rand", symbol: "R" },
  { code: "GBP", label: "£ British Pound", symbol: "£" },
];

const LANGUAGES = [
  { code: "english", label: "English", native: "English" },
  { code: "nigerian_pidgin", label: "Nigerian Pidgin", native: "Naija" },
  { code: "yoruba", label: "Yoruba", native: "Yorùbá" },
  { code: "hausa", label: "Hausa", native: "Hausa" },
  { code: "igbo", label: "Igbo", native: "Igbo" },
];

const DRAFT_KEY = "frebob:setup-draft:v2";

type Draft = {
  name: string;
  category: string;
  country: string;
  state: string;
  currency: string;
  language: string;
  timezone: string;
  step: number;
};

function loadDraft(): Draft {
  const tz = (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "") || "Africa/Lagos";
  const base: Draft = {
    name: "", category: "", country: "NG", state: "", currency: "NGN",
    language: "english", timezone: tz, step: 0,
  };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch { return base; }
}

/* ----- component ----- */

function BusinessSetup() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => loadDraft());
  const [step, setStep] = useState<number>(draft.step || 0);
  const [saving, setSaving] = useState(false);
  const [attempted1, setAttempted1] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Autosave to localStorage on every change.
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step })); } catch {}
  }, [draft, step]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const step1Valid = useMemo(
    () => draft.name.trim().length >= 2 && !!draft.category,
    [draft.name, draft.category],
  );

  const persist = async () => {
    if (!userId) return true; // best-effort — still let user proceed
    const { error } = await supabase.from("businesses").insert({
      owner_id: userId,
      name: draft.name.trim(),
      category: draft.category,
      country: COUNTRIES.find((c) => c.code === draft.country)?.label ?? null,
      state: draft.state || null,
      currency: draft.currency,
      settings: { language: draft.language, timezone: draft.timezone } as never,
    });
    if (error) { toast.error(error.message); return false; }
    await supabase
      .from("profiles")
      .update({ business_setup_completed: true })
      .eq("id", userId);
    return true;
  };

  const finishAnd = async (action: "dashboard" | "record" | "scan" | "demo") => {
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (!ok) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    toast.success("You're all set 🎉");
    if (action === "demo") { enterDemoMode(); navigate({ to: "/dashboard" }); return; }
    if (action === "record") { navigate({ to: "/add-record" }); return; }
    if (action === "scan") { navigate({ to: "/scanner/new" }); return; }
    navigate({ to: "/dashboard" });
  };

  const goNext = async () => {
    if (step === 0) {
      setAttempted1(true);
      if (!step1Valid) { toast.error("Add a business name and pick a type"); return; }
      setStep(1); return;
    }
    if (step === 1) { setStep(2); return; }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-dvh bg-background">
      {/* Ambient background — Deep Purple × Orange */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-10 pt-6 sm:max-w-2xl sm:px-8">
        {/* Header: logo + progress */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <Logo size={36} />
          <ProgressPill step={step} total={3} />
        </header>

        {/* Step surface */}
        <main className="flex-1">
          {step === 0 && (
            <Step1
              draft={draft}
              set={set}
              attempted={attempted1}
            />
          )}
          {step === 1 && <Step2 draft={draft} set={set} />}
          {step === 2 && <Step3 onPick={finishAnd} saving={saving} />}
        </main>

        {/* Footer nav */}
        <footer className="sticky bottom-0 mt-6 flex items-center gap-3 bg-gradient-to-t from-background via-background/95 to-background/0 pt-4">
          {step > 0 && step < 2 && (
            <Button variant="ghost" onClick={goBack} className="h-12 px-4">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step === 1 && (
            <Button variant="outline" onClick={() => finishAnd("dashboard")} className="h-12" disabled={saving}>
              Skip
            </Button>
          )}
          {step < 2 && (
            <Button
              onClick={goNext}
              className="h-12 flex-1 text-base font-semibold"
              disabled={saving}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </footer>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Autosaved · you can close this page and come back later
        </p>
      </div>
    </div>
  );
}

/* ---------- Progress ---------- */

function ProgressPill({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground">
        {Math.min(step + 1, total)} of {total}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i < step ? "w-4 bg-primary" : i === step ? "w-8 brand-gradient" : "w-4 bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 1 ---------- */

function Step1({
  draft, set, attempted,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  attempted: boolean;
}) {
  const nameErr = attempted && draft.name.trim().length < 2 ? "Add your business name" : undefined;
  const catErr = attempted && !draft.category ? "Pick a business type" : undefined;

  return (
    <section className="space-y-6">
      <StepHeader
        eyebrow="Step 1"
        title="Let's get to know your business"
        subtitle="Two quick details. You can polish everything else later in Settings."
        emoji="👋"
      />

      <Field label="Business name" error={nameErr}>
        <Input
          autoFocus
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Amaka Style Hub"
          maxLength={80}
          className="h-14 text-base"
          aria-invalid={!!nameErr}
        />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Business type</label>
          {catErr && <span className="text-xs text-destructive">{catErr}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {BUSINESS_TYPES.map(({ key, label, icon: Icon }) => {
            const active = draft.category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("category", key)}
                className={cn(
                  "group relative flex min-h-[92px] flex-col items-start justify-between rounded-2xl border p-3 text-left transition",
                  active
                    ? "border-primary/50 bg-primary/5 shadow-card"
                    : "border-secondary bg-card hover:border-primary/30 hover:shadow-card",
                )}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition",
                    active ? "brand-gradient text-primary-foreground" : "bg-secondary text-primary",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {active && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full brand-gradient text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Country">
          <Select value={draft.country} onChange={(e) => set("country", e.target.value)} className="h-12">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="State" hint="Optional">
          {draft.country === "NG" ? (
            <Select value={draft.state} onChange={(e) => set("state", e.target.value)} className="h-12">
              <option value="">Select state</option>
              {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          ) : (
            <Input
              value={draft.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="State or region"
              className="h-12"
            />
          )}
        </Field>
      </div>
    </section>
  );
}

/* ---------- Step 2 ---------- */

function Step2({
  draft, set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  return (
    <section className="space-y-6">
      <StepHeader
        eyebrow="Step 2"
        title="Set your preferences"
        subtitle="These help Bob speak your language and show money the right way."
        emoji="⚙️"
      />

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" /> Currency
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CURRENCIES.slice(0, 4).map((c) => {
            const active = draft.currency === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => set("currency", c.code)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                  active ? "border-primary/50 bg-primary/5" : "border-secondary bg-card hover:border-primary/30",
                )}
                aria-pressed={active}
              >
                <span className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-black",
                  active ? "brand-gradient text-primary-foreground" : "bg-secondary text-primary",
                )}>{c.symbol}</span>
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Languages className="h-4 w-4 text-primary" /> Language
        </div>
        <div className="space-y-2">
          {LANGUAGES.map((l) => {
            const active = draft.language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => set("language", l.code)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                  active ? "border-primary/50 bg-primary/5" : "border-secondary bg-card hover:border-primary/30",
                )}
                aria-pressed={active}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{l.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.native}</p>
                </div>
                <span className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  active ? "brand-gradient border-transparent text-primary-foreground" : "border-secondary bg-background",
                )}>
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-secondary bg-card p-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Time zone</p>
            <p className="truncate text-xs text-muted-foreground">Detected: {draft.timezone || "Africa/Lagos"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Step 3 ---------- */

function Step3({
  onPick, saving,
}: {
  onPick: (action: "dashboard" | "record" | "scan" | "demo") => void;
  saving: boolean;
}) {
  const actions = [
    { key: "record" as const, icon: FileText, title: "Add Business Record", desc: "Type or import a sale, order, or receipt." },
    { key: "scan"   as const, icon: Camera,   title: "Scan a Document",     desc: "Snap a receipt or invoice — Bob extracts the details." },
    { key: "demo"   as const, icon: Sparkles, title: "Explore Demo Business", desc: "See FreBob with Amaka's Style Hub sample data." },
  ];
  return (
    <section className="space-y-6">
      <StepHeader
        eyebrow="Step 3"
        title="You're ready to go"
        subtitle="Pick a starting point — or head straight to your dashboard."
        emoji="🚀"
      />

      <div className="space-y-3">
        {actions.map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            type="button"
            disabled={saving}
            onClick={() => onPick(key)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-secondary bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-card disabled:opacity-60"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:brand-gradient group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can always add products, customers and settings later.
      </p>

      <Button
        size="lg"
        onClick={() => onPick("dashboard")}
        loading={saving}
        className="h-14 w-full text-base font-semibold"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Go to Dashboard
      </Button>
    </section>
  );
}

/* ---------- Shared ---------- */

function StepHeader({
  eyebrow, title, subtitle, emoji,
}: { eyebrow: string; title: string; subtitle: string; emoji: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl brand-gradient text-2xl shadow-elegant sm:mx-0">
        <span aria-hidden>{emoji}</span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-black leading-tight text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
