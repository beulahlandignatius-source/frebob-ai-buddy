import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Full-region loading state. Prefer Skeleton for content-shape loads;
 * use this for indeterminate operations (submits, transitions).
 */
export function LoadingState({
  title = "Loading…",
  description,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin"
      />
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      ) : null}
    </div>
  );
}
