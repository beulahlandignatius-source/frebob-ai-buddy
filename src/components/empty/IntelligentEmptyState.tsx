// Intelligent empty state — global first-time UX helper.
// Purpose: answer "What should I do next?" on every otherwise blank page.
// Design: brand purple / orange, generous spacing, no glassmorphism.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Rocket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/fb/Button";
import { useDemo } from "@/lib/demo/context";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon?: LucideIcon;
  to?: string;
  onClick?: () => void;
};

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  primary?: Action;
  secondary?: Action[];
  /** When true, appends an "Explore Demo Business" CTA if the user isn't already in demo mode. */
  demoCta?: boolean;
  demoOnEnter?: () => void;
  className?: string;
  children?: ReactNode;
};

export function IntelligentEmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary = [],
  demoCta = true,
  demoOnEnter,
  className,
  children,
}: Props) {
  const { active: demoActive, enter } = useDemo();

  const renderAction = (a: Action, key: string, variant: "primary" | "outline" | "ghost") => {
    const inner = (
      <Button
        variant={variant}
        size="md"
        className="w-full sm:w-auto min-h-[48px]"
        onClick={a.onClick}
      >
        {a.label}
      </Button>
    );
    if (a.to) {
      return (
        <Link key={key} to={a.to} className="w-full sm:w-auto">
          {inner}
        </Link>
      );
    }
    return <span key={key} className="w-full sm:w-auto inline-block">{inner}</span>;
  };

  const showDemo = demoCta && !demoActive;

  return (
    <section
      role="region"
      aria-label={title}
      className={cn(
        "rounded-3xl bg-card border border-border shadow-card",
        "px-6 py-10 sm:px-10 sm:py-14 text-center",
        className,
      )}
    >
      <div className="mx-auto flex flex-col items-center max-w-xl">
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm sm:text-[15px] text-foreground/75 leading-relaxed">
          {description}
        </p>


        {(primary || secondary.length > 0 || showDemo) && (
          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full sm:w-auto">
            {primary && renderAction(primary, "primary", "primary")}
            {secondary.map((s, i) => renderAction(s, `sec-${i}`, "outline"))}
            {showDemo &&
              renderAction(
                {
                  label: "Explore Demo Business",
                  onClick: () => {
                    (demoOnEnter ?? enter)();
                  },
                },
                "demo",
                "ghost",
              )}

          </div>
        )}

        {children ? <div className="mt-6 w-full">{children}</div> : null}
      </div>
    </section>
  );
}
