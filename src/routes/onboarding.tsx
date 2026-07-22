import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Select } from "@/components/fb/Input";
import { BUSINESS_CATEGORIES, LANGUAGES } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — FreBob" },
      { name: "description", content: "Tell us about your business so FreBob can serve you better." },
      { property: "og:title", content: "Get started — FreBob" },
      { property: "og:description", content: "Choose your language and business category." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
      else setUserId(data.user.id);
    });
  }, [navigate]);

  const save = async () => {
    if (!userId) return;
    if (!category) {
      toast.error("Please choose a business category");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        business_category: category,
        preferred_language: language,
        onboarding_completed: true,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/business-setup" });
  };

  return (
    <div className="min-h-screen hero-glow p-4 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-xl mt-8 sm:mt-0">
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Step 1 of 2
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Welcome to FreBob</h1>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Let's personalise your assistant. We'll ask just two quick questions.
          </p>

          <div className="mt-6 space-y-5">
            <Field label="What kind of business do you run?">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Preferred language
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((l) => {
                  const active = language === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm text-left transition",
                        active
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full mt-8"
            onClick={save}
            loading={saving}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
