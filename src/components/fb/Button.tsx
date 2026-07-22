import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "outline" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Required for size="icon" — screen-reader label. */
  "aria-label"?: string;
}

const variants: Record<Variant, string> = {
  primary:
    "brand-gradient text-primary-foreground shadow-elegant hover:opacity-95 active:opacity-90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
  ghost: "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
  accent:
    "bg-accent text-accent-foreground hover:brightness-105 active:brightness-95 shadow-soft",
  outline:
    "border border-border bg-background text-foreground hover:bg-muted active:bg-muted/80",
  destructive:
    "bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-xl min-w-11",
  md: "h-12 px-5 text-[15px] rounded-2xl",
  lg: "h-14 px-6 text-base rounded-2xl",
  icon: "h-11 w-11 rounded-full p-0",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium select-none",
        "transition-[opacity,background-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-standard)]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.99]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : null}
      {children}
      {loading ? <span className="sr-only">Loading</span> : null}
    </button>
  );
});
