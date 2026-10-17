import { z } from "zod";
import type { CollectionName } from "./schemas";

/*
 * Turns a Zod object schema into a list of form fields (PRD §4.2 field mapping).
 * Pure and serialisable, so the same spec renders the CMS form and can be unit-tested.
 */

export type UploadKind = "image" | "document";

export type FieldKind =
  "text" | "email" | "textarea" | "number" | "select" | "checkbox" | "upload" | "images" | "relation";

export type FieldSpec = {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  /** Has a schema default, so leaving it empty is fine but "no value" is not a choice. */
  hasDefault?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
  upload?: UploadKind;
  relation?: CollectionName;
  /** Spans the full row of the form grid. */
  wide: boolean;
};

export type DescribeOptions = {
  /** Fields not rendered (e.g. `id`). */
  skip?: readonly string[];
  /** URL fields and what they accept. Any other `z.url()` field defaults to an image upload. */
  uploads?: Readonly<Record<string, UploadKind>>;
  /** Id fields that point at another collection. */
  relations?: Readonly<Record<string, CollectionName>>;
};

/** Strings longer than this become a textarea (PRD §4.2). */
export const TEXTAREA_THRESHOLD = 200;

/** "external-works" → "External works", "endYear" → "End year". */
export function humanize(value: string): string {
  const spaced = value
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type Unwrapped = { inner: z.ZodType; optional: boolean; hasDefault: boolean; description?: string };

function unwrap(schema: z.ZodType): Unwrapped {
  let inner = schema;
  let optional = false;
  let hasDefault = false;
  let description = schema.description;
  for (;;) {
    if (inner instanceof z.ZodOptional || inner instanceof z.ZodNullable) {
      optional = true;
      inner = inner.unwrap() as z.ZodType;
    } else if (inner instanceof z.ZodDefault || inner instanceof z.ZodPrefault) {
      optional = true; // a default means the user may leave it empty
      hasDefault = true;
      inner = inner.unwrap() as z.ZodType;
    } else {
      break;
    }
    description ??= inner.description;
  }
  return { inner, optional, hasDefault, description };
}

function describeField(name: string, schema: z.ZodType, opts: DescribeOptions): FieldSpec | null {
  const { inner, optional, hasDefault, description } = unwrap(schema);
  const base = { name, label: description ?? humanize(name), required: !optional, hasDefault, wide: false };

  if (opts.relations?.[name]) return { ...base, kind: "relation", relation: opts.relations[name] };
  if (inner instanceof z.ZodURL || opts.uploads?.[name]) {
    return { ...base, kind: "upload", upload: opts.uploads?.[name] ?? "image", wide: true };
  }
  if (inner instanceof z.ZodEmail) return { ...base, kind: "email" };
  if (inner instanceof z.ZodString) {
    const maxLength = inner.maxLength ?? undefined;
    const long = maxLength !== undefined && maxLength > TEXTAREA_THRESHOLD;
    return { ...base, kind: long ? "textarea" : "text", maxLength, wide: long };
  }
  if (inner instanceof z.ZodNumber) return { ...base, kind: "number" };
  if (inner instanceof z.ZodBoolean) return { ...base, kind: "checkbox", required: false };
  if (inner instanceof z.ZodEnum) {
    const options = (inner.options as string[]).map((value) => ({ value, label: humanize(value) }));
    return { ...base, kind: "select", options };
  }
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject && "url" in inner.element.shape) {
    return { ...base, kind: "images", required: false, wide: true };
  }
  return null; // unsupported shapes are not rendered; add a mapping here when a schema needs one
}

export function describeFields(schema: z.ZodObject, opts: DescribeOptions = {}): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const [name, field] of Object.entries(schema.shape)) {
    if (opts.skip?.includes(name)) continue;
    const spec = describeField(name, field as z.ZodType, opts);
    if (spec) out.push(spec);
  }
  return out;
}

/** Zod issues → `{ "images.0.url": "message" }`, first message per path. Pathless issues go under `""`. */
export function issuesToFieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    out[key] ??= issue.message;
  }
  return out;
}
