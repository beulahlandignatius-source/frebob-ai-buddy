import { cn } from "@/lib/utils";

/**
 * Skeleton block — pulse animation, respects prefers-reduced-motion via the global override.
 * Use to replace content while data loads. Always provide sr-only status text nearby.
 */
export function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      {...rest}
    />
  );
}

/** Common preset — a card-shaped skeleton row. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 space-y-3", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/** List of skeleton rows for tables/feeds. */
export function SkeletonList({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("space-y-3", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
