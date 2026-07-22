import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  BarChart3,
  User,
  Brain,
  Boxes,
  ShoppingCart,
  Users,
  ScanLine,
  Bell,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type NavItem = { to?: string; label: string; icon: typeof LayoutDashboard; highlight?: boolean; soon?: boolean };

const mobileNav: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { label: "AI", icon: Sparkles, soon: true },
  { label: "Add", icon: Plus, highlight: true, soon: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { label: "Profile", icon: User, soon: true },
];

const desktopNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { label: "Business Memory", icon: Brain, soon: true },
  { label: "AI Assistant", icon: Sparkles, soon: true },
  { label: "Inventory", icon: Boxes, soon: true },
  { label: "Orders", icon: ShoppingCart, soon: true },
  { label: "Customers", icon: Users, soon: true },
  { label: "Scanner", icon: ScanLine, soon: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings, soon: true },
  { label: "Profile", icon: User, soon: true },
];

const notifySoon = () => toast("Coming in a later batch");

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <Logo size={32} />
          <span className="font-bold text-lg tracking-tight">FreBob</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {desktopNav.map((item, i) => {
            const Icon = item.icon;
            const active = !!item.to && pathname === item.to;
            const cls = cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition",
              active && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
            );
            if (item.to) {
              return (
                <Link key={i} to={item.to} className={cls} aria-label={item.label}>
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            }
            return (
              <button key={i} type="button" onClick={notifySoon} className={cn(cls, "w-full text-left")} aria-label={`${item.label} (coming soon)`}>
                <Icon className="h-4 w-4" /> {item.label}
                <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-64 pb-24 lg:pb-8 min-h-screen">
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-6 lg:py-10">{children}</div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-lg">
        <div className="grid grid-cols-5 h-16">
          {mobileNav.map((item, i) => {
            const Icon = item.icon;
            const active = !!item.to && pathname === item.to;
            const inner = (
              <>
                <span
                  className={cn(
                    "flex items-center justify-center",
                    item.highlight
                      ? "brand-gradient text-primary-foreground h-11 w-11 rounded-2xl shadow-elegant -mt-6"
                      : "h-6",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {!item.highlight && (
                  <span className={cn(active ? "text-primary font-semibold" : "")}>{item.label}</span>
                )}
              </>
            );
            const cls = "flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground";
            if (item.to) {
              return (
                <Link key={i} to={item.to} className={cls} aria-label={item.label}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={i} type="button" onClick={notifySoon} className={cls} aria-label={`${item.label} (coming soon)`}>
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
