import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Input, Select, Textarea } from "@/components/fb/Input";
import { BUSINESS_CATEGORIES, CURRENCIES } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/business-setup")({
  head: () => ({
    meta: [
      { title: "Set up your business — FreBob" },
      { name: "description", content: "Enter your business details so FreBob can organise your operations." },
      { property: "og:title", content: "Set up your business — FreBob" },
      { property: "og:description", content: "Business name, category, address, currency." },
    ],
  }),
  component: BusinessSetup,
});

function BusinessSetup() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [products, setProducts] = useState("");
  const [inventory, setInventory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_category")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.business_category) setCategory(profile.business_category);
    });
  }, []);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    setSaving(true);
    if (userId) {
      const { error } = await supabase.from("businesses").insert({
        owner_id: userId,
        name: name.trim(),
        category,
        address: address.trim() || null,
        phone: phone.trim() || null,
        currency,
        initial_products: products.trim() || null,
        initial_inventory: inventory.trim() || null,
      });

      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }

      await supabase
        .from("profiles")
        .update({ business_setup_completed: true })
        .eq("id", userId);
    }

    setSaving(false);
    toast.success("Business created 🎉");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Logo size={40} />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Step 2 of 2
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Set up your business</h1>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-5">
          <Field label="Business name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chidi's Provision Store"
            />
          </Field>

          <Field label="Business category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Business address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 4, Balogun Market, Lagos"
              />
            </Field>
            <Field label="Business phone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </Field>
          </div>

          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="border-t border-border pt-5">
            <p className="text-sm font-medium">Optional starter data</p>
            <p className="text-xs text-muted-foreground mb-3">
              You can skip these and add them later.
            </p>
            <div className="space-y-4">
              <Field label="Initial products" hint="One per line, e.g. Milo tin — ₦2,500">
                <Textarea
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  placeholder={"Milo tin\nPeak milk sachet\nIndomie noodles"}
                />
              </Field>
              <Field label="Initial inventory" hint="Rough stock counts">
                <Textarea
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder={"Milo tin — 20\nPeak milk sachet — 100"}
                />
              </Field>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            loading={saving}
            onClick={save}
          >
            Finish setup
          </Button>
        </div>
      </div>
    </div>
  );
}
