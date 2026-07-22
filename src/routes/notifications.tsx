import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckCheck, RefreshCcw, Search, Settings2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageHeader } from "@/components/dash";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  NotificationCard,
  NotificationFilter,
  NotificationSummaryCard,
  NotificationSettings,
  EmptyNotificationState,
  NotificationSkeleton,
  NotificationErrorState,
  type CategoryFilter, type PriorityFilter, type ReadFilter,
} from "@/components/notifications";
import {
  listNotifications, markRead, markUnread, markAllRead, dismiss, clearAll,
  generateNotifications, summarise, subscribe, groupOf, GROUP_LABEL,
  getSettings, setSettings,
  type Notification, type GroupKey,
} from "@/lib/notifications-store";
import { toast } from "sonner";
import { DemoHint } from "@/components/demo/DemoHint";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — FreBob" },
      { name: "description", content: "Every alert that needs your attention — inventory, orders, payments, scanner and more." },
      { property: "og:title", content: "Notifications — FreBob" },
      { property: "og:description", content: "Smart alerts prioritised so you know what to handle next." },
    ],
  }),
  component: NotificationsPage,
});

type ViewState = "ready" | "loading" | "error";

function useNotifStore() {
  return useSyncExternalStore(
    (fn) => subscribe(fn),
    () => JSON.stringify({ items: listNotifications(), summary: summarise() }),
    () => JSON.stringify({ items: [] as Notification[], summary: summarise() }),
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  useNotifStore(); // subscribe
  const items = listNotifications();
  const summary = summarise();
  const [settings, setSettingsState] = useState(getSettings());
  const [view, setView] = useState<ViewState>("ready");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [readState, setReadState] = useState<ReadFilter>("all");
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // First-load generation (idempotent)
    generateNotifications();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (category !== "all" && n.category !== category) return false;
      if (priority !== "all" && n.priority !== priority) return false;
      if (readState === "unread" && n.isRead) return false;
      if (readState === "read" && !n.isRead) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, category, priority, readState, query]);

  const groups = useMemo(() => {
    const buckets: Record<GroupKey, Notification[]> = {
      today: [], yesterday: [], this_week: [], this_month: [], older: [],
    };
    filtered.forEach((n) => buckets[groupOf(n.createdAt)].push(n));
    return buckets;
  }, [filtered]);

  const order: GroupKey[] = ["today", "yesterday", "this_week", "this_month", "older"];

  const handleOpen = (n: Notification) => {
    markRead(n.id);
    if (n.action) navigate({ to: n.action.href });
  };
  const handleRefresh = () => {
    const res = generateNotifications();
    toast(`Refreshed — ${res.total} active notification${res.total === 1 ? "" : "s"}.`);
  };
  const updateSettings = (patch: Partial<typeof settings>) => {
    setSettings(patch);
    setSettingsState(getSettings());
    toast("Notification preferences updated.");
  };

  return (
    <AppShell>
      <DemoHint hintKey="notifications-v1" title="Everything that needs you">Stock alerts, order updates and payment reminders live here. Dismiss what's handled to keep the list focused.</DemoHint>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={summary.unread > 0 ? `${summary.unread} unread • ${summary.critical} critical` : "You're all caught up."}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={summary.unread === 0}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings2 className="h-4 w-4 mr-1" /> Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification settings</DialogTitle>
                </DialogHeader>
                <NotificationSettings settings={settings} onChange={updateSettings} />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="mb-6">
        <NotificationSummaryCard summary={summary} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 rounded-full bg-card border border-border px-3 py-2 shadow-card">
          <Search className="h-4 w-4 text-subtle-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { clearAll(); toast("Cleared all notifications."); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="mb-6">
        <NotificationFilter
          category={category} onCategory={setCategory}
          priority={priority} onPriority={setPriority}
          readState={readState} onRead={setReadState}
        />
      </div>

      <div className="flex items-center gap-2 mb-4 lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setView("loading")}>Simulate loading</Button>
        <Button variant="ghost" size="sm" onClick={() => setView("error")}>Simulate error</Button>
      </div>

      {view === "loading" ? (
        <NotificationSkeleton rows={5} />
      ) : view === "error" ? (
        <NotificationErrorState onRetry={() => setView("ready")} />
      ) : items.length === 0 ? (
        <IntelligentEmptyState
          icon={Bell}
          title="No notifications yet"
          description="FreBob will notify you when something important needs your attention — stock alerts, order updates and payment reminders."
          primary={{ label: "Refresh", onClick: handleRefresh }}
          demoCta
        />
      ) : filtered.length === 0 ? (
        <EmptyNotificationState
          action={
            <Button size="sm" variant="ghost" onClick={() => { setCategory("all"); setPriority("all"); setReadState("all"); setQuery(""); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {order.map((g) =>
            groups[g].length === 0 ? null : (
              <section key={g}>
                <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-primary/50 mb-3">
                  {GROUP_LABEL[g]}
                </h2>
                <div className="space-y-3">
                  {groups[g].map((n) => (
                    <NotificationCard
                      key={n.id}
                      item={n}
                      onOpen={handleOpen}
                      onRead={markRead}
                      onUnread={markUnread}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </AppShell>
  );
}
