import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreBob — Your Smart Business Assistant" },
      { name: "description", content: "FreBob helps African SMEs organise conversations, customers, orders, inventory and business records in one trusted place." },
      { property: "og:title", content: "FreBob — Your Smart Business Assistant" },
      { property: "og:description", content: "Run your business with a smarter assistant. Built for African SMEs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
    </div>
  );
}
