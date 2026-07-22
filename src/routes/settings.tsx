import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Globe, Lock, Store, Palette, HelpCircle, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { PageCanvas, SurfaceHeader, SectionLabel, SuccessBanner } from "@/components/dash";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FreBob" },
      { name: "description", content: "Manage your business preferences, notifications, language and security." },
      { property: "og:title", content: "Settings — FreBob" },
      { property: "og:description", content: "Everything you need to tune FreBob to your business." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [saved, setSaved] = useState<string | null>(null);
  const [notif, setNotif] = useState({ orders: true, stock: true, payments: true, marketing: false });
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("₦ Naira");

  const flip = (k: keyof typeof notif) => {
    setNotif((n) => ({ ...n, [k]: !n[k] }));
    setSaved("Notification preferences updated.");
  };

  return (
    <AppShell>
      <PageCanvas>
        <SurfaceHeader eyebrow="Settings" title="Preferences" subtitle="Tune FreBob to how you work" />

        {saved && <div className="mb-4"><SuccessBanner title={saved} onDismiss={() => setSaved(null)} /></div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card icon={Store} title="Business profile" hint="Name, category, address">
            <Row label="Business name" value="Alaba Smart Electronics" />
            <Row label="Category" value="Electronics & Phones" />
            <Row label="Address" value="Shop 12, Alaba Market, Lagos" />
            <Button variant="outline" size="sm" className="mt-3" onClick={() => toast("Edit profile coming soon")}>Edit</Button>
          </Card>

          <Card icon={Globe} title="Language & currency" hint="Choose what feels natural">
            <SelectRow label="Language" value={language} onChange={setLanguage} options={["English", "Pidgin", "Yoruba", "Hausa", "Igbo"]} />
            <SelectRow label="Currency" value={currency} onChange={setCurrency} options={["₦ Naira", "$ USD", "€ EUR"]} />
          </Card>

          <Card icon={Bell} title="Notifications" hint="Pick what deserves a ping">
            <Toggle label="New orders" hint="Get pinged when an order comes in" on={notif.orders} onToggle={() => flip("orders")} />
            <Toggle label="Stock alerts" hint="Low or out-of-stock warnings" on={notif.stock} onToggle={() => flip("stock")} />
            <Toggle label="Payments" hint="When money is received" on={notif.payments} onToggle={() => flip("payments")} />
            <Toggle label="Product news" hint="Tips and FreBob updates" on={notif.marketing} onToggle={() => flip("marketing")} />
          </Card>

          <Card icon={Palette} title="Appearance" hint="How FreBob looks">
            <Row label="Theme" value="Warm light" />
            <Row label="Accent" value="Deep purple + orange" />
            <Button variant="outline" size="sm" className="mt-3" onClick={() => toast("Theme options coming soon")}>Change</Button>
          </Card>

          <Card icon={Lock} title="Security" hint="Passwords and access">
            <Row label="Sign-in method" value="Phone OTP · Email magic link" />
            <Row label="Two-factor" value="Off" />
            <Button variant="outline" size="sm" className="mt-3" onClick={() => toast("Coming soon")}>Manage</Button>
          </Card>

          <Card icon={HelpCircle} title="Help & support" hint="We're one tap away">
            <LinkRow label="WhatsApp support" value="+234 800 000 0000" />
            <LinkRow label="User guide" value="frebob.help/guide" />
            <LinkRow label="Give feedback" value="Share what could be better" />
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">FreBob prototype · v0.1</p>
        </div>
      </PageCanvas>
    </AppShell>
  );
}

function Card({ icon: Icon, title, hint, children }: { icon: typeof Bell; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-secondary bg-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function LinkRow({ label, value }: { label: string; value: string }) {
  return (
    <button onClick={() => {}} className="w-full flex items-center justify-between text-sm py-2 hover:text-primary transition">
      <div className="text-left">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-secondary bg-background text-sm font-medium focus:outline-none focus:border-primary/40"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 rounded-full transition shrink-0",
          on ? "brand-gradient" : "bg-muted",
        )}
        aria-pressed={on}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
