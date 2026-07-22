import { useState } from "react";
import { Sparkles, RotateCcw, LogOut, PlayCircle, X } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { useNavigate } from "@tanstack/react-router";
import { useTour } from "@/components/tour/GuidedTour";

export function DemoModeBanner() {
  const { active, exit, reset, business } = useDemo();
  const { start } = useTour();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<"exit" | "reset" | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  if (!active) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Demo mode banner"
        className="sticky top-0 z-40 border-b border-primary/15 bg-[color-mix(in_oklab,var(--primary)_10%,white)] backdrop-blur"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-8 py-2 flex items-center gap-3 text-[13px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Demo
          </span>
          {!collapsed && (
            <span className="min-w-0 truncate text-primary/90">
              Exploring <strong>{business.name}</strong> — changes won't affect real business data.
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => start()}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white text-primary border border-primary/20 hover:bg-primary/10 px-2.5 py-1 text-[11px] font-semibold"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Start Tour
            </button>
            <button
              onClick={() => setConfirming("reset")}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white text-primary border border-primary/20 hover:bg-primary/10 px-2.5 py-1 text-[11px] font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={() => setConfirming("exit")}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 px-2.5 py-1 text-[11px] font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" /> Exit
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Collapse demo banner"
              className="sm:hidden text-primary/70 hover:text-primary p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card shadow-xl p-6">
            <h3 className="font-display text-lg font-bold text-foreground">
              {confirming === "exit" ? "Exit demo mode?" : "Reset demo business?"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirming === "exit"
                ? "You'll return to your real business. Any demo changes will be discarded."
                : "All changes you made in the demo will be removed and the original demo records restored."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirming === "exit") {
                    exit();
                    setConfirming(null);
                    navigate({ to: "/signin" });
                  } else {
                    reset();
                    setConfirming(null);
                  }
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {confirming === "exit" ? "Exit demo" : "Reset demo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
