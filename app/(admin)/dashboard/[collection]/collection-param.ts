import "server-only";
import { notFound } from "next/navigation";
import { CollectionNameSchema, type CollectionName } from "@/content/schemas";

/** `[collection]` must be a registered collection; anything else is a 404. */
export function parseCollection(value: string): CollectionName {
  const parsed = CollectionNameSchema.safeParse(value);
  if (!parsed.success) notFound();
  return parsed.data;
}
