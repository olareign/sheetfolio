import { CvLayoutsForm } from "@/components/cms/CvLayoutsForm";
import { publicCvTemplate } from "@/content/cv-templates";
import { getCmsContext } from "@/lib/cms-data";

export const metadata = { title: "CV" };

export default async function CvPage() {
  const { draft } = await getCmsContext();
  return (
    <main className="cms-content">
      <h1 className="cms-title">CV</h1>
      <CvLayoutsForm initial={publicCvTemplate(draft.settings)} draftVersion={draft.updatedAt} />
    </main>
  );
}
