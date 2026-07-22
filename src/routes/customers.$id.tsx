import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, StickyNote, Plus, Wallet, ShoppingBag, UserX } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Textarea } from "@/components/fb/Input";
import { PageCanvas, LoadingSkeleton, ErrorState } from "@/components/dash";
import { IntelligentEmptyState } from "@/components/empty/IntelligentEmptyState";
import { OrderCard, PaymentHistory } from "@/components/orders";
import {
  CustomerAvatar, CustomerStatusBadge, CustomerContactDetails,
  CustomerMetricsGrid, CustomerActivityTimeline, DetailSection,
} from "@/components/customers";
import {
  getCustomer, computeMetrics, primaryStatus, getCustomerOrders,
  buildTimeline, listNotes, addNote, formatMoney, languageLabel,
} from "@/lib/customers-store";

export const Route = createFileRoute("/customers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Customer — FreBob` },
      { name: "description", content: "View customer orders, payments and outstanding balances." },
      { property: "og:title", content: `Customer profile — FreBob` },
      { property: "og:description", content: `Customer ${params.id} profile in FreBob.` },
    ],
  }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [ui, setUi] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setUi("loading");
    setErrorMsg(null);
    try {
      // Local sync store — trigger a tick to force memoized reads and mark ready.
      setTick((t) => t + 1);
      setUi("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not load this customer.");
      setUi("error");
    }
  }, [id]);

  const customer = useMemo(() => { void tick; return getCustomer(id); }, [id, tick]);
  const metrics = useMemo(() => { void tick; return customer ? computeMetrics(id) : null; }, [id, tick, customer]);
  const orders = useMemo(() => { void tick; return customer ? getCustomerOrders(id) : []; }, [id, tick, customer]);
  const timeline = useMemo(() => { void tick; return customer ? buildTimeline(id) : []; }, [id, tick, customer]);
  const notes = useMemo(() => { void tick; return customer ? listNotes(id) : []; }, [id, tick, customer]);

  if (ui === "loading") {
    return <AppShell><PageCanvas><LoadingSkeleton rows={5} /></PageCanvas></AppShell>;
  }
  if (ui === "error") {
    return (
      <AppShell><PageCanvas>
        <ErrorState message={errorMsg ?? "Could not load this customer."} onRetry={() => setTick((t) => t + 1)} />
      </PageCanvas></AppShell>
    );
  }
  if (!customer || !metrics) {
    return (
      <AppShell>
        <PageCanvas>
          <IntelligentEmptyState
            icon={UserX}
            title="Customer not found"
            description="This customer profile may have been removed or hasn't synced to this device yet."
            primary={{ label: "Back to Customers", to: "/customers" }}
            demoCta={false}
          />
        </PageCanvas>
      </AppShell>
    );
  }

  const status = primaryStatus(customer, metrics);
  const allPayments = orders.flatMap((o) => o.payments);

  function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    addNote(id, noteDraft);
    setNoteDraft("");
    setTick((t) => t + 1);
    toast.success("Note added");
  }

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/customers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to customers
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <CustomerAvatar name={customer.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{customer.name}</h1>
              <CustomerStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.phone ?? "No phone"}
              {customer.preferredLanguage ? ` · Prefers ${languageLabel(customer.preferredLanguage)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/customers/$id/edit", params: { id } })}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" onClick={() => navigate({ to: "/add-record" })}>
              <Plus className="h-4 w-4 mr-1" /> Add order
            </Button>
          </div>
        </header>

        <DetailSection title="At a glance">
          <CustomerMetricsGrid metrics={metrics} />
        </DetailSection>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <DetailSection title="Orders">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center">
                  <ShoppingBag className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium mt-2">This customer does not have any recorded orders yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </DetailSection>

            <DetailSection title="Payments">
              {allPayments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-secondary bg-card p-6 text-center">
                  <Wallet className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium mt-2">No payments have been recorded for this customer.</p>
                  {metrics.hasBalance && (
                    <p className="text-xs text-muted-foreground mt-1">Outstanding balance: {formatMoney(metrics.outstanding)}</p>
                  )}
                </div>
              ) : (
                <PaymentHistory payments={allPayments} />
              )}
            </DetailSection>

            <DetailSection title="Activity">
              <CustomerActivityTimeline items={timeline} />
            </DetailSection>
          </div>

          <aside>
            <DetailSection title="Contact">
              <CustomerContactDetails c={customer} />
            </DetailSection>

            <DetailSection title="Notes" action={<StickyNote className="h-4 w-4 text-muted-foreground" />}>
              <form onSubmit={submitNote} className="space-y-2 mb-3">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note — payment terms, delivery instructions…"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!noteDraft.trim()}>Add note</Button>
                </div>
              </form>
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-2xl border border-secondary bg-card p-3">
                      <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {n.createdBy}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </aside>
        </div>
      </PageCanvas>
    </AppShell>
  );
}
