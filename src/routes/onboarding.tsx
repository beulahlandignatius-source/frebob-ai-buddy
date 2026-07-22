import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/fb/Button";
import { Field, Select } from "@/components/fb/Input";
import { BUSINESS_CATEGORIES, LANGUAGES } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  IllustrationChat,
  IllustrationInventory,
  IllustrationInsights,
  IllustrationLocal,
} from "@/components/onboarding/Illustrations";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — FreBob" },
      { name: "description", content: "A quick tour of FreBob before we personalise your assistant." },
      { property: "og:title", content: "Get started — FreBob" },
      { property: "og:description", content: "Meet FreBob — your smart business assistant for every SME." },
    ],
  }),
  component: Onboarding,
});

type Slide = {
  illustration: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    illustration: <IllustrationChat />,
    eyebrow: "Meet FreBob",
    title: "Your smart business assistant",
    body: "Chat with FreBob in English, Pidgin, Yoruba, Hausa or Igbo. He listens, understands and helps you run your business.",
  },
  {
    illustration: <IllustrationInventory />,
    eyebrow: "Inventory made easy",
    title: "Track stock without stress",
    body: "Snap a photo, speak, or type. FreBob keeps your products, prices and stock levels organised for you.",
  },
  {
    illustration: <IllustrationInsights />,
    eyebrow: "Clear insights",
    title: "See how your business is doing",
    body: "Get simple daily summaries — sales, top products, cash flow and stock alerts — all in one calm dashboard.",
  },
  {
    illustration: <IllustrationLocal />,
    eyebrow: "Built for SMEs",
    title: "Local, warm and trusted",
    body: "Designed for Nigerian small businesses. Your data stays yours. FreBob is here to help you grow.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  const totalSteps = SLIDES.length + 1; // last = personalise
  const isLast = index === totalSteps - 1;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const next = () => setIndex((i) => Math.min(i + 1, totalSteps - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  const save = async () => {
    if (!category) return toast.error("Please choose a business category");
    setSaving(true);
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_category: category,
          preferred_language: language,
          onboarding_completed: true,
        })
        .eq("id", userId);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }
    setSaving(false);
    navigate({ to: "/business-setup" });
  };

  return (
    <div className="min-h-screen hero-glow flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="text-sm font-semibold">
              <span className="text-foreground">Fre</span>
              <span className="text-accent">bob</span>
            </span>
          </div>
          {!isLast && (
            <button
              type="button"
              onClick={() => setIndex(totalSteps - 1)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          {isLast ? (
            <PersonaliseStep
              category={category}
              setCategory={setCategory}
              language={language}
              setLanguage={setLanguage}
            />
          ) : (
            <SlideView slide={SLIDES[index]} />
          )}

          {/* Dots + actions */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="flex items-center justify-center gap-2 mb-5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {index > 0 && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={prev}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {isLast ? (
                <Button size="lg" onClick={save} loading={saving} className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button size="lg" onClick={next} className="flex-1">
                  {index === SLIDES.length - 1 ? "Get started" : "Next"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  return (
    <div
      key={slide.title}
      className="px-6 sm:px-8 pt-8 pb-4 text-center animate-in fade-in slide-in-from-right-4 duration-300"
    >
      <div className="mx-auto w-full max-w-xs aspect-square flex items-center justify-center">
        {slide.illustration}
      </div>
      <p className="mt-6 text-xs font-medium uppercase tracking-widest text-primary">
        {slide.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        {slide.title}
      </h2>
      <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
        {slide.body}
      </p>
    </div>
  );
}

function PersonaliseStep({
  category, setCategory, language, setLanguage,
}: {
  category: string;
  setCategory: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
}) {
  return (
    <div className="px-6 sm:px-8 pt-8 pb-2 animate-in fade-in duration-300">
      <p className="text-xs font-medium uppercase tracking-widest text-primary text-center">
        One last step
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-center">
        Personalise your assistant
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        Two quick answers so FreBob speaks your language.
      </p>

      <div className="mt-6 space-y-5">
        <Field label="What kind of business do you run?">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select a category</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Preferred language</p>
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
    </div>
  );
}
