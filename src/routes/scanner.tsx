import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine, Camera, Image as ImageIcon, Keyboard, Package, CreditCard, Receipt } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, LoadingSkeleton, ErrorState, SuccessBanner } from "@/components/dash";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — FreBob" },
      { name: "description", content: "Scan barcodes and receipts, or add records manually — all in one place." },
      { property: "og:title", content: "Scanner — FreBob" },
      { property: "og:description", content: "The fastest way to add sales, stock and receipts to your business." },
    ],
  }),
  component: Scanner,
});

type Mode = "camera" | "photo" | "manual";
type State = "idle" | "scanning" | "success" | "error";

function Scanner() {
  const [mode, setMode] = useState<Mode>("camera");
  const [state, setState] = useState<State>("idle");

  const start = () => {
    setState("scanning");
    setTimeout(() => setState("success"), 1400);
  };

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader
          eyebrow="Scanner"
          title="Add a business record"
          subtitle="Sale, stock in, payment or receipt"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SectionLabel>Capture</SectionLabel>
            <div className="rounded-[24px] border border-secondary bg-card overflow-hidden">
              <div className="flex border-b border-secondary/70">
                {(["camera", "photo", "manual"] as Mode[]).map((m) => {
                  const active = mode === m;
                  const Icon = m === "camera" ? Camera : m === "photo" ? ImageIcon : Keyboard;
                  return (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setState("idle"); }}
                      className={cn(
                        "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition",
                        active ? "text-primary border-b-2 border-primary bg-secondary/40" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {m === "camera" ? "Camera" : m === "photo" ? "Photo" : "Manual"}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {mode === "manual" ? (
                  <ManualForm onSubmit={() => { setState("success"); }} />
                ) : (
                  <div className="rounded-[20px] border border-dashed border-primary/25 bg-[var(--surface-tinted)] aspect-video flex flex-col items-center justify-center text-center p-6">
                    {state === "scanning" ? (
                      <>
                        <div className="relative">
                          <div className="h-16 w-16 rounded-2xl brand-gradient text-primary-foreground flex items-center justify-center shadow-elegant">
                            <ScanLine className="h-7 w-7" />
                          </div>
                          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping" />
                        </div>
                        <p className="mt-4 font-display font-bold">Scanning…</p>
                        <p className="text-xs text-muted-foreground mt-1">Hold steady for a moment</p>
                      </>
                    ) : state === "success" ? (
                      <>
                        <SuccessBanner title="Product recognised: Samsung A15 — ₦165,000" description="Choose what to do next." />
                      </>
                    ) : state === "error" ? (
                      <ErrorState onRetry={() => setState("idle")} message="Couldn't read the barcode. Try again in better light." />
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-2xl bg-card border border-secondary flex items-center justify-center text-primary">
                          {mode === "camera" ? <Camera className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                        </div>
                        <p className="mt-4 font-display font-bold">
                          {mode === "camera" ? "Point camera at a barcode" : "Upload a photo of a receipt"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          FreBob will read the details and add them to your records.
                        </p>
                        <Button className="mt-5" onClick={start}>
                          {mode === "camera" ? "Start scanning" : "Choose photo"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <SectionLabel>Quick add</SectionLabel>
            <div className="space-y-3">
              <QuickTile icon={Package} label="Add stock in" hint="Received from supplier" tone="primary" onClick={() => toast("Coming soon")} />
              <QuickTile icon={Receipt} label="Log a sale" hint="Walk-in or WhatsApp" onClick={() => toast("Coming soon")} />
              <QuickTile icon={CreditCard} label="Record payment" hint="Full or partial" onClick={() => toast("Coming soon")} />
            </div>

            <div className="mt-6 rounded-[20px] border border-secondary bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/50">Tips</p>
              <ul className="mt-2 text-sm text-foreground/85 space-y-1.5">
                <li>· Hold barcode 15–20cm from the camera.</li>
                <li>· For receipts, use plain background and good light.</li>
                <li>· Manual entry is always available if scanning fails.</li>
              </ul>
            </div>
          </div>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function QuickTile({ icon: Icon, label, hint, tone, onClick }: {
  icon: typeof Package; label: string; hint: string; tone?: "primary"; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-[20px] border p-4 text-left transition",
        tone === "primary"
          ? "border-primary/30 bg-[var(--surface-tinted)] shadow-elegant hover:border-primary/50"
          : "border-secondary bg-card hover:border-primary/25",
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
        tone === "primary" ? "brand-gradient text-primary-foreground" : "bg-secondary text-primary",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{hint}</p>
      </div>
    </button>
  );
}

function ManualForm({ onSubmit }: { onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="space-y-4"
    >
      <FormField label="Product">
        <input className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" placeholder="e.g. Samsung A15" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Quantity">
          <input type="number" className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" placeholder="1" />
        </FormField>
        <FormField label="Price (₦)">
          <input type="number" className="w-full h-11 px-3 rounded-xl border border-secondary bg-background text-sm focus:outline-none focus:border-primary/40" placeholder="0" />
        </FormField>
      </div>
      <Button type="submit" className="w-full">Save record</Button>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
