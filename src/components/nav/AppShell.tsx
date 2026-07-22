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

const createActions: { to: string; label: string; icon: typeof Home }[] = [
  { to: "/add-record", label: "Add Business Record", icon: FileText },
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
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">

        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <Logo size={32} />
          <span className="font-bold text-lg tracking-tight">FreBob</span>
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
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                )}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 px-2 py-1">
            Help
          </p>
          <button
            onClick={() => start()}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition"
          >
            <PlayCircle className="h-4 w-4" /> Start Product Tour
          </button>
          {!demoActive && (
            <EnterDemoButton variant="inline" className="w-full justify-start px-3 py-2 rounded-xl hover:bg-sidebar-accent" />
          )}
          <a
            href="mailto:support@frebob.app"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition"
          >
            <HelpCircle className="h-4 w-4" /> Help Centre
          </a>
        </div>
      </aside>

      <main className="lg:pl-64 pb-24 lg:pb-8 min-h-screen">
        <DemoModeBanner />
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-6 lg:py-10">{children}</div>
      </main>

      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.tour}
                className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground min-h-11"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center",
                    item.highlight
                      ? "brand-gradient text-primary-foreground h-[52px] w-[52px] rounded-2xl shadow-elegant -mt-6"
                      : "h-6",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {!item.highlight && (
                  <span className={cn(active ? "text-primary font-semibold" : "")}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}


