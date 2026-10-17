import { notFound } from "next/navigation";
import { ItemForm } from "@/components/cms/ItemForm";
import { cms, relationOptions } from "@/content/cms";
import type { CollectionName } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import { parseCollection } from "../collection-param";

type Params = { params: Promise<{ collection: string; id: string }> };

export async function generateMetadata({ params }: Params) {
  const { collection, id } = await params;
  const name = parseCollection(collection);
  return { title: `${id === "new" ? "New" : "Edit"} ${cms[name].singular}` };
}

export default async function ItemPage({ params }: Params) {
  const { collection, id } = await params;
  const name = parseCollection(collection);
  const { account, draft } = await getCmsContext();

  let values: Record<string, unknown>;
  if (id === "new") {
    values = cms[name].newItem(draft, new Date());
  } else {
    const item = (draft[name] as { id: string }[]).find((i) => i.id === id);
    if (!item) notFound();
    values = item;
  }

  const relations: Partial<Record<CollectionName, { value: string; label: string }[]>> = {};
  for (const target of Object.values(cms[name].fieldOptions?.relations ?? {})) {
    relations[target] = relationOptions(draft, target);
  }

  return (
    <ItemForm
      key={id}
      collection={name}
      id={id}
      defaultValues={values}
      relationOptions={relations as Record<string, { value: string; label: string }[]>}
      slug={account.slug}
    />
  );
}
