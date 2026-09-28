import { Plus } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { cms } from "@/content/cms";
import { collections } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import { parseCollection } from "./collection-param";

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  return { title: collections[parseCollection((await params).collection)].label };
}

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  const name = parseCollection((await params).collection);
  const { draft } = await getCmsContext();
  const config = cms[name];
  return (
    <div className="cms-empty">
      <h1 className="cms-title">{collections[name].label}</h1>
      <p>{draft[name].length ? `Select a ${config.singular} to edit it, or add a new one.` : config.empty}</p>
      <Button
        href={`/dashboard/${name}/new`}
        variant="primary"
        icon={<Plus size={18} strokeWidth={1.5} aria-hidden="true" />}
      >
        Add {config.singular}
      </Button>
    </div>
  );
}
