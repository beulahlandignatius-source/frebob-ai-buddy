import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode | ((ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode);
}

/**
 * Accessible form field wrapper. Pairs label + control + hint/error via aria-describedby.
 * Pass a render-prop child to wire the ids into your control, or a plain child for simple cases.
 */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  const rendered = typeof children === "function" ? children({ id, describedBy, invalid }) : children;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
          {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
        </label>
      )}
      {rendered}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground " +
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent " +
  "disabled:opacity-60 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive/40";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, "aria-invalid": ariaInvalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={ariaInvalid ?? invalid ?? undefined}
        className={cn(controlBase, "flex h-11 px-3.5", className)}
        {...rest}
      />
    );
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, "aria-invalid": ariaInvalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={ariaInvalid ?? invalid ?? undefined}
        className={cn(controlBase, "flex h-11 px-3.5", className)}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, "aria-invalid": ariaInvalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={ariaInvalid ?? invalid ?? undefined}
        className={cn(controlBase, "flex min-h-[88px] px-3.5 py-2.5 resize-y", className)}
        {...rest}
      />
    );
  },
);
