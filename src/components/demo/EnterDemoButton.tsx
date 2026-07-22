import { Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useDemo } from "@/lib/demo/context";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "primary" | "ghost" | "inline";
  className?: string;
  label?: string;
  subtitle?: string;
};

export function EnterDemoButton({
  variant = "ghost",
  className,
  label = "Explore Demo",
  subtitle,
}: Props) {
  const navigate = useNavigate();
  const { enter } = useDemo();

  const onClick = () => {
    enter();
    navigate({ to: "/dashboard" });
  };

  if (variant === "inline") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline",
          className,
        )}
      >
        <Sparkles className="h-4 w-4" /> {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-3 text-sm font-semibold transition",
        variant === "primary"
          ? "brand-gradient text-primary-foreground hover:opacity-95 shadow-elegant"
          : "bg-white border border-primary/20 text-primary hover:bg-primary/5",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" /> {label}
      </span>
      {subtitle && (
        <span className="text-[11px] font-normal opacity-80">{subtitle}</span>
      )}
    </button>
  );
}
