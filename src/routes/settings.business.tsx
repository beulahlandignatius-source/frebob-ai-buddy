// FreBob — Batch 10A: Business Settings page (/settings/business).

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, Globe2, Sparkles, Settings2, ShieldCheck, Bell as BellIcon,
  Plug, Info as InfoIcon, Camera, Trash2, Download, ArrowLeft, Check, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select, Textarea } from "@/components/fb/Input";
import {
  SettingsSidebar, SettingsSection, SaveBar, ToggleRow, ExplainNote, ReadOnlyRow,
  UnsavedChangesDialog, type SettingsNavItem,
} from "@/components/settings";
import {
  loadBusiness, saveBusiness, loadRecentAudit,
  DEFAULT_SETTINGS, EMPTY_INFO, SUPPORTED_CURRENCIES, TIMEZONES,
  isValidEmail, isValidPhone, isValidUrl, equalDeep, readAsDataUrl,
  type BusinessInfo, type BusinessSettings, type LoadedBusiness,
  type SupportedLanguage, type SupportedCurrency, type DateFormat,
  type NumberFormat, type AIResponseStyle, type DefaultOrderStatus,
} from "@/lib/business-settings-store";
import { BUSINESS_CATEGORIES, LANGUAGES } from "@/lib/constants";
import { getSettings as getNotifSettings, setSettings as setNotifSettings, type NotifSettings } from "@/lib/notifications-store";
import { NotificationSettings } from "@/components/notifications";
import { listOrders } from "@/lib/orders-store";
import { listCustomers } from "@/lib/customers-store";
import { listUserProducts } from "@/lib/user-products-store";
import { listScans } from "@/lib/scanner-store";
import { listApprovedRecords } from "@/lib/records-store";

export const Route = createFileRoute("/settings/business")({
  head: () => ({
    meta: [
      { title: "Business Settings — FreBob" },
      { name: "description", content: "Configure how FreBob works for your business: regional settings, AI preferences, notifications and more." },
      { property: "og:title", content: "Business Settings — FreBob" },
      { property: "og:description", content: "Central control room for your FreBob configuration." },
    ],
  }),
  component: BusinessSettingsPage,
});

type SectionId =
  | "info" | "regional" | "ai" | "preferences"
  | "privacy" | "notifications" | "connected" | "about";

const SECTIONS: SettingsNavItem[] = [
  { id: "info", label: "Business Information", description: "Name, logo, address, contact", icon: Building2 },
  { id: "regional", label: "Regional Settings", description: "Currency, timezone, language", icon: Globe2 },
  { id: "ai", label: "AI Preferences", description: "How Bob helps you", icon: Sparkles },
  { id: "preferences", label: "Business Preferences", description: "Orders, inventory, payments", icon: Settings2 },
  { id: "privacy", label: "Data & Privacy", description: "Storage, export, deletion", icon: ShieldCheck },
  { id: "notifications", label: "Notification Preferences", description: "What deserves a ping", icon: BellIcon },
  { id: "connected", label: "Connected Features", description: "Services FreBob talks to", icon: Plug },
  { id: "about", label: "About Business", description: "Business ID, plan, version", icon: InfoIcon },
];

function BusinessSettingsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loaded, setLoaded] = useState<LoadedBusiness | null>(null);
  const [info, setInfo] = useState<BusinessInfo>(EMPTY_INFO);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [notifSettings, setNotifSettingsState] = useState<NotifSettings>(() => getNotifSettings());
  const [active, setActive] = useState<SectionId>("info");
  const [saving, setSaving] = useState(false);
  const [pendingSection, setPendingSection] = useState<SectionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await loadBusiness();
        if (cancel) return;
        if (!res) {
          setStatus("ready");
          return;
        }
        setLoaded(res);
        setInfo(res.info);
        setSettings(res.settings);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load business settings.");
        setStatus("error");
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Guard on tab close if dirty anywhere
  const dirtyMap = useMemo(() => {
    const map = new Set<SectionId>();
    if (!loaded) return map;
    const infoKeys: (keyof BusinessInfo)[] = [
      "name", "description", "category", "logoUrl", "phone", "email",
      "address", "city", "state", "country", "website", "currency",
    ];
    if (infoKeys.some((k) => info[k] !== loaded.info[k])) map.add("info");
    if (!equalDeep(settings.regional, loaded.settings.regional)) map.add("regional");
    if (!equalDeep(settings.ai, loaded.settings.ai)) map.add("ai");
    if (!equalDeep(settings.preferences, loaded.settings.preferences)) map.add("preferences");
    // Currency also affects "regional" grouping visually
    if (info.currency !== loaded.info.currency) map.add("regional");
    return map;
  }, [info, settings, loaded]);

  const anyDirty = dirtyMap.size > 0;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!info.name.trim()) e.name = "Business name is required.";
    if (info.name.trim().length > 80) e.name = "Business name is too long.";
    if (!info.category) e.category = "Choose a business category.";
    if (!isValidEmail(info.email)) e.email = "Enter a valid email.";
    if (!isValidPhone(info.phone)) e.phone = "Enter a valid phone number.";
    if (!isValidUrl(info.website)) e.website = "Enter a valid website URL.";
    return e;
  }

  async function handleSave() {
    if (!loaded) {
      toast.error("Sign in to save business settings.");
      return;
    }
    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) {
      toast.error("Please fix the highlighted fields.");
      setActive("info");
      return;
    }
    setSaving(true);
    try {
      const res = await saveBusiness({
        ownerId: loaded.ownerId, before: loaded, info, settings,
      });
      const fresh: LoadedBusiness = {
        ownerId: loaded.ownerId,
        info: { ...info, id: res.businessId, createdAt: loaded.info.createdAt ?? new Date().toISOString() },
        settings,
      };
      setLoaded(fresh);
      setInfo(fresh.info);
      toast.success(
        res.auditCount > 0
          ? `Saved — ${res.auditCount} change${res.auditCount === 1 ? "" : "s"} recorded.`
          : "Saved.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!loaded) return;
    setInfo(loaded.info);
    setSettings(loaded.settings);
    setErrors({});
    toast("Reverted to last saved values.");
  }

  function requestSection(next: SectionId) {
    if (anyDirty) {
      setPendingSection(next);
      return;
    }
    setActive(next);
  }

  const updateNotif = (patch: Partial<NotifSettings>) => {
    setNotifSettings(patch);
    setNotifSettingsState(getNotifSettings());
    toast("Notification preferences updated.");
  };

  const usage = useMemo(() => ({
    orders: listOrders().length,
    customers: listCustomers().length,
    products: listUserProducts().length,
    documents: listScans().length,
    memory: listApprovedRecords().length,
  }), []);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4 mr-1" /> All settings
          </Link>
        </Button>
      </div>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground">Settings</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-primary tracking-tight">Business settings</h1>
        <p className="mt-1 text-sm text-subtle-foreground">
          Configure how FreBob works for {info.name || "your business"}.
        </p>
      </header>

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {status === "ready" && (
        <div className="flex flex-col lg:flex-row gap-6">
          <SettingsSidebar
            items={SECTIONS}
            active={active}
            onSelect={(id) => requestSection(id as SectionId)}
            dirtyIds={dirtyMap}
          />

          <div className="flex-1 min-w-0 space-y-6">
            {active === "info" && (
              <SettingsSection
                title="Business information"
                description="Public details customers see on receipts and reports."
                footer={<SaveBar dirty={anyDirty} saving={saving} onSave={handleSave} onReset={handleReset} onCancel={() => navigate({ to: "/settings" })} />}
              >
                <LogoField
                  logoUrl={info.logoUrl}
                  onFile={async (f) => {
                    if (!f) { setInfo((s) => ({ ...s, logoUrl: "" })); return; }
                    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
                      toast.error("Logo must be JPG, PNG or WEBP.");
                      return;
                    }
                    if (f.size > 2 * 1024 * 1024) {
                      toast.error("Logo must be under 2MB.");
                      return;
                    }
                    const url = await readAsDataUrl(f);
                    setInfo((s) => ({ ...s, logoUrl: url }));
                  }}
                  inputRef={logoInputRef}
                />

                <Field label="Business name *" error={errors.name}>
                  <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} maxLength={80} />
                </Field>

                <Field label="Business description" hint="Short line about what you do">
                  <Textarea
                    value={info.description}
                    onChange={(e) => setInfo({ ...info, description: e.target.value })}
                    maxLength={280}
                    placeholder="Electronics wholesale and repairs in Alaba Market."
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Business category *" error={errors.category}>
                    <Select value={info.category} onChange={(e) => setInfo({ ...info, category: e.target.value })}>
                      <option value="">Select a category</option>
                      {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                  <Field label="Business phone" error={errors.phone}>
                    <Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="+234 800 000 0000" maxLength={20} />
                  </Field>
                  <Field label="Business email" error={errors.email}>
                    <Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="hello@business.ng" maxLength={200} />
                  </Field>
                  <Field label="Website" error={errors.website} hint="Optional">
                    <Input value={info.website} onChange={(e) => setInfo({ ...info, website: e.target.value })} placeholder="https://" maxLength={200} />
                  </Field>
                </div>

                <Field label="Business address">
                  <Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} maxLength={200} placeholder="Shop 12, Alaba Market" />
                </Field>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="City">
                    <Input value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="State">
                    <Input value={info.state} onChange={(e) => setInfo({ ...info, state: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="Country">
                    <Input value={info.country} onChange={(e) => setInfo({ ...info, country: e.target.value })} maxLength={80} />
                  </Field>
                </div>
              </SettingsSection>
            )}

            {active === "regional" && (
              <SettingsSection
                title="Regional settings"
                description="Currency, timezone, language and how numbers are formatted."
                footer={<SaveBar dirty={anyDirty} saving={saving} onSave={handleSave} onReset={handleReset} onCancel={() => navigate({ to: "/settings" })} />}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Currency">
                    <Select value={info.currency} onChange={(e) => setInfo({ ...info, currency: e.target.value as SupportedCurrency })}>
                      {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Timezone">
                    <Select
                      value={settings.regional.timezone}
                      onChange={(e) => setSettings({ ...settings, regional: { ...settings.regional, timezone: e.target.value } })}
                    >
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </Select>
                  </Field>
                  <Field label="Date format">
                    <Select
                      value={settings.regional.dateFormat}
                      onChange={(e) => setSettings({ ...settings, regional: { ...settings.regional, dateFormat: e.target.value as DateFormat } })}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                    </Select>
                  </Field>
                  <Field label="Number format">
                    <Select
                      value={settings.regional.numberFormat}
                      onChange={(e) => setSettings({ ...settings, regional: { ...settings.regional, numberFormat: e.target.value as NumberFormat } })}
                    >
                      <option value="1,000.00">1,000.00</option>
                      <option value="1000.00">1000.00</option>
                    </Select>
                  </Field>
                  <Field label="Language">
                    <Select
                      value={settings.regional.language}
                      onChange={(e) => setSettings({ ...settings, regional: { ...settings.regional, language: e.target.value as SupportedLanguage } })}
                    >
                      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <ExplainNote>
                  Language controls FreBob and Bob's replies where translations are available. Currency conversion isn't performed — amounts are stored in your chosen currency.
                </ExplainNote>
              </SettingsSection>
            )}

            {active === "ai" && (
              <SettingsSection
                title="AI preferences"
                description="Bob helps you with summaries, insights and recommendations."
                footer={<SaveBar dirty={anyDirty} saving={saving} onSave={handleSave} onReset={handleReset} onCancel={() => navigate({ to: "/settings" })} />}
              >
                <ToggleRow
                  label="AI Assistant enabled"
                  hint="Turn Bob's chat on for this business."
                  checked={settings.ai.assistantEnabled}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, assistantEnabled: v } })}
                />
                <ToggleRow
                  label="AI insights enabled"
                  hint="Show Bob's short explanations on Reports."
                  checked={settings.ai.insightsEnabled}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, insightsEnabled: v } })}
                />
                <ToggleRow
                  label="AI business summary enabled"
                  hint="Daily glance card at the top of the Dashboard."
                  checked={settings.ai.summaryEnabled}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, summaryEnabled: v } })}
                />
                <ToggleRow
                  label="AI recommendations enabled"
                  hint="AI Recommendations help identify opportunities based on your approved business records."
                  checked={settings.ai.recommendationsEnabled}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, recommendationsEnabled: v } })}
                />

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <Field label="Response style">
                    <Select
                      value={settings.ai.responseStyle}
                      onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, responseStyle: e.target.value as AIResponseStyle } })}
                    >
                      <option value="short">Short — one paragraph</option>
                      <option value="balanced">Balanced — recommended</option>
                      <option value="detailed">Detailed — full breakdown</option>
                    </Select>
                  </Field>
                  <Field label="AI language">
                    <Input readOnly value={LANGUAGES.find((l) => l.code === settings.regional.language)?.label ?? "English"} />
                  </Field>
                </div>
                <ExplainNote>Bob replies in your business language. Change it in Regional Settings.</ExplainNote>
              </SettingsSection>
            )}

            {active === "preferences" && (
              <SettingsSection
                title="Business preferences"
                description="Defaults for orders, inventory, payments and the scanner."
                footer={<SaveBar dirty={anyDirty} saving={saving} onSave={handleSave} onReset={handleReset} onCancel={() => navigate({ to: "/settings" })} />}
              >
                <Field label="Default order status">
                  <Select
                    value={settings.preferences.defaultOrderStatus}
                    onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, defaultOrderStatus: e.target.value as DefaultOrderStatus } })}
                  >
                    <option value="enquiry">Enquiry</option>
                    <option value="pending">Pending</option>
                    <option value="reserved">Reserved</option>
                  </Select>
                </Field>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary/60 mb-2">Inventory</h4>
                  <ToggleRow label="Warn on low stock" hint="Trigger alerts when items fall below their reorder point." checked={settings.preferences.warnLowStock} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, warnLowStock: v } })} />
                  <ToggleRow label="Allow negative stock" hint="Off by default to prevent overselling." checked={settings.preferences.allowNegativeStock} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, allowNegativeStock: v } })} />
                  <ToggleRow label="Show reorder alerts" hint="Suggest restocking in the notification centre." checked={settings.preferences.showReorderAlerts} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, showReorderAlerts: v } })} />
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary/60 mb-2">Payments</h4>
                  <ToggleRow label="Automatically mark Paid when balance reaches zero" checked={settings.preferences.autoMarkPaid} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, autoMarkPaid: v } })} />
                  <ToggleRow label="Warn before overpayment" checked={settings.preferences.warnOverpayment} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, warnOverpayment: v } })} />
                  <ToggleRow label="Require payment confirmation" hint="Adds a confirm step before recording." checked={settings.preferences.requirePaymentConfirmation} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, requirePaymentConfirmation: v } })} />
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary/60 mb-2">Scanner</h4>
                  <ToggleRow label="Save original documents" checked={settings.preferences.saveOriginalDocuments} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, saveOriginalDocuments: v } })} />
                  <ToggleRow label="Enable document quality checks" checked={settings.preferences.documentQualityChecks} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, documentQualityChecks: v } })} />
                  <ToggleRow label="Ask before conversion" hint="Human confirms every scan → record conversion." checked={settings.preferences.askBeforeConversion} onChange={(v) => setSettings({ ...settings, preferences: { ...settings.preferences, askBeforeConversion: v } })} />
                </div>
              </SettingsSection>
            )}

            {active === "privacy" && (
              <SettingsSection
                title="Data & privacy"
                description="A snapshot of what FreBob stores for you."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <UsageStat label="Orders" value={usage.orders} />
                  <UsageStat label="Customers" value={usage.customers} />
                  <UsageStat label="Products" value={usage.products} />
                  <UsageStat label="Documents" value={usage.documents} />
                  <UsageStat label="Memory records" value={usage.memory} />
                  <UsageStat label="Storage used" value={"~ 2 MB"} />
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast("Data export will be available soon.")}>
                    <Download className="h-4 w-4 mr-1" /> Export data
                  </Button>
                  <Button variant="ghost" size="sm" disabled title="Business deletion is disabled in this release.">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete business
                  </Button>
                </div>
                <ExplainNote>
                  Business deletion is disabled in this release. Contact support if you need to remove your business.
                </ExplainNote>
              </SettingsSection>
            )}

            {active === "notifications" && (
              <SettingsSection
                title="Notification preferences"
                description="In-app notifications only. Email, SMS and WhatsApp are coming later."
              >
                <NotificationSettings settings={notifSettings} onChange={updateNotif} />
              </SettingsSection>
            )}

            {active === "connected" && (
              <SettingsSection
                title="Connected features"
                description="Services FreBob connects to. Read-only in this release."
              >
                <ConnectedRow name="Gemini AI" status="connected" hint="Extractions, chat and summaries." />
                <ConnectedRow name="YarnGPT" status="unavailable" hint="Nigerian-language voice model — coming soon." />
                <ConnectedRow name="Scanner Service" status="connected" hint="Document vision + capture." />
                <ConnectedRow name="Lovable Cloud (Supabase)" status="connected" hint="Auth, database and storage." />
              </SettingsSection>
            )}

            {active === "about" && (
              <SettingsSection
                title="About business"
                description="Reference details for support."
              >
                <ReadOnlyRow label="Business ID" value={<code className="text-xs">{loaded?.info.id ?? "—"}</code>} />
                <ReadOnlyRow label="Date created" value={loaded?.info.createdAt ? new Date(loaded.info.createdAt).toLocaleString() : "—"} />
                <ReadOnlyRow label="Current plan" value="FreBob Starter (Prototype)" tone="muted" />
                <ReadOnlyRow label="Storage used" value="~ 2 MB" tone="muted" />
                <ReadOnlyRow label="Application version" value="v0.10.0 — Batch 10A" tone="success" />
                <div className="pt-4">
                  <Button
                    variant="ghost" size="sm"
                    onClick={async () => {
                      if (!loaded?.info.id) { toast("Save your business first to view audit history."); return; }
                      try {
                        const rows = await loadRecentAudit(loaded.info.id, 20);
                        toast(`Loaded ${rows.length} audit event${rows.length === 1 ? "" : "s"}.`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not load audit log.");
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" /> View recent audit events
                  </Button>
                </div>
              </SettingsSection>
            )}
          </div>
        </div>
      )}

      <UnsavedChangesDialog
        open={pendingSection !== null}
        onOpenChange={(v) => { if (!v) setPendingSection(null); }}
        onDiscard={() => {
          handleReset();
          if (pendingSection) setActive(pendingSection);
          setPendingSection(null);
        }}
        onSave={async () => {
          await handleSave();
          if (pendingSection) setActive(pendingSection);
          setPendingSection(null);
        }}
      />
    </AppShell>
  );
}

/* ------------------------------------------- pieces */

function LogoField({
  logoUrl, onFile, inputRef,
}: { logoUrl: string; onFile: (f: File | null) => void; inputRef: React.MutableRefObject<HTMLInputElement | null> }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
        {logoUrl ? (
          <img src={logoUrl} alt="Business logo" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-8 w-8 text-primary/40" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-1" /> Upload logo
          </Button>
          {logoUrl && (
            <Button size="sm" variant="ghost" onClick={() => onFile(null)}>Remove</Button>
          )}
        </div>
        <p className="text-xs text-subtle-foreground">JPG, PNG or WEBP. Up to 2MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-primary">{value}</p>
    </div>
  );
}

function ConnectedRow({
  name, status, hint,
}: { name: string; status: "connected" | "disconnected" | "unavailable"; hint: string }) {
  const map = {
    connected:    { label: "Connected", tone: "text-[var(--success)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)]", Icon: Wifi },
    disconnected: { label: "Disconnected", tone: "text-accent bg-accent/10", Icon: WifiOff },
    unavailable:  { label: "Unavailable", tone: "text-muted-foreground bg-muted", Icon: WifiOff },
  }[status];
  const Icon = map.Icon;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-xs text-subtle-foreground">{hint}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${map.tone}`}>
        <Icon className="h-3 w-3" /> {map.label}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {[0,1,2].map((i) => (
        <div key={i} className="rounded-3xl border border-border bg-card p-6 animate-pulse">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="mt-4 h-3 w-full bg-muted rounded" />
          <div className="mt-2 h-3 w-2/3 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-[#DC2626]/30 bg-[color-mix(in_oklab,#DC2626_6%,transparent)] p-6 text-center">
      <h3 className="font-semibold">Unable to load business settings</h3>
      <p className="text-sm text-muted-foreground mt-1">{message ?? "Please try again."}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}
