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
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/dashboard", label: "AI", icon: Sparkles },
  { to: "/dashboard", label: "Add", icon: Plus, highlight: true },
  { to: "/dashboard", label: "Reports", icon: BarChart3 },
  { to: "/dashboard", label: "Profile", icon: User },
] as const;

const desktopNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard", label: "Business Memory", icon: Brain },
  { to: "/dashboard", label: "AI Assistant", icon: Sparkles },
  { to: "/dashboard", label: "Inventory", icon: Boxes },
  { to: "/dashboard", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard", label: "Customers", icon: Users },
  { to: "/dashboard", label: "Scanner", icon: ScanLine },
  { to: "/dashboard", label: "Reports", icon: BarChart3 },
  { to: "/dashboard", label: "Notifications", icon: Bell },
  { to: "/dashboard", label: "Settings", icon: Settings },
  { to: "/dashboard", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <Logo size={32} />
          <span className="font-bold text-lg tracking-tight">FreBob</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {desktopNav.map((item, i) => {
            const Icon = item.icon;
            const active = pathname === item.to && i === 0;
            return (
              <Link
                key={i}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-64 pb-24 lg:pb-8 min-h-screen">
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-6 lg:py-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/90 backdrop-blur-lg">
        <div className="grid grid-cols-5 h-16">
          {mobileNav.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={i}
                to={item.to}
                className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    "flex items-center justify-center",
                    item.highlight
                      ? "brand-gradient text-primary-foreground h-11 w-11 rounded-2xl shadow-elegant -mt-6"
                      : "h-6",
                  )}
                >
                  <Icon className={cn(item.highlight ? "h-5 w-5" : "h-5 w-5")} />
                </span>
                {!item.highlight && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
