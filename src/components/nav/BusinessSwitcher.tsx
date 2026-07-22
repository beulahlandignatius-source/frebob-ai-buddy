// Lightweight switcher that lets a user hop between the businesses they belong
// to. Rendered inside AppShell (mobile header + desktop sidebar).
// Switching clears per-business localStorage caches and reloads.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Building2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  useCurrentBusiness,
  switchActiveBusiness,
  type BusinessSummary,
} from "@/hooks/use-current-business";

export function BusinessSwitcher({ className }: { className?: string }) {
  const { context } = useCurrentBusiness();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!context) return null;
  const businesses = context.businesses ?? [];
  const multi = businesses.length > 1;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm text-foreground shadow-card hover:shadow-soft transition focus-ring"
      >
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate font-medium">{context.businessName}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 w-64 rounded-2xl border border-border/70 bg-white shadow-elegant p-2"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {multi ? "Switch business" : "Your business"}
          </p>
          <ul className="max-h-64 overflow-y-auto py-1">
            {businesses.map((b) => (
              <BusinessRow
                key={b.id}
                b={b}
                active={b.id === context.businessId}
                onSelect={async () => {
                  setOpen(false);
                  if (b.id !== context.businessId) {
                    await switchActiveBusiness(b.id);
                  }
                }}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/business-setup" });
            }}
            className="mt-1 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-primary hover:bg-primary/5 min-h-11"
          >
            <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </span>
            Add another business
          </button>
        </div>
      )}
    </div>
  );
}

function BusinessRow({
  b,
  active,
  onSelect,
}: {
  b: BusinessSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted min-h-11",
          active && "bg-primary/5",
        )}
      >
        <span className="h-8 w-8 rounded-lg brand-gradient text-primary-foreground flex items-center justify-center text-[11px] font-bold uppercase">
          {b.name.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{b.name}</span>
          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            {b.role} · {b.currency}
          </span>
        </span>
        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
      </button>
    </li>
  );
}
