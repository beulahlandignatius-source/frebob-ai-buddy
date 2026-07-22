import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Brain,
  Check,
  Clock,
  CreditCard,
  Package,
  Wrench,
  ArrowUpRight,
  Plus,
  MessageCircle,
  ScanLine,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import { listApprovedRecords } from "@/lib/records-store";
import { listOrders, summariseOrders } from "@/lib/orders-store";
import { BobAvatar } from "@/components/copilot/BobAvatar";

import { supabase } from "@/integrations/supabase/client";
import {
  generateNotifications, unreadCount, criticalUnread,
  subscribe as subscribeNotif,
} from "@/lib/notifications-store";
import { NotificationBadge } from "@/components/notifications";
import { AppShell } from "@/components/nav/AppShell";
import {
  dashboardMetrics,
  recentActivities,
  greeting,
  fmt,
  DEMO_USER,
  type Activity,
  type Metric,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";
import { useDemo } from "@/lib/demo/context";
import { useTour } from "@/components/tour/GuidedTour";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FreBob" },
      { name: "description", content: "Track today's sales, payments and orders at a glance." },
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
  const { active: demoActive } = useDemo();
  const [firstName, setFirstName] = useState<string>(DEMO_USER.firstName);
  const [businessName, setBusinessName] = useState<string>(DEMO_USER.businessName);
  const [notifTick, setNotifTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    generateNotifications();
    const unsub = subscribeNotif(() => setNotifTick((t) => t + 1));
    return () => { unsub(); };
  }, []);
  void notifTick;
  const unread = mounted ? unreadCount() : 0;
  const critical = mounted ? criticalUnread()[0] : undefined;
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
  });

  const realOrders = mounted ? listOrders() : [];
  const realRecords = mounted ? listApprovedRecords() : [];
  const hasActivity = realRecords.length > 0 || realOrders.length > 0;
  const summary = summariseOrders(realOrders);

  const metrics: Metric[] = demoActive
    ? dashboardMetrics
    : [
        { key: "sales", label: "Today's Sales", value: summary.salesValue, sub: `${summary.total} orders`, linkLabel: "View", linkTo: "/reports" },
        { key: "received", label: "Money Received", value: summary.receivedValue, sub: "from paid orders", linkLabel: "View", linkTo: "/reports" },
        { key: "outstanding", label: "Outstanding Balance", value: summary.outstandingValue, sub: `${summary.pending + summary.reserved} open`, linkLabel: "View", linkTo: "/orders" },
        { key: "pending", label: "Pending Orders", value: summary.pending, sub: "awaiting delivery", linkLabel: "View", linkTo: "/orders" },
      ];
  const activities: Activity[] = demoActive ? recentActivities : [];


  useEffect(() => {
    // Prefer the name captured on signup, then Supabase user, then email prefix.
    try {
      const saved = window.localStorage.getItem("frebob.userName");
      if (saved) {
        const first = saved.trim().split(/\s+/)[0];
        if (first) setFirstName(first.charAt(0).toUpperCase() + first.slice(1));
      }
    } catch { /* ignore */ }
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      const full = (meta.full_name || meta.name || "").trim();
      if (full) {
        const first = full.split(/\s+/)[0];
        setFirstName(first.charAt(0).toUpperCase() + first.slice(1));
      } else if (data.user?.email) {
        try {
          const savedName = window.localStorage.getItem("frebob.userName");
          if (!savedName) {
            const raw = data.user.email.split("@")[0];
            setFirstName(raw.charAt(0).toUpperCase() + raw.slice(1));
          }
        } catch { /* ignore */ }
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
      <DemoHint hintKey="dashboard-v1" title="Your daily command centre">Metrics update from your orders and payments. Tap notifications to jump into stock and payment alerts.</DemoHint>
      <div className="-mx-4 lg:-mx-8 -my-6 lg:-my-10 px-4 lg:px-8 py-6 lg:py-10 bg-[var(--surface-tinted)] min-h-[calc(100dvh-0px)]">
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
              className="relative h-11 w-11 rounded-full bg-card shadow-card flex items-center justify-center text-primary hover:shadow-soft transition focus-ring"
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
              title={critical ? `${critical.title}` : undefined}
            >
              <Bell className="h-[18px] w-[18px]" />
              <NotificationBadge count={unread} />
            </Link>
            <Link
              to="/profile"
              className="h-11 w-11 rounded-full brand-gradient text-primary-foreground font-bold flex items-center justify-center ring-2 ring-white shadow-soft focus-ring"
              aria-label="Profile"
            >
              {firstName.slice(0, 1)}
            </Link>
          </div>
        </header>

        {demoActive && hasActivity ? (
          /* Today at a Glance — AI glass panel (demo only) */
          <section className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 glass-card mb-6">
            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <BobAvatar size="sm" className="mt-1" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-bold text-primary">Today at a Glance</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Bob's recap
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/85">
                  You've had <strong className="text-primary">8 orders</strong> today — sales up{" "}
                  <strong className="text-[var(--success)]">+12%</strong> from yesterday.{" "}
                  <Link to="/notifications" className="text-accent font-semibold underline underline-offset-2">
                    2 stock alerts
                  </Link>{" "}
                  need your attention.
                </p>
              </div>
            </div>
          </section>
        ) : !hasActivity ? (
          <GettingStarted firstName={firstName} businessName={businessName} />
        ) : null}

        {/* Metrics */}
        <section data-tour="dashboard-metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {metrics.map((m) => (
            <Link
              key={m.key}
              to={m.linkTo}
              className="group bg-card p-4 sm:p-5 rounded-[20px] border border-secondary hover:border-primary/25 transition focus-ring"
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

        {/* Quick access — Business Memory tile */}
        <section className="mb-8">
          <Link
            to="/business-memory"
            className="group flex items-center gap-4 rounded-[20px] border border-secondary bg-card p-4 sm:p-5 hover:border-primary/25 transition focus-ring"
          >
            <div className="h-11 w-11 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shrink-0 shadow-soft">
              <Brain className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-[15px] truncate">Business Memory</p>
              <p className="text-xs text-muted-foreground truncate">
                Every approved record, ready for Bob to answer from.
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary/50 group-hover:text-primary transition shrink-0" />
          </Link>
        </section>

        {/* Activity */}
        <section>
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
            Recent Activity
          </SectionLabel>
          {activities.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-secondary bg-card/60 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Once you add records or orders, they'll show up here.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link to="/add-record" className="inline-flex items-center gap-1 rounded-full brand-gradient text-primary-foreground px-3 py-1.5 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Add Record
                </Link>
                <Link to="/scanner" className="inline-flex items-center gap-1 rounded-full border border-secondary bg-card px-3 py-1.5 text-xs font-semibold text-primary">
                  Scan Document
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.slice(0, 5).map((a) => {
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
          )}
        </section>
      </div>
    </AppShell>
  );
}
