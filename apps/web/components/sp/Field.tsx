import type { ReactNode } from "react";

type FieldProps = {
  /** id of the control inside; also used to derive the hint/error ids. */
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Ids to put on the control's `aria-describedby`. */
export function fieldDescribedBy(id: string, opts: { hint?: string; error?: string }): string | undefined {
  if (opts.error) return `${id}-error`;
  if (opts.hint) return `${id}-hint`;
  return undefined;
}

/** DESIGN_SYSTEM §7.8. Error text replaces the hint. */
export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="sp-field">
      <label htmlFor={id}>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="sp-field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="sp-field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
