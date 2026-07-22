// FreBob — Batch 10A: Business Settings UI building blocks.

import type { ReactNode } from "react";
import { AlertTriangle, Check, Info, Save, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/fb/Button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

/* ---------------- Settings shell ---------------- */

export type SettingsNavItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function SettingsSidebar({
  items, active, onSelect, dirtyIds,
}: {
  items: SettingsNavItem[];
  active: string;
  onSelect: (id: string) => void;
  dirtyIds: Set<string>;
}) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:block w-64 shrink-0">
        <nav className="sticky top-24 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = it.id === active;
            const dirty = dirtyIds.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-foreground/80 hover:bg-secondary/50",
                )}
              >
                <span
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    isActive ? "bg-white/15 text-primary-foreground" : "bg-secondary text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{it.label}</span>
                    {dirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="Unsaved" />}
                  </span>
                  <span className={cn(
                    "block text-[11px] mt-0.5 truncate",
                    isActive ? "text-primary-foreground/80" : "text-subtle-foreground",
                  )}>
                    {it.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {items.map((it) => {
            const isActive = it.id === active;
            const dirty = dirtyIds.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect(it.id)}
                className={cn(
                  "relative shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-soft"
                    : "bg-card text-primary/80 border-border hover:bg-secondary/40",
                )}
              >
                {it.label}
                {dirty && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ---------------- Section wrapper ---------------- */

export function SettingsSection({
  title, description, footer, children,
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card shadow-card">
      <header className="px-6 pt-6 pb-4 border-b border-border/70">
        <h2 className="font-display text-xl font-bold text-primary tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-subtle-foreground">{description}</p>}
      </header>
      <div className="px-6 py-6 space-y-5">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-border/70 bg-secondary/30 rounded-b-3xl">{footer}</div>}
    </section>
  );
}

/* ---------------- Row / Toggle / Explain ---------------- */

export function ToggleRow({
  label, hint, checked, onChange, disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-subtle-foreground mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 h-6 w-11 rounded-full transition",
          checked ? "brand-gradient" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-[22px]" : "left-0.5",
        )} />
      </button>
    </div>
  );
}

export function ExplainNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-subtle-foreground bg-secondary/50 rounded-xl px-3 py-2">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
      <span>{children}</span>
    </p>
  );
}

export function ReadOnlyRow({ label, value, tone }: { label: string; value: ReactNode; tone?: "success" | "warn" | "muted" }) {
  const dot = tone === "success" ? "bg-[var(--success)]" : tone === "warn" ? "bg-accent" : "bg-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-subtle-foreground">{label}</span>
      <span className="text-sm font-medium flex items-center gap-2">
        {tone && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
        {value}
      </span>
    </div>
  );
}

/* ---------------- Save action bar ---------------- */

export function SaveBar({
  dirty, saving, onSave, onReset, onCancel,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-subtle-foreground">
        {dirty ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> You have unsaved changes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[var(--success)]">
            <Check className="h-3.5 w-3.5" /> All changes saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} disabled={!dirty || saving}>
          <Undo2 className="h-4 w-4 mr-1" /> Reset
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving} loading={saving}>
          <Save className="h-4 w-4 mr-1" /> Save changes
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Unsaved dialog ---------------- */

export function UnsavedChangesDialog({
  open, onOpenChange, onDiscard, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" /> Unsaved changes
          </DialogTitle>
          <DialogDescription>
            You've made changes on this section. Save them, or discard and continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Stay here</Button>
          <Button variant="outline" onClick={onDiscard}>Discard</Button>
          <Button onClick={onSave}>Save and continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
