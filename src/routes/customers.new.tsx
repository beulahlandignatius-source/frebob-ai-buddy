import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select, Textarea } from "@/components/fb/Input";
import { PageCanvas, SurfaceHeader } from "@/components/dash";
import { CustomerAvatar } from "@/components/customers";
import {
  createCustomer, findDuplicates, isValidEmail, PREFERRED_LANGUAGES,
  type CustomerInput, type PreferredLanguage,
} from "@/lib/customers-store";

export const Route = createFileRoute("/customers/new")({
  head: () => ({
    meta: [
      { title: "Add customer — FreBob" },
      { name: "description", content: "Create a new customer profile in your FreBob business." },
      { property: "og:title", content: "Add customer — FreBob" },
      { property: "og:description", content: "Build your customer list one contact at a time." },
    ],
  }),
  component: AddCustomerPage,
});

function AddCustomerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerInput>({
    name: "", phone: "", whatsapp: "", email: "", address: "", city: "", state: "",
    preferredLanguage: null, notesSummary: "",
  });
  const [emailError, setEmailError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [dupOverride, setDupOverride] = useState(false);

  const nameOk = form.name.trim().length > 0;
  const emailOk = !form.email || isValidEmail(form.email);
  const canSave = nameOk && emailOk;

  const duplicates = useMemo(() => {
    if (!nameOk && !form.phone && !form.email) return [];
    return findDuplicates(form);
  }, [form, nameOk]);

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "email") setEmailError(undefined);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) {
      if (!nameOk) toast.error("Customer name cannot be empty");
      if (!emailOk) setEmailError("Enter a valid email address");
      return;
    }
    if (duplicates.length > 0 && !dupOverride) {
      toast("A customer with similar details may already exist. Confirm to continue.");
      return;
    }
    setSaving(true);
    try {
      const c = createCustomer(form);
      toast.success("Customer added");
      navigate({ to: "/customers/$id", params: { id: c.id } });
    } catch (err) {
      console.error(err);
      toast.error("FreBob could not save this customer. Review the details and try again.");
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/customers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to customers
        </Link>

        <SurfaceHeader eyebrow="Customers" title="Add a customer" subtitle="Only the name is required. Everything else you can fill in later." />

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="bg-card border border-secondary rounded-[20px] p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/60">Basic info</h2>
              <Field label="Customer name *">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Chinedu Okafor" autoFocus />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number">
                  <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="0803 000 1122" inputMode="tel" />
                </Field>
                <Field label="WhatsApp number">
                  <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="If different from phone" inputMode="tel" />
                </Field>
              </div>
              <Field label="Email address" error={emailError}>
                <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" inputMode="email" onBlur={() => { if (form.email && !isValidEmail(form.email)) setEmailError("Enter a valid email address"); }} />
              </Field>
            </section>

            <section className="bg-card border border-secondary rounded-[20px] p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/60">Address & language</h2>
              <Field label="Address">
                <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Street, area" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Lagos" />
                </Field>
                <Field label="State">
                  <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} placeholder="e.g. Lagos State" />
                </Field>
              </div>
              <Field label="Preferred language">
                <Select
                  value={form.preferredLanguage ?? ""}
                  onChange={(e) => set("preferredLanguage", (e.target.value || null) as PreferredLanguage | null)}
                >
                  <option value="">Not set</option>
                  {PREFERRED_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </Field>
              <Field label="Customer note" hint="Short reminder — e.g. weekly repayment terms.">
                <Textarea value={form.notesSummary ?? ""} onChange={(e) => set("notesSummary", e.target.value)} placeholder="Anything you want to remember" />
              </Field>
            </section>

            <div className="flex items-center justify-end gap-2">
              <Link to="/customers"><Button type="button" variant="ghost">Cancel</Button></Link>
              <Button type="submit" disabled={!canSave || saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save customer"}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-card border border-secondary rounded-[20px] p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</p>
              <div className="mt-3 flex items-center gap-3">
                <CustomerAvatar name={form.name || "?"} />
                <div className="min-w-0">
                  <p className="font-bold truncate">{form.name || "New customer"}</p>
                  <p className="text-xs text-muted-foreground truncate">{form.phone || form.email || "No contact yet"}</p>
                </div>
              </div>
            </div>

            {duplicates.length > 0 && (
              <div className="rounded-[20px] border border-[var(--warning,#d97706)]/30 bg-[color-mix(in_oklab,var(--warning,#d97706)_6%,white)] p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--warning,#d97706)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">A customer with similar details may already exist.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Review before creating a duplicate.</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {duplicates.map((d) => (
                    <li key={d.customer.id} className="flex items-center gap-2 text-xs">
                      <span className="font-medium truncate flex-1">{d.customer.name}</span>
                      <span className="text-muted-foreground">{d.reason === "phone" ? "same phone" : d.reason === "email" ? "same email" : "similar"}</span>
                      <Link to="/customers/$id" params={{ id: d.customer.id }} className="text-primary font-semibold hover:underline">View</Link>
                    </li>
                  ))}
                </ul>
                <label className="mt-3 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={dupOverride} onChange={(e) => setDupOverride(e.target.checked)} />
                  Yes, create anyway
                </label>
              </div>
            )}
          </aside>
        </form>
      </PageCanvas>
    </AppShell>
  );
}
