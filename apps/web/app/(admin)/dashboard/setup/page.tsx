import { SetupWizard } from "@/components/cms/SetupWizard";
import { SkipSetup } from "@/components/cms/SkipSetup";
import { publicCvTemplate } from "@/content/cv-templates";
import { setupLocked, STEP_IDS, type SetupData, type StepId } from "@/content/setup";
import { getCmsContext } from "@/lib/cms-data";
import { publicSiteUrl } from "@/lib/env";

export const metadata = { title: "Setup guide" };

type Props = { searchParams: Promise<{ step?: string }> };

export default async function SetupPage({ searchParams }: Props) {
  const { account, draft, published } = await getCmsContext();
  const { profile } = draft;
  const data: SetupData = {
    slug: account.slug,
    pageUrl: new URL(`/${account.slug}`, publicSiteUrl()).toString(),
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    availability: profile.availability ?? "",
    yearsExperience: profile.yearsExperience ? String(profile.yearsExperience) : "",
    avatar: profile.avatar ?? "",
    whatsapp: profile.whatsapp,
    publicEmail: profile.publicEmail,
    phone: profile.phone ?? "",
    cvTemplate: publicCvTemplate(draft.settings),
    counts: {
      projects: draft.projects.length,
      experiences: draft.experiences.length,
      education: draft.education.length,
      certifications: draft.certifications.length,
    },
    projects: draft.projects.map((p) => ({ id: p.id, title: p.title })),
    published: Boolean(published),
    version: draft.updatedAt,
  };

  // A link with ?step= opens that step; otherwise the guide opens where the person still has something to do.
  const { step: wanted } = await searchParams;
  const asked = STEP_IDS.find((id) => id === wanted);
  const pristine =
    !profile.summary && !profile.location && draft.experiences.length === 0 && draft.education.length === 0;
  const first: StepId = pristine
    ? "start"
    : !profile.summary || !profile.location
      ? "about"
      : !profile.whatsapp
        ? "contact"
        : "publish";

  const locked = setupLocked({ ...data, skipped: draft.settings.setupSkipped });

  return (
    <main className="cms-content">
      <h1 className="cms-title">Setup guide</h1>
      {locked && <SkipSetup />}
      <SetupWizard data={data} initialStep={asked ?? first} />
    </main>
  );
}
