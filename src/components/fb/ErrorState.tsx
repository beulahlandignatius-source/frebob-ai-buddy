import { AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";
import { Button } from "@/components/fb/Button";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  /** User-friendly explanation of what happened, in plain language. */
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  supportHref?: string;
  className?: string;
}

/**
 * Human-first error surface. Always says what happened and what to do next.
 * Never leak stack traces or technical codes to the user.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again in a moment.",
  details,
  onRetry,
  retryLabel = "Try again",
  supportHref = "mailto:support@frebob.app",
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-3xl border border-destructive/20 bg-card p-6 sm:p-8 text-center",
        "flex flex-col items-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
      {details ? (
        <p className="mt-3 text-xs text-muted-foreground/80 max-w-md font-mono break-words">
          {details}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        ) : null}
        <a href={supportHref} className="inline-flex">
          <Button variant="outline" className="gap-2 w-full">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Contact support
          </Button>
        </a>
      </div>
    </div>
  );
}
