"use client";

import { Controller, get, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { FieldSpec } from "@/content/form-spec";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { ImageList } from "./ImageList";
import { UploadField } from "./UploadField";

export type Option = { value: string; label: string };

// Inputs yield strings; the schemas want numbers / undefined. Blank optional → undefined so it validates and clears.
const toNumber = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v));
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Renders one generated field (PRD §4.2 mapping) bound to react-hook-form. */
export function FieldRenderer({
  spec,
  form,
  name = spec.name,
  relationOptions = [],
  slug,
  title = "",
  hint: hintOverride,
}: {
  spec: FieldSpec;
  form: UseFormReturn<FieldValues>;
  /** Form path, when the field sits inside a nested object (e.g. "profile.name"). */
  name?: string;
  relationOptions?: Option[];
  slug: string;
  /** Item title, for photo alt text. */
  title?: string;
  hint?: string;
}) {
  const id = `f-${name.replace(/\./g, "-")}`;
  const error = get(form.formState.errors, name)?.message as string | undefined;
  const hint =
    hintOverride ?? (spec.kind === "textarea" && spec.maxLength ? `Up to ${spec.maxLength} characters` : undefined);
  const common = {
    id,
    className: "sp-input",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": fieldDescribedBy(id, { hint, error }),
  };
  // Blank optional text → undefined so it clears; but a field with a schema default (e.g. scope: "")
  // keeps "" so a stored empty value doesn't read as an unsaved change.
  const optionalText = spec.required || spec.hasDefault ? {} : { setValueAs: blankToUndefined };

  let control: React.ReactNode;
  switch (spec.kind) {
    case "text":
    case "email":
      control = (
        <input {...common} type={spec.kind} maxLength={spec.maxLength} {...form.register(name, optionalText)} />
      );
      break;
    case "textarea":
      control = <textarea {...common} rows={5} maxLength={spec.maxLength} {...form.register(name, optionalText)} />;
      break;
    case "number":
      control = (
        <input
          {...common}
          className="sp-input cms-number"
          type="number"
          inputMode="numeric"
          step="any"
          {...form.register(name, { setValueAs: toNumber })}
        />
      );
      break;
    case "select":
    case "relation": {
      const options = spec.kind === "select" ? (spec.options ?? []) : relationOptions;
      control = (
        <select {...common} {...form.register(name, { setValueAs: blankToUndefined })}>
          {((!spec.required && !spec.hasDefault) || spec.kind === "relation") && (
            <option value="">{spec.required ? "Choose…" : "None"}</option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case "checkbox":
      return (
        <label className="cms-check">
          <input type="checkbox" id={id} {...form.register(name)} />
          {spec.label}
        </label>
      );
    case "upload":
      control = (
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <UploadField
              id={id}
              value={field.value as string | undefined}
              onChange={field.onChange}
              kind={spec.upload ?? "image"}
              slug={slug}
              folder={spec.upload === "document" ? "certificates" : "images"}
              describedBy={common["aria-describedby"]}
            />
          )}
        />
      );
      break;
    case "images":
      control = (
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <ImageList id={id} value={field.value ?? []} onChange={field.onChange} slug={slug} title={title} />
          )}
        />
      );
      break;
  }

  return (
    <Field id={id} label={spec.label} required={spec.required} hint={hint} error={error}>
      {control}
    </Field>
  );
}
