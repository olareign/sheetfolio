"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/** What a form tells the dashboard: whether it holds edits that were never saved, and how to save them. */
type Entry = { dirty: boolean; save: () => Promise<boolean> };

type Registry = {
  add: (entry: { current: Entry }) => () => void;
  /** Forms with unsaved edits right now. */
  unsaved: () => Entry[];
};

function createRegistry(): Registry {
  const entries = new Set<{ current: Entry }>();
  return {
    add(entry) {
      entries.add(entry);
      return () => void entries.delete(entry);
    },
    unsaved: () => [...entries].map((e) => e.current).filter((e) => e.dirty),
  };
}

const RegistryContext = createContext<Registry | null>(null);

/**
 * Lives in the dashboard layout so the Publish button in the top bar can ask the form on the page whether it
 * has edits the draft doesn't have yet. Forms hold their edits in the browser until "Save draft", so only they know.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(createRegistry);
  return <RegistryContext value={registry}>{children}</RegistryContext>;
}

/** Called by the top bar. Empty outside the provider, so a form shown elsewhere is simply never "unsaved". */
export function useUnsavedForms(): () => Entry[] {
  const registry = useContext(RegistryContext);
  return () => registry?.unsaved() ?? [];
}

/**
 * A form calls this each render with whether it is dirty and a `save` that resolves true only when the draft
 * was updated (false for a validation or server error, which the form shows itself).
 */
export function useUnsavedChanges(dirty: boolean, save: () => Promise<boolean>): void {
  const registry = useContext(RegistryContext);
  const entry = useRef<Entry>({ dirty, save });
  useEffect(() => {
    entry.current = { dirty, save };
  });
  useEffect(() => registry?.add(entry), [registry]);
}

/**
 * True when the person has changed a field. react-hook-form's own `isDirty` compares every registered value with
 * the defaults, and some inputs normalise their value as they mount, so it can be true on a page nobody touched;
 * `dirtyFields` only fills in when a field is actually edited, and empties again when it is put back.
 */
export function hasEdits(state: { dirtyFields: object }): boolean {
  return Object.keys(state.dirtyFields).length > 0;
}

/**
 * Submits a react-hook-form form and reports whether the save went through. `handleSubmit` resolves either way
 * (a validation error never reaches `persist`), so success is whatever `persist` last returned.
 */
export async function saveForm<V extends FieldValues>(
  form: UseFormReturn<V>,
  persist: (values: V) => Promise<boolean>,
): Promise<boolean> {
  let ok = false;
  await form.handleSubmit(async (values) => {
    ok = await persist(values);
  })();
  return ok;
}
