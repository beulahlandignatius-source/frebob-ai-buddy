import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Boxes,
  ShoppingCart,
  ScanLine,
  Sparkles,
  BarChart3,
  Sparkle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/nav/AppShell";
import {
  MetricCard,
  QuickActionCard,
  ActivityItem,
  InventoryAlertRow,
  PageHeader,
} from "@/components/dash";
import {
  dashboardMetrics,
  lowStock,
  recentActivities,
  greeting,
  DEMO_USER,
} from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FreBob" },
      { name: "description", content: "Track today's sales, payments, orders and stock at a glance." },
      { property: "og:title", content: "Dashboard — FreBob" },
      { property: "og:description", content: "Your calm command centre for daily business operations." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string>(DEMO_USER.firstName);
  const [businessName, setBusinessName] = useState<string>(DEMO_USER.businessName);
  const unread = 3;
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        const raw = data.user.email.split("@")[0];
        setFirstName(raw.charAt(0).toUpperCase() + raw.slice(1));
      }
      const uid = data.user?.id;
      if (uid) {
        const { data: b } = await supabase
          .from("businesses")
          .select("name")
          .eq("owner_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (b?.name) setBusinessName(b.name);
      }
    })();
  }, []);

  return (
    <AppShell>
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{today}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{businessName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/notifications"
            className="relative h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center hover:border-primary/30"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center px-1">
                {unread}
              </span>
            )}
          </Link>
          <div
            className="h-10 w-10 rounded-full brand-gradient text-primary-foreground font-semibold flex items-center justify-center"
            aria-label="Profile"
          >
            {firstName.slice(0, 1)}
          </div>
        </div>
      </div>

      {/* Today at a Glance */}
      <section className="glass-card rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-50 -z-10" />
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <Sparkle className="h-3.5 w-3.5" /> Today at a Glance
          <span className="ml-auto text-[10px] text-muted-foreground normal-case tracking-normal">
            Demo summary
          </span>
        </div>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">
          You recorded <strong>8 orders</strong> today. Total sales value is{" "}
          <strong>₦485,000</strong>. You received <strong>₦350,000</strong>, while{" "}
          <strong>₦135,000</strong> is still outstanding. <strong>Samsung A15</strong> is running low.
        </p>
      </section>

      {/* Metrics */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboardMetrics.map((m) => (
          <MetricCard
            key={m.key}
            label={m.label}
            value={m.value}
            changePct={m.changePct}
            sub={m.sub}
            linkLabel={m.linkLabel}
            linkTo={m.linkTo}
            isCurrency={m.key !== "pending"}
          />
        ))}
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickActionCard icon={Plus} label="Add Business Record" hint="Sale, payment, expense" primary onClick={() => toast("Coming in a later batch")} />
          <QuickActionCard icon={Boxes} label="View Inventory" hint="Stock & prices" onClick={() => toast("Coming in a later batch")} />
          <QuickActionCard icon={ShoppingCart} label="View Orders" hint="Open & completed" onClick={() => toast("Coming in a later batch")} />
          <QuickActionCard icon={ScanLine} label="Open Scanner" hint="Scan receipt or product" onClick={() => toast("Coming in a later batch")} />
          <QuickActionCard icon={Sparkles} label="Ask FreBob" hint="AI assistant" onClick={() => toast("Coming in a later batch")} />
          <QuickActionCard icon={BarChart3} label="View Reports" hint="Daily / weekly / monthly" to="/reports" />
        </div>
      </section>

      {/* Two column: Stock + Activity */}
      <section className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <PageHeader title="Stock Needing Attention" subtitle="Restock these before you run out." />
          <div className="space-y-3">
            {lowStock.map((it) => (
              <InventoryAlertRow key={it.id} item={it} onRestock={() => toast("Coming in a later batch")} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          <PageHeader title="Recent Activity" subtitle="Latest movements in your business." />
          <div className="rounded-2xl border border-border bg-card divide-y divide-border px-4">
            {recentActivities.map((a) => (
              <ActivityItem key={a.id} item={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer sign-out for prototype access */}
      <div className="mt-10 text-center">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/signin" }); }}
        >
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
