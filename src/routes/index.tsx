import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import splashBot from "@/assets/frebob-splash-bot.png.asset.json";

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
      // Minimum splash time so the animation reads.
      const minDelay = new Promise((r) => setTimeout(r, 1600));
      const authCheck = supabase.auth.getUser();
      const [{ data }] = await Promise.all([authCheck, minDelay]);
      if (cancelled) return;
      navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden"
      style={{ background: "hsl(var(--primary))" }}
    >
      {/* soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--primary-glow) / 0.55), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-6">
        <img
          src={splashBot.url}
          alt="FreBob"
          width={200}
          height={200}
          className="h-40 w-40 sm:h-52 sm:w-52 object-contain splash-bot-anim drop-shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        />
        <div
          className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20"
          aria-label="Loading"
        >
          <div className="h-full w-1/3 rounded-full bg-white/90 splash-bar-anim" />
        </div>
      </div>

      <style>{`
        @keyframes splashZoom {
          0%   { transform: scale(0.6); opacity: 0; }
          40%  { transform: scale(1.08); opacity: 1; }
          70%  { transform: scale(0.98); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .splash-bot-anim {
          animation:
            splashZoom 900ms cubic-bezier(0.22, 1, 0.36, 1) both,
            splashFloat 2.4s ease-in-out 900ms infinite;
          transform-origin: center;
        }
        @keyframes splashBar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .splash-bar-anim {
          animation: splashBar 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-bot-anim, .splash-bar-anim { animation: none; }
        }
      `}</style>
    </div>
  );
}
