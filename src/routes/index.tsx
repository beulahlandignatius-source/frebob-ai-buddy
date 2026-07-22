import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreBob — Your Smart Business Assistant for Every SME" },
      { name: "description", content: "FreBob turns your everyday business conversations into organised records, inventory and insights — built for Nigerian SMEs." },
      { property: "og:title", content: "FreBob — Your Smart Business Assistant for Every SME" },
      { property: "og:description", content: "Generative AI operations assistant for Nigerian SMEs." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      // brief splash
      await new Promise((r) => setTimeout(r, 7000));
      if (cancelled) return;
      if (data.user) {
        // Check onboarding + business setup
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, business_setup_completed")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile?.onboarding_completed) navigate({ to: "/onboarding" });
        else if (!profile?.business_setup_completed) navigate({ to: "/business-setup" });
        else navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/signin" });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden hero-glow">
      <div className="glass-card rounded-3xl px-10 py-12 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
        <Logo size={110} />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-foreground">Fre</span>
            <span className="text-accent">bob</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Smart Business Assistant for Every SME
          </p>
        </div>
        <div className="mt-4 h-1 w-40 rounded-full bg-muted overflow-hidden">
          <div className="h-full brand-gradient animate-[splash-progress_7s_ease-in-out_forwards]" />
        </div>
        <div className="flex items-center gap-1.5 mt-1" aria-label="Loading">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[dot-bounce_1.2s_ease-in-out_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[dot-bounce_1.2s_ease-in-out_infinite] [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[dot-bounce_1.2s_ease-in-out_infinite] [animation-delay:300ms]" />
        </div>
      </div>

      <style>{`
        @keyframes splash-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
