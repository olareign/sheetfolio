import { SettingsForm } from "@/components/cms/SettingsForm";
import { getCmsContext } from "@/lib/cms-data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { account, draft } = await getCmsContext();
  const { whatsapp, whatsappMessage, publicEmail } = draft.profile;
  return (
    <main className="cms-content">
      <SettingsForm
        defaultValues={{ theme: draft.settings.theme, whatsapp, whatsappMessage, publicEmail }}
        slug={account.slug}
      />
    </main>
  );
}
