import { Insights } from "@/components/cms/Insights";
import { LocalTime } from "@/components/cms/LocalTime";
import { publishState } from "@/content/cms";
import { projectCover } from "@/content/covers";
import { CV_TEMPLATES, publicCvTemplate } from "@/content/cv-templates";
import { ago, changeLabel, monthChange, profileStrength, weeklyViews } from "@/content/insights";
import { CATEGORY_LABELS } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import { publicSiteUrl } from "@/lib/env";
import { countLeads, getCvDownloads, getDayViews, getProjectViews, listLeads } from "@/lib/site";

export const metadata = { title: "Overview" };

const STATE_LABEL = {
  live: "Live",
  changes: "Unpublished changes",
  unpublished: "Not published",
  suspended: "Suspended · contact support",
} as const;

export default async function OverviewPage() {
  const { account, draft, published, unread } = await getCmsContext();
  const now = new Date();
  // 84 days = twelve whole weeks for the chart, and enough for this month against last month.
  const [days, projectViews, leadTotal, latest, cvDownloads] = await Promise.all([
    getDayViews(account.slug, 84, now),
    getProjectViews(
      account.slug,
      draft.projects.map((p) => p.id),
    ),
    countLeads(account.slug),
    listLeads(account.slug, 0, 3),
    getCvDownloads(account.slug),
  ]);
  const month = monthChange(days);
  const topProjects = [...draft.projects]
    .map((p) => ({ p, views: projectViews[p.id] ?? 0 }))
    .filter((x) => x.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map(({ p, views }) => ({
      id: p.id,
      title: p.title,
      sub: [CATEGORY_LABELS[p.category], p.location].filter(Boolean).join(", "),
      views,
      cover: projectCover(p),
    }));
  const state = publishState(draft, published);
  const { profile } = draft;
  const withPhotos = draft.projects.filter((p) => p.images.length > 0).length;
  const strength = profileStrength({
    avatar: profile.avatar,
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    whatsapp: profile.whatsapp,
    projects: draft.projects.length,
    projectsWithPhotos: withPhotos,
    experiences: draft.experiences.length,
    certifications: draft.certifications.length,
    published: state === "live" || state === "changes",
  });
  const live = Boolean(published);
  const lede = !live
    ? "Your page is not live yet. Publish it when you are ready to share your link."
    : month.current === 0
      ? "Your page is live. Share your link to start seeing visits."
      : `Your page was opened ${month.current.toLocaleString("en")} times in the last 30 days.`;
  return (
    <main className="cms-content cms-content--wide">
      <Insights
        data={{
          name: profile.name,
          firstName: profile.firstName,
          headline: profile.headline,
          slug: account.slug,
          pageUrl: new URL(`/${account.slug}`, publicSiteUrl()).toString(),
          avatar: profile.avatar,
          live,
          state: {
            label: STATE_LABEL[state],
            tone: state === "live" ? "live" : state === "changes" ? "changes" : "off",
          },
          lede,
          views: {
            total: month.current,
            note: changeLabel(month),
            change: month.change,
            spark: days.slice(-30).map((d) => d.views),
          },
          enquiries: { total: leadTotal, unread },
          cv: { downloads: cvDownloads, layout: CV_TEMPLATES[publicCvTemplate(draft.settings)].label },
          projects: { total: draft.projects.length, withPhotos },
          weeks: weeklyViews(days),
          topProjects,
          latestLeads: latest.map((l) => ({
            id: l.id,
            name: l.name,
            message: l.message,
            ago: ago(l.createdAt, now),
            unread: !l.read,
          })),
          strength,
          covers: draft.projects.slice(0, 3).map(projectCover),
        }}
      />
      <p className="ov-foot">
        Last published {published?.publishedAt ? <LocalTime iso={published.publishedAt} format="datetime" /> : "never"}.
        Page views count the last 30 days; CV downloads count clicks on your Download CV button.
      </p>
    </main>
  );
}
