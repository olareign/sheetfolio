import { CvLayoutsForm } from "@/components/cms/CvLayoutsForm";
import { PasswordForm } from "@/components/cms/PasswordForm";
import { SettingsForm } from "@/components/cms/SettingsForm";
import { offeredCvTemplates } from "@/content/cv-templates";
import { getCmsContext } from "@/lib/cms-data";
import { getCredentials } from "@/lib/credentials";

export const metadata = { title: "Settings" };

type Props = { searchParams: Promise<{ changed?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { changed } = await searchParams;
  const { email, account, draft } = await getCmsContext();
  const credentials = await getCredentials(email);
  const { whatsapp, whatsappMessage, publicEmail } = draft.profile;
  return (
    <main className="cms-content">
      <SettingsForm
        defaultValues={{ theme: draft.settings.theme, whatsapp, whatsappMessage, publicEmail }}
        slug={account.slug}
      />
      <CvLayoutsForm
        initial={{
          cvTemplates: draft.settings.cvTemplates,
          cvTemplate: offeredCvTemplates(draft.settings)[0] ?? draft.settings.cvTemplate,
        }}
      />
      <PasswordForm username={credentials ? (credentials.username ?? email) : null} changed={changed === "password"} />
    </main>
  );
}
