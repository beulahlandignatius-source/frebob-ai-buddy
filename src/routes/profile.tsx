import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, Award, LogOut, Camera } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, SuccessBanner, StatusBadge } from "@/components/dash";
import { DEMO_USER, fmt, orders, customers } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnterDemoButton } from "@/components/demo/EnterDemoButton";


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
  const [saved, setSaved] = useState<string | null>(null);

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const initials = DEMO_USER.firstName.slice(0, 1);

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
                <h2 className="font-display text-2xl font-extrabold text-primary truncate">{DEMO_USER.firstName} Okoye</h2>
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

        <div className="mt-6">
          <EnterDemoButton variant="ghost" label="Explore Demo Business" subtitle="See FreBob populated with a sample Nigerian SME" />
        </div>

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
