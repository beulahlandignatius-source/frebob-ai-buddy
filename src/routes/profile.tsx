import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Mail, Phone, MapPin, Award, LogOut, Camera, Globe2,
  PlayCircle, HelpCircle, Bell, Settings as SettingsIcon,
  ShoppingCart, Users, ScanLine, Brain,
} from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, SuccessBanner, StatusBadge } from "@/components/dash";
import { DEMO_USER, fmt, orders as demoOrders, customers as demoCustomers } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnterDemoButton } from "@/components/demo/EnterDemoButton";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useTour } from "@/components/tour/GuidedTour";
import { useDemo } from "@/lib/demo/context";



export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — FreBob" },
      { name: "description", content: "Your FreBob account, business summary and lifetime stats." },
      { property: "og:title", content: "Profile — FreBob" },
      { property: "og:description", content: "Everything about you and your business at a glance." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { start: startTour } = useTour();
  const [saved, setSaved] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>(DEMO_USER.firstName);

  useEffect(() => {
    try {
      const n = window.localStorage.getItem("frebob.userName");
      if (n && n.trim()) setDisplayName(n.trim());
    } catch { /* ignore */ }
  }, []);

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const initials = displayName.slice(0, 1).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast("Signed out");
    navigate({ to: "/signin" });
  };

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader eyebrow="Profile" title="Your account" subtitle="You and your business" />

        {saved && <div className="mb-4"><SuccessBanner title={saved} onDismiss={() => setSaved(null)} /></div>}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[24px] p-6 glass-card mb-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-3xl brand-gradient text-primary-foreground text-3xl font-extrabold flex items-center justify-center shadow-elegant ring-4 ring-white">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => toast("Photo upload coming soon")}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card border border-secondary text-primary flex items-center justify-center shadow-soft"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-extrabold text-primary truncate">{displayName}</h2>
                <StatusBadge tone="success">Verified</StatusBadge>
              </div>
              <p className="text-sm text-subtle-foreground truncate">{DEMO_USER.businessName}</p>
              <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> chinedu@alabasmart.ng</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> 0803 111 2233</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Alaba Market, Lagos</span>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setSaved("Profile changes saved."); }}>Edit</Button>
          </div>
        </section>

        <SectionLabel>Lifetime</SectionLabel>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatBox label="Orders" value={String(orders.length)} />
          <StatBox label="Customers" value={String(customers.length)} />
          <StatBox label="Sales value" value={fmt(totalSales)} />
          <StatBox label="Loyalty tier" value="Gold" icon={Award} />
        </section>

        <SectionLabel>Business setup</SectionLabel>
        <section className="rounded-[24px] border border-secondary bg-card divide-y divide-secondary/70">
          <SetupRow label="Business details" status="done" />
          <SetupRow label="Initial products added" status="done" />
          <SetupRow label="Payment channels" status="pending" />
          <SetupRow label="Team members invited" status="pending" />
        </section>

        <SectionLabel>Language</SectionLabel>
        <section className="rounded-[20px] border border-secondary bg-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-sm flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary/70" /> App language
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Switch between English, Naija Pidgin, Yoruba, Hausa or Igbo. Turn on auto-translate to render every screen in your language.
            </p>
          </div>
          <LanguageSelector />
        </section>

        <div className="mt-2">
          <EnterDemoButton variant="ghost" label="Explore Demo Business" subtitle="See FreBob populated with a sample Nigerian SME" />
        </div>

        <SectionLabel>Quick access</SectionLabel>
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { to: "/orders", label: "Orders", icon: ShoppingCart },
            { to: "/customers", label: "Customers", icon: Users },
            { to: "/scanner", label: "Scanner", icon: ScanLine },
            { to: "/business-memory", label: "Business Memory", icon: Brain },
            { to: "/notifications", label: "Notifications", icon: Bell },
            { to: "/settings", label: "Settings", icon: SettingsIcon },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-start gap-2 rounded-[18px] border border-secondary bg-card p-4 hover:border-primary/25 transition focus-ring min-h-[88px]"
            >
              <span className="h-9 w-9 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shadow-soft">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </section>

        <SectionLabel>Help</SectionLabel>
        <section className="rounded-[20px] border border-secondary bg-card divide-y divide-secondary/70 mb-6">
          <button
            type="button"
            onClick={() => startTour()}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition"
          >
            <span className="h-10 w-10 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shrink-0">
              <PlayCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Start Product Tour</span>
              <span className="block text-xs text-muted-foreground">
                A guided walkthrough of every FreBob screen.
              </span>
            </span>
          </button>
          <a
            href="mailto:support@frebob.app"
            className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition"
          >
            <span className="h-10 w-10 rounded-2xl bg-secondary text-primary flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Help Centre</span>
              <span className="block text-xs text-muted-foreground">
                Reach out to support@frebob.app for questions or feedback.
              </span>
            </span>
          </a>
        </section>

        <div className="mt-8 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">FreBob · your smart business assistant</p>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>

      </PageCanvas>
    </AppShell>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Award }) {
  return (
    <div className="bg-card p-4 rounded-[20px] border border-secondary">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">{label}</p>
        {Icon && <div className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><Icon className="h-3.5 w-3.5" /></div>}
      </div>
      <p className="mt-2 font-display text-[20px] font-extrabold tracking-tight leading-none truncate">{value}</p>
    </div>
  );
}

function SetupRow({ label, status }: { label: string; status: "done" | "pending" }) {
  return (
    <div className="flex items-center justify-between p-4">
      <p className="text-sm font-medium">{label}</p>
      <StatusBadge tone={status === "done" ? "success" : "warning"}>
        {status === "done" ? "Complete" : "Pending"}
      </StatusBadge>
    </div>
  );
}
