import { TailorStudio } from "@/components/cms/TailorStudio";
import type { BankItem, TailorFacts, TemplateChoice } from "@/components/cms/tailor-ui";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, offeredCvTemplates } from "@/content/cv-templates";
import { MAX_TAILORED, pickEngine, TAILOR_ENGINES } from "@/content/tailor";
import { getCmsContext } from "@/lib/cms-data";
import { env } from "@/lib/env";
import { tailorQuota } from "@/lib/ratelimit";
import { listTailored, tailoredUndo } from "@/lib/tailor/service";

export const metadata = { title: "Tailor to a job" };

const years = (from: number, to?: number) => `${from} – ${to ?? "Present"}`;

export default async function TailorPage() {
  const { account, draft } = await getCmsContext();
  const keys = env();
  const engine = pickEngine(account.plan, {
    claude: Boolean(keys.ANTHROPIC_API_KEY),
    groq: Boolean(keys.GROQ_API_KEY),
  });
  const [saved, undo, quota] = await Promise.all([
    listTailored(account.slug),
    tailoredUndo(account.slug),
    engine ? tailorQuota(engine, account.slug) : Promise.resolve(null),
  ]);

  const facts: TailorFacts = {
    headline: draft.profile.headline,
    summary: draft.profile.summary,
    experiences: draft.experiences.map((e) => ({
      id: e.id,
      title: `${e.role}, ${e.company}`,
      sub: years(e.startYear, e.endYear),
      notes: e.notes ?? "",
    })),
    projects: draft.projects.map((p) => ({ id: p.id, title: p.title, sub: p.role })),
    certifications: draft.certifications.map((c) => ({ id: c.id, title: c.title, sub: `${c.issuer}, ${c.year}` })),
  };
  const bank: BankItem[] = saved.map((v) => ({
    id: v.id,
    name: v.name,
    jobTitle: v.jobTitle,
    jobCompany: v.jobCompany,
    jobSource: v.jobSource,
    updatedAt: v.updatedAt,
    overlay: v.overlay,
  }));
  const templates: TemplateChoice[] = CV_TEMPLATE_IDS.map((id) => ({ id, label: CV_TEMPLATES[id].label }));

  return (
    <main className="cms-content">
      <TailorStudio
        engine={engine}
        upgradeHint={account.plan !== "pro"}
        quota={quota ?? (engine ? { remaining: 0, limit: TAILOR_ENGINES[engine].dailyRuns } : null)}
        quotaKnown={quota !== null}
        facts={facts}
        bank={bank}
        maxSaved={MAX_TAILORED}
        restore={undo ? { label: undo.label, takenAt: undo.takenAt } : null}
        templates={templates}
        defaultTemplate={offeredCvTemplates(draft.settings)[0] ?? "modern"}
        hasContent={draft.experiences.length + draft.projects.length > 0 || Boolean(draft.profile.summary.trim())}
      />
    </main>
  );
}
