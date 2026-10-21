import { CvLayoutsForm } from "@/components/cms/CvLayoutsForm";
import { offeredCvTemplates } from "@/content/cv-templates";
import { getCmsContext } from "@/lib/cms-data";

export const metadata = { title: "CV" };

export default async function CvPage() {
  const { draft } = await getCmsContext();
  const [first] = offeredCvTemplates(draft.settings);
  return (
    <main className="cms-content">
      <h1 className="cms-title">CV</h1>
      <CvLayoutsForm
        initial={{ cvTemplates: draft.settings.cvTemplates, cvTemplate: first ?? draft.settings.cvTemplate }}
        draftVersion={draft.updatedAt}
      />
    </main>
  );
}
