import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home, MessageCircle, Plus, BarChart3, User, Brain, Boxes,
  ShoppingCart, Users, ScanLine, Bell, Settings, HelpCircle, PlayCircle,
  LayoutDashboard, FileText, UserPlus, X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { useTour } from "@/components/tour/GuidedTour";
import { EnterDemoButton } from "@/components/demo/EnterDemoButton";
import { useDemo } from "@/lib/demo/context";
import { BusinessSwitcher } from "@/components/nav/BusinessSwitcher";

type NavItem = { to: string; label: string; icon: typeof Home; tour?: string };


// Centralized mobile bottom navigation. Order and items are locked per spec:
// Home, Chat, Create, Inventory, Reports. Do not modify without explicit request.
const mobileNav: (NavItem | { center: true })[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/ai-assistant", label: "Chat", icon: MessageCircle, tour: "nav-bob" },
  { center: true },
  { to: "/inventory", label: "Inventory", icon: Boxes, tour: "nav-inventory" },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

// Manual Record is intentionally NOT listed here — it lives inside
// Add Business Record only, per product spec.
const createActions: { to: string; label: string; icon: typeof Home }[] = [
  { to: "/add-record", label: "Add Business Record", icon: FileText },
  { to: "/business-memory", label: "Open Business Memory", icon: Brain },
  { to: "/orders", label: "Create Order", icon: ShoppingCart },
  { to: "/inventory", label: "Add Product", icon: Boxes },
  { to: "/customers/new", label: "Add Customer", icon: UserPlus },
  { to: "/scanner/new", label: "Scan Document", icon: ScanLine },
];



const desktopNav: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/ai-assistant", label: "Chat", icon: MessageCircle, tour: "nav-bob" },
  { to: "/business-memory", label: "Business Memory", icon: Brain, tour: "nav-memory" },
  { to: "/inventory", label: "Inventory", icon: Boxes, tour: "nav-inventory" },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { start } = useTour();
  const { active: demoActive } = useDemo();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { setCreateOpen(false); }, [pathname]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:shadow-elegant focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <aside className="hidden lg:flex fixed inset-y-4 left-4 w-64 flex-col liquid-glass rounded-3xl overflow-hidden">


        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/40">
          <Logo size={32} />
          <span className="font-bold text-lg tracking-tight">FreBob</span>
        </div>
        <div className="px-3 pt-3">
          <BusinessSwitcher className="w-full" />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {desktopNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.tour}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-sidebar-foreground liquid-press transition",
                  "hover:bg-white/50",
                  active && "bg-white/70 text-primary font-semibold shadow-card",
                )}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/40 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 px-2 py-1">
            Help
          </p>
          <button
            onClick={() => start()}
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-white/50 transition liquid-press"
          >
            <PlayCircle className="h-4 w-4" /> Start Product Tour
          </button>
          {!demoActive && (
            <EnterDemoButton variant="inline" className="w-full justify-start px-3 py-2 rounded-2xl hover:bg-white/50" />
          )}
          <a
            href="mailto:support@frebob.app"
            className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-white/50 transition"
          >
            <HelpCircle className="h-4 w-4" /> Help Centre
          </a>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="lg:pl-[19rem] pb-28 lg:pb-8 min-h-dvh focus:outline-none">
        <DemoModeBanner />
        <div className="lg:hidden px-4 pt-4">
          <BusinessSwitcher />
        </div>
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-6 lg:py-10">{children}</div>

      </main>

      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-3 inset-x-3 z-30 liquid-glass-strong rounded-[28px] px-2"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)", paddingTop: "4px" }}
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {mobileNav.map((item, idx) => {
            if ("center" in item) {
              return (
                <div key="center" className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    aria-label="Create"
                    aria-haspopup="dialog"
                    aria-expanded={createOpen}
                    data-tour="nav-add"
                    className="brand-gradient text-primary-foreground h-14 w-14 rounded-full shadow-elegant -mt-8 flex items-center justify-center liquid-press focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ring-4 ring-white/70"
                  >
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </div>
              );
            }
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to ?? idx}
                to={item.to}
                data-tour={item.tour}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] min-h-11 rounded-2xl mx-1 liquid-press",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className={cn(active ? "font-semibold" : "")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {createOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Create"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => setCreateOpen(false)}
          />
          <div
            className="absolute bottom-3 inset-x-3 liquid-glass-strong rounded-[28px] p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-foreground/15 mb-4" />
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-semibold">Create</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCreateOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/60 liquid-press"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {createActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.to + a.label}
                    to={a.to}
                    onClick={() => setCreateOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/60 transition min-h-12 liquid-press"
                  >
                    <span className="h-10 w-10 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shadow-card">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


