import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import {
  PageHeader, PeriodTabs, NotificationRow, EmptyState, LoadingSkeleton, ErrorState,
} from "@/components/dash";
import { notifications as seed, type NotificationItem } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — FreBob" },
      { name: "description", content: "Alerts about inventory, payments, orders and system events." },
      { property: "og:title", content: "Notifications — FreBob" },
      { property: "og:description", content: "Stay on top of what needs your attention today." },
    ],
  }),
  component: NotificationsPage,
});

type Cat = "all" | NotificationItem["category"];
type ViewState = "ready" | "loading" | "error";

function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(seed);
  const [cat, setCat] = useState<Cat>("all");
  const [view, setView] = useState<ViewState>("ready");

  const filtered = useMemo(
    () => (cat === "all" ? items : items.filter((n) => n.category === cat)),
    [items, cat],
  );

  const markRead = (id: string) =>
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setItems((xs) => xs.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setItems((xs) => xs.filter((n) => n.id !== id));
  const open = (id: string) => { markRead(id); toast("Opened notification"); };

  const unread = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up."}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("loading")}>Simulate loading</Button>
            <Button variant="ghost" size="sm" onClick={() => setView("error")}>Simulate error</Button>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          </div>
        }
      />

      <div className="mb-5 overflow-x-auto -mx-4 px-4">
        <PeriodTabs
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "All" },
            { value: "inventory", label: "Inventory" },
            { value: "payment", label: "Payments" },
            { value: "order", label: "Orders" },
            { value: "system", label: "System" },
          ]}
        />
      </div>

      {view === "loading" ? (
        <LoadingSkeleton rows={4} />
      ) : view === "error" ? (
        <ErrorState onRetry={() => setView("ready")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nothing here yet"
          description="New alerts about inventory, payments and orders will appear here."
          action={<Button variant="outline" size="sm" onClick={() => setItems(seed)}>Reset demo</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              onOpen={open}
              onRead={markRead}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
