import type { ReactNode } from "react";
import { CollectionList } from "@/components/cms/CollectionList";
import { cms, listRows } from "@/content/cms";
import { collections } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import { parseCollection } from "./collection-param";

/** List pane (persists while moving between items) | editor pane. */
export default async function CollectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ collection: string }>;
}) {
  const name = parseCollection((await params).collection);
  const { draft } = await getCmsContext();
  return (
    <div className="cms-panes">
      <CollectionList
        collection={name}
        label={collections[name].label}
        singular={cms[name].singular}
        rows={listRows(name, draft[name])}
      />
      <main className="cms-editor">{children}</main>
    </div>
  );
}
