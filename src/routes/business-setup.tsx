import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
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

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(80, "Business name is too long"),
  category: z.enum(BUSINESS_CATEGORIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "Please choose a business category" }),
  }),
  currency: z.enum(currencyCodes, {
    errorMap: () => ({ message: "Please choose a currency" }),
  }),
  address: z
    .string()
    .trim()
    .max(200, "Address is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Phone is too long")
    .refine((v) => v === "" || /^[+()\d\s-]{7,20}$/.test(v), {
      message: "Enter a valid phone number",
    })
    .optional()
    .or(z.literal("")),
  products: z.string().trim().max(2000, "Too long").optional().or(z.literal("")),
  inventory: z.string().trim().max(2000, "Too long").optional().or(z.literal("")),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof businessSchema>, string>>;

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);

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

  const values = { name, category, currency, address, phone, products, inventory };
  const parsed = useMemo(() => businessSchema.safeParse(values), [
    name, category, currency, address, phone, products, inventory,
  ]);
  const isValid = parsed.success;

  const validateAndSet = () => {
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const save = async () => {
    setAttempted(true);
    if (!validateAndSet()) {
      toast.error("Please complete the required fields");
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

  const showErr = (key: keyof FieldErrors) => (attempted ? errors[key] : undefined);

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
          <Field label="Business name *" error={showErr("name")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chidi's Provision Store"
              maxLength={80}
              aria-invalid={!!showErr("name")}
            />
          </Field>

          <Field label="Business category *" error={showErr("category")}>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-invalid={!!showErr("category")}
            >
              <option value="">Select a category</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Business address" hint="Optional" error={showErr("address")}>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 4, Balogun Market, Lagos"
                maxLength={200}
              />
            </Field>
            <Field label="Business phone" hint="Optional" error={showErr("phone")}>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                maxLength={20}
              />
            </Field>
          </div>

          <Field label="Currency *" error={showErr("currency")}>
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
              <Field label="Initial products" hint="One per line, e.g. Milo tin — ₦2,500" error={showErr("products")}>
                <Textarea
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  placeholder={"Milo tin\nPeak milk sachet\nIndomie noodles"}
                  maxLength={2000}
                />
              </Field>
              <Field label="Initial inventory" hint="Rough stock counts" error={showErr("inventory")}>
                <Textarea
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder={"Milo tin — 20\nPeak milk sachet — 100"}
                  maxLength={2000}
                />
              </Field>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            loading={saving}
            disabled={!isValid}
            onClick={save}
          >
            Finish setup
          </Button>
          {!isValid && attempted && (
            <p className="text-center text-xs text-muted-foreground">
              Complete the required fields marked with *
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
