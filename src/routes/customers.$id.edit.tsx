import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select, Textarea } from "@/components/fb/Input";
import { PageCanvas, SurfaceHeader, EmptyState } from "@/components/dash";
import {
  getCustomer, updateCustomer, isValidEmail, PREFERRED_LANGUAGES,
  type CustomerInput, type PreferredLanguage,
} from "@/lib/customers-store";

export const Route = createFileRoute("/customers/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit customer — FreBob" },
      { name: "description", content: "Update customer contact details, address and preferences." },
      { property: "og:title", content: "Edit customer — FreBob" },
      { property: "og:description", content: "Keep your customer records accurate and up to date." },
    ],
  }),
  component: EditCustomerPage,
});

function EditCustomerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const existing = getCustomer(id);
  const [form, setForm] = useState<CustomerInput>(() => ({
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    whatsapp: existing?.whatsapp ?? "",
    email: existing?.email ?? "",
    address: existing?.address ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    preferredLanguage: existing?.preferredLanguage ?? null,
    notesSummary: existing?.notesSummary ?? "",
  }));
  const [emailError, setEmailError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  if (!existing) {
    return (
      <AppShell>
        <PageCanvas>
          <EmptyState title="Customer not found" description="This customer profile may have been removed." action={<Link to="/customers"><Button size="sm">Back to customers</Button></Link>} />
        </PageCanvas>
      </AppShell>
    );
  }

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "email") setEmailError(undefined);
  }

  const nameOk = form.name.trim().length > 0;
  const emailOk = !form.email || isValidEmail(form.email);
  const canSave = nameOk && emailOk;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) {
      if (!nameOk) toast.error("Customer name cannot be empty");
      if (!emailOk) setEmailError("Enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      updateCustomer(id, form);
      toast.success("Customer updated");
      navigate({ to: "/customers/$id", params: { id } });
    } catch (err) {
      console.error(err);
      toast.error("FreBob could not save this customer. Review the details and try again.");
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageCanvas>
        <Link to="/customers/$id" params={{ id }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3" /> Back to profile
        </Link>

        <SurfaceHeader eyebrow="Customers" title="Edit customer" subtitle="Totals, orders and payments update automatically from your business records." />

        <form onSubmit={submit} className="max-w-2xl space-y-5">
          <section className="bg-card border border-secondary rounded-[20px] p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/60">Basic info</h2>
            <Field label="Customer name *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number">
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
              </Field>
              <Field label="WhatsApp number">
                <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" />
              </Field>
            </div>
            <Field label="Email address" error={emailError}>
              <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} inputMode="email"
                onBlur={() => { if (form.email && !isValidEmail(form.email)) setEmailError("Enter a valid email address"); }} />
            </Field>
          </section>

          <section className="bg-card border border-secondary rounded-[20px] p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/60">Address & language</h2>
            <Field label="Address">
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="State">
                <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
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
            <Field label="Customer note">
              <Textarea value={form.notesSummary ?? ""} onChange={(e) => set("notesSummary", e.target.value)} />
            </Field>
          </section>

          <div className="flex items-center justify-end gap-2">
            <Link to="/customers/$id" params={{ id }}><Button type="button" variant="ghost">Cancel</Button></Link>
            <Button type="submit" disabled={!canSave || saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </PageCanvas>
    </AppShell>
  );
}
