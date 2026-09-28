"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch, type FieldValues, type Resolver } from "react-hook-form";
import { deleteItemAction, saveItemAction } from "@/app/(admin)/dashboard/actions";
import { cms, collectionFields } from "@/content/cms";
import { collections, type CollectionName } from "@/content/schemas";
import { Button } from "@/components/sp/Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldRenderer, type Option } from "./FieldRenderer";
import { applyServerErrors, withFieldKeys } from "./form-result";
import { LocalTime } from "./LocalTime";

type Props = {
  collection: CollectionName;
  /** Existing item id, or "new". */
  id: string;
  defaultValues: FieldValues;
  relationOptions: Record<string, Option[]>;
  slug: string;
};

/** One generic editor for every collection: fields, validation and labels all come from the Zod schema. */
export function ItemForm({ collection, id, defaultValues, relationOptions, slug }: Props) {
  const router = useRouter();
  const fields = useMemo(() => collectionFields(collection), [collection]);
  const config = cms[collection];
  const isNew = id === "new";

  const form = useForm<FieldValues>({
    // The schema is picked at runtime from the registry, so its static type is a union of every
    // collection's schema; the form works on plain field values and the server re-validates anyway.
    resolver: zodResolver(collections[collection].schema) as unknown as Resolver<FieldValues>,
    // `id` rides along so the schema's required id passes; the server assigns the real one for "new".
    defaultValues: withFieldKeys(
      { ...defaultValues, id },
      fields.map((f) => f.name),
    ),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const title = String(useWatch({ control: form.control, name: config.titleField }) ?? "");

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveItemAction(collection, id, values);
    if (!result.ok) {
      setFormError(applyServerErrors(form, result));
      return;
    }
    if (isNew && result.id) {
      router.replace(`/dashboard/${collection}/${result.id}`);
      return;
    }
    form.reset(form.getValues());
    setSavedAt(result.at);
  });

  function onDelete() {
    startDelete(async () => {
      const result = await deleteItemAction(collection, id);
      if (!result.ok) {
        setConfirming(false);
        setFormError(result.formError ?? "Couldn't delete this item.");
        return;
      }
      router.replace(`/dashboard/${collection}`);
    });
  }

  const { isSubmitting, isDirty } = form.formState;

  return (
    <form className="cms-form" onSubmit={onSubmit} noValidate>
      <div className="cms-form-head">
        <h1 className="cms-title">{isNew ? `New ${config.singular}` : title || `Edit ${config.singular}`}</h1>
        {defaultValues.drawingNo !== undefined && <span className="sp-label">{String(defaultValues.drawingNo)}</span>}
      </div>
      {formError && (
        <p className="sp-alert" role="alert">
          {formError}
        </p>
      )}
      <div className="cms-grid">
        {fields.map((spec) => (
          <div key={spec.name} className={spec.wide ? "cms-wide" : undefined}>
            <FieldRenderer
              spec={spec}
              form={form}
              relationOptions={spec.relation ? relationOptions[spec.relation] : undefined}
              slug={slug}
              title={title}
              hint={config.hints?.[spec.name]}
            />
          </div>
        ))}
      </div>
      <div className="cms-actions">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isNew ? `Add ${config.singular}` : "Save draft"}
        </Button>
        <span className="sp-annot" aria-live="polite">
          {isDirty ? (
            "Unsaved changes"
          ) : savedAt ? (
            <>
              Saved <LocalTime iso={savedAt} format="time" />
            </>
          ) : null}
        </span>
        <span className="cms-spacer" />
        {!isNew && (
          <Button
            variant="ghost"
            className="cms-danger"
            onClick={() => setConfirming(true)}
            icon={<Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />}
          >
            Delete
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Delete this ${config.singular}?`}
        body={`“${title || config.singular}” will be removed from your draft. Your live page keeps it until you publish.`}
        confirmLabel="Delete"
        pending={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
