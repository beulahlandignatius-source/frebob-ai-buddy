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
  Check,
  Clock,
  CreditCard,
  Package,
  Wrench,
  ArrowUpRight,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/nav/AppShell";
import {
  dashboardMetrics,
  lowStock,
  recentActivities,
  greeting,
  fmt,
  DEMO_USER,
  type Activity,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
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

const SectionLabel = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-4">
    <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/40">
      {children}
    </h2>
    {right}
  </div>
);

const metricValueTone: Record<string, string> = {
  sales: "text-foreground",
  received: "text-[var(--success)]",
  outstanding: "text-accent",
  pending: "text-foreground",
};

const activityStyle: Record<
  Activity["type"],
  { icon: typeof Check; bg: string; fg: string }
> = {
  sale: { icon: Check, bg: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)]", fg: "text-[var(--success)]" },
  payment: { icon: CreditCard, bg: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)]", fg: "text-[var(--success)]" },
  order: { icon: Clock, bg: "bg-accent/15", fg: "text-accent" },
  restock: { icon: Package, bg: "bg-secondary", fg: "text-primary" },
  correction: { icon: Wrench, bg: "bg-secondary", fg: "text-primary" },
  customer: { icon: Package, bg: "bg-secondary", fg: "text-primary" },
};

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
      <div className="-mx-4 lg:-mx-8 -my-6 lg:-my-10 px-4 lg:px-8 py-6 lg:py-10 bg-[var(--surface-tinted)] min-h-[calc(100vh-0px)]">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60">
              {today}
            </p>
            <h1 className="mt-1 font-display text-[26px] sm:text-[32px] font-extrabold text-primary tracking-tight truncate">
              {greeting()}, {firstName}
            </h1>
            <p className="text-sm text-subtle-foreground truncate">{businessName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/notifications"
              className="relative h-10 w-10 rounded-full bg-card shadow-card flex items-center justify-center text-primary hover:shadow-soft transition"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
              )}
            </Link>
            <div
              className="h-10 w-10 rounded-full brand-gradient text-primary-foreground font-bold flex items-center justify-center ring-2 ring-white shadow-soft"
              aria-label="Profile"
            >
              {firstName.slice(0, 1)}
            </div>
          </div>
        </header>

        {/* Today at a Glance — AI glass panel */}
        <section className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 glass-card mb-8">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="mt-1 h-8 w-8 rounded-xl brand-gradient text-primary-foreground flex items-center justify-center shrink-0 shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-primary">Today at a Glance</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
                  AI recap
                </span>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">
                You've had <strong className="text-primary">8 orders</strong> today — sales up{" "}
                <strong className="text-[var(--success)]">+12%</strong> from yesterday.{" "}
                <span className="text-accent font-semibold">Samsung A15</span> is moving fast — only
                3 units left in stock.
              </p>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {dashboardMetrics.map((m) => (
            <Link
              key={m.key}
              to={m.linkTo}
              className="group bg-card p-4 sm:p-5 rounded-[20px] border border-secondary hover:border-primary/25 transition"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">
                {m.label}
              </p>
              <p
                className={cn(
                  "mt-2 font-display text-[22px] sm:text-[24px] font-extrabold tracking-tight leading-none",
                  metricValueTone[m.key] ?? "text-foreground",
                )}
              >
                {m.key === "pending" ? String(m.value).padStart(2, "0") : fmt(m.value)}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-subtle-foreground">
                {typeof m.changePct === "number" ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      m.changePct >= 0 ? "text-[var(--success)]" : "text-destructive",
                    )}
                  >
                    {m.changePct >= 0 ? "▲" : "▼"} {Math.abs(m.changePct)}%
                  </span>
                ) : (
                  <span>{m.sub}</span>
                )}
                <ArrowUpRight className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition" />
              </div>
            </Link>
          ))}
        </section>

        {/* Quick actions */}
        <section className="mb-8">
          <SectionLabel>Quick Actions</SectionLabel>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <button
              type="button"
              onClick={() => toast("Coming in a later batch")}
              className="col-span-3 sm:col-span-1 lg:col-span-2 flex flex-col justify-center gap-2 p-5 brand-gradient text-primary-foreground rounded-[20px] shadow-elegant hover:opacity-95 active:scale-[0.98] transition text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm font-extrabold leading-tight">
                  Add Business Record
                </p>
                <p className="text-[11px] text-white/70 mt-0.5">Sale, payment or expense</p>
              </div>
            </button>

            {[
              { icon: Boxes, label: "Inventory", tint: "bg-accent/10 text-accent", onClick: () => toast("Coming in a later batch") },
              { icon: ShoppingCart, label: "Orders", tint: "bg-secondary text-primary", onClick: () => toast("Coming in a later batch") },
              { icon: ScanLine, label: "Scanner", tint: "bg-secondary text-primary", onClick: () => toast("Coming in a later batch") },
              { icon: Sparkles, label: "Ask FreBob", tint: "bg-secondary text-primary", onClick: () => toast("Coming in a later batch") },
              { icon: BarChart3, label: "Reports", tint: "bg-secondary text-primary", to: "/reports" as const },
            ].map((a, i) => {
              const Icon = a.icon;
              const inner = (
                <>
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", a.tint)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">{a.label}</span>
                </>
              );
              const cls =
                "flex flex-col items-center justify-center gap-2 p-4 bg-card rounded-[20px] border border-secondary hover:border-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition";
              return a.to ? (
                <Link key={i} to={a.to} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button key={i} type="button" onClick={a.onClick} className={cls}>
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        {/* Stock + Activity */}
        <section className="grid gap-6 lg:grid-cols-5 mb-8">
          <div className="lg:col-span-2">
            <SectionLabel
              right={
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  {lowStock.length} items low
                </span>
              }
            >
              Stock Alerts
            </SectionLabel>
            <div className="bg-card rounded-[24px] border border-secondary overflow-hidden">
              {lowStock.map((item, i) => {
                const out = item.status === "out";
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-4",
                      i !== lowStock.length - 1 && "border-b border-secondary/70",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                      <p
                        className={cn(
                          "text-[11px] font-medium mt-0.5",
                          out ? "text-destructive" : "text-accent",
                        )}
                      >
                        {out ? "Out of stock" : `Only ${item.stock} ${item.unit} left`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast("Coming in a later batch")}
                      className={cn(
                        "px-4 py-1.5 text-[11px] font-bold rounded-full transition",
                        out
                          ? "bg-accent text-white hover:brightness-105"
                          : "bg-secondary text-primary hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      Restock
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <SectionLabel
              right={
                <Link
                  to="/reports"
                  className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline"
                >
                  See all
                </Link>
              }
            >
              Activity Feed
            </SectionLabel>
            <div className="space-y-2.5">
              {recentActivities.map((a) => {
                const s = activityStyle[a.type];
                const Icon = s.icon;
                const isMoneyIn = a.type === "payment" || a.type === "sale";
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 bg-card/80 hover:bg-card p-3.5 rounded-[16px] border border-transparent hover:border-secondary transition"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        s.bg,
                        s.fg,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {a.description}
                      </p>
                      <p className="text-[11px] text-subtle-foreground mt-0.5">{a.time}</p>
                    </div>
                    {typeof a.amount === "number" && (
                      <p
                        className={cn(
                          "font-display text-sm font-extrabold shrink-0",
                          isMoneyIn ? "text-[var(--success)]" : "text-accent",
                        )}
                      >
                        {isMoneyIn ? "+" : ""}
                        {fmt(a.amount)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer sign-out for prototype access */}
        <div className="text-center">
          <button
            type="button"
            className="text-xs text-subtle-foreground hover:text-foreground"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/signin" }); }}
          >
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
