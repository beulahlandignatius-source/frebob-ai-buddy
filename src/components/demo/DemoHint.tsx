// First-use contextual hint for demo mode.
// Only renders in demo mode, once per hint key (dismissed persistently).
import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { isHintDismissed, dismissHint } from "@/lib/demo/mode";
import { cn } from "@/lib/utils";

type Props = {
  hintKey: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function DemoHint({ hintKey, title, children, className }: Props) {
  const { active } = useDemo();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(!isHintDismissed(hintKey));
  }, [active, hintKey]);

  if (!active || !visible) return null;

  return (
    <div
      role="note"
      className={cn(
        "relative mb-4 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 shadow-soft",
        className,
      )}
    >
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-accent/20 text-accent flex items-center justify-center">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
          Demo tip · {title}
        </p>
        <p className="mt-1 text-sm text-foreground/85 leading-relaxed">
          {children}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          dismissHint(hintKey);
          setVisible(false);
        }}
        aria-label="Dismiss hint"
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-background/50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
