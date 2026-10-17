import { ProfileEditor } from "@/components/cms/ProfileEditor";
import { getCmsContext } from "@/lib/cms-data";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { account, draft } = await getCmsContext();
  // Contact channels are edited in Settings; the editor schema would ignore them anyway.
  const { name, firstName, headline, summary, location, availability, yearsExperience, avatar, phone } = draft.profile;
  const profile = {
    ...{ name, firstName, headline, summary, location, availability, yearsExperience, avatar, phone },
    private: draft.profile.private,
    visibility: draft.profile.visibility,
  };
  const competencies = Array.from({ length: 6 }, (_, i) => draft.competencies[i] ?? "");
  const research = draft.research ?? { title: "", year: undefined, summary: "" };
  return (
    <main className="cms-content">
      <ProfileEditor defaultValues={{ profile, competencies, research }} slug={account.slug} />
    </main>
  );
}
