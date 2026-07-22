import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TOUR_STEPS, type TourStep } from "./tour-steps";
import { isTourCompleted, markTourCompleted } from "@/lib/demo/mode";

type TourCtx = {
  active: boolean;
  start: () => void;
  stop: () => void;
  stepIndex: number;
};

const Ctx = createContext<TourCtx>({
  active: false,
  start: () => {},
  stop: () => {},
  stepIndex: 0,
});

export function useTour() {
  return useContext(Ctx);
}

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(target?: string): HTMLElement | null {
  if (!target || typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

function measure(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const step: TourStep | null = active ? TOUR_STEPS[stepIndex] ?? null : null;

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setRect(null);
    markTourCompleted();
  }, []);

  // Navigate to step's route if needed, then locate target.
  useEffect(() => {
    if (!active || !step) return;
    let cancelled = false;

    async function run() {
      if (step && step.route && pathRef.current !== step.route) {
        try {
          await navigate({ to: step.route });
        } catch {
          /* ignore */
        }
      }
      // Wait a tick for DOM to render.
      const deadline = Date.now() + 1500;
      const tick = () => {
        if (cancelled || !step) return;
        const el = findTarget(step.target);
        if (el) {
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch { /* ignore */ }
          setRect(measure(el));
        } else if (step.target && Date.now() < deadline) {
          requestAnimationFrame(tick);
          return;
        } else {
          setRect(null);
        }
      };
      requestAnimationFrame(tick);
    }
    run();
    return () => { cancelled = true; };
  }, [active, stepIndex, step, navigate]);

  // Reposition on scroll/resize.
  useEffect(() => {
    if (!active || !step?.target) return;
    const update = () => {
      const el = findTarget(step.target);
      if (el) setRect(measure(el));
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step]);

  // Keyboard nav
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  const next = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) return stop();
    setStepIndex((i) => i + 1);
  };
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  return (
    <Ctx.Provider value={{ active, start, stop, stepIndex }}>
      {children}
      {active && step && (
        <TourOverlay
          step={step}
          index={stepIndex}
          total={TOUR_STEPS.length}
          rect={rect}
          onNext={next}
          onBack={back}
          onSkip={stop}
        />
      )}
    </Ctx.Provider>
  );
}

function TourOverlay({
  step, index, total, rect, onNext, onBack, onSkip,
}: {
  step: TourStep; index: number; total: number; rect: Rect | null;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const centered = !rect || step.placement === "center";

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: 380,
    width: "calc(100vw - 32px)",
    zIndex: 71,
  };
  if (!centered && rect) {
    const preferBelow = rect.top + rect.height + 200 < window.innerHeight;
    const top = preferBelow ? rect.top + rect.height + 12 : rect.top - 12;
    tooltipStyle = {
      position: "fixed",
      left: Math.max(12, Math.min(window.innerWidth - 12 - 380, rect.left)),
      top: preferBelow ? top : undefined,
      bottom: preferBelow ? undefined : window.innerHeight - top,
      maxWidth: 380,
      width: "calc(100vw - 32px)",
      zIndex: 71,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[70]"
    >
      {/* Dimmer + highlight cutout */}
      {rect && !centered ? (
        <>
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          <div
            className="absolute rounded-2xl ring-4 ring-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" onClick={onSkip} />
      )}

      <div
        style={tooltipStyle}
        className="rounded-2xl bg-card shadow-2xl border border-border p-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">
              Tour · {index + 1} of {total}
            </p>
            <h3 id="tour-title" className="mt-1 font-display text-lg font-bold text-foreground">
              {step.title}
            </h3>
          </div>
          <button
            onClick={onSkip}
            aria-label="Skip tour"
            className="text-muted-foreground hover:text-foreground p-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
          {step.description}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              disabled={isFirst}
              className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40 hover:bg-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              {isLast ? "Finish" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Auto-start hook — run once for a demo-mode user who hasn't completed the tour.
export function useAutoStartTourInDemo(demoActive: boolean) {
  const { active, start } = useTour();
  useEffect(() => {
    if (!demoActive || active) return;
    if (isTourCompleted()) return;
    const t = window.setTimeout(() => start(), 900);
    return () => window.clearTimeout(t);
  }, [demoActive, active, start]);
}
