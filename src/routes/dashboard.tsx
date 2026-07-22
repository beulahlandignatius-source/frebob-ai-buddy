import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/fb/Button";
import { Sparkles, MessageSquare, Boxes, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FreBob" },
      { name: "description", content: "Your FreBob operations dashboard." },
      { property: "og:title", content: "Dashboard — FreBob" },
      { property: "og:description", content: "Your AI-powered business operations dashboard." },
    ],
  }),
  component: Dashboard,
});

type Business = { name: string; currency: string };

function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setName(data.user.email?.split("@")[0] ?? "there");
      const { data: b } = await supabase
        .from("businesses")
        .select("name,currency")
        .eq("owner_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (b) setBusiness(b);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <AppShell>
      <section className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-60 -z-10" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
              Hi {name} 👋
            </h1>
            {business && (
              <p className="mt-1 text-sm text-muted-foreground">
                Managing <span className="font-medium text-foreground">{business.name}</span>
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Your AI assistant is warming up</p>
            <p className="text-muted-foreground">
              Batch 1 is complete — Inventory, AI chatbot, scanner and business memory arrive in the next batch.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid sm:grid-cols-3 gap-4">
        <PlaceholderCard icon={MessageSquare} title="Conversation intake" body="Paste WhatsApp chats to convert into records." />
        <PlaceholderCard icon={Boxes} title="Inventory" body="Track stock, prices, and low-stock alerts." />
        <PlaceholderCard icon={BarChart3} title="Reports" body="Daily sales, top products, cash-in vs cash-out." />
      </section>
    </AppShell>
  );
}

function PlaceholderCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="h-10 w-10 rounded-xl bg-secondary text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <p className="mt-3 text-xs text-muted-foreground">Coming in Batch 2</p>
    </div>
  );
}
