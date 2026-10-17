"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { ActionResult } from "@/app/(admin)/dashboard/actions";

/** Puts server-side field errors onto the matching inputs; returns the form-level message, if any. */
export function applyServerErrors(form: UseFormReturn<FieldValues>, result: ActionResult): string | null {
  if (result.ok) return null;
  const entries = Object.entries(result.fieldErrors);
  entries.forEach(([path, message], i) => form.setError(path, { type: "server", message }, { shouldFocus: i === 0 }));
  return result.formError ?? (entries.length ? "Some fields need attention." : "Saving failed. Try again.");
}

/**
 * Gives every rendered field a key in the default values (undefined when absent).
 * react-hook-form compares values by key count too, so a registered field missing from the stored
 * item (e.g. an empty optional `endYear`) would otherwise mark a freshly loaded form as dirty.
 */
export function withFieldKeys(values: FieldValues, paths: readonly string[]): FieldValues {
  const out: FieldValues = structuredClone(values);
  for (const path of paths) {
    const parts = path.split(".");
    let node: FieldValues = out;
    for (const [i, part] of parts.entries()) {
      if (i === parts.length - 1) {
        if (!(part in node)) node[part] = undefined;
      } else {
        node[part] ??= {};
        node = node[part] as FieldValues;
      }
    }
  }
  return out;
}
