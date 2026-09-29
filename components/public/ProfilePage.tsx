import { ActionBar } from "./ActionBar";
import { Contact } from "./Contact";
import { Credentials } from "./Credentials";
import { Experience } from "./Experience";
import { Hero } from "./Hero";
import { ProjectSchedule } from "./ProjectSchedule";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { Testimonials } from "./Testimonials";
import { ViewBeacon } from "./ViewBeacon";
import { toCardData, type PageContext } from "./view-model";

/** The whole public profile (PRD §3.1), rendered from one site document (published or draft preview). */
export function ProfilePage(ctx: PageContext) {
  const { site, basePath } = ctx;
  return (
    <div className="pp" data-theme={site.settings.theme}>
      <SiteHeader {...ctx} />
      <main>
        <Hero {...ctx} />
        {site.projects.length > 0 && (
          <section id="projects" className="pp-section" aria-labelledby="projects-title">
            <div className="pp-wrap">
              <div className="pp-section-head">
                <div>
                  <span className="sp-label">
                    Drawing schedule · {site.projects.length} {site.projects.length === 1 ? "sheet" : "sheets"}
                  </span>
                  <h2 id="projects-title" className="sp-heading">
                    Projects
                  </h2>
                </div>
              </div>
              <ProjectSchedule projects={site.projects.map((p) => toCardData(site, p))} basePath={basePath} />
            </div>
          </section>
        )}
        <Experience {...ctx} />
        <Credentials {...ctx} />
        <Testimonials {...ctx} />
        <Contact {...ctx} />
      </main>
      <SiteFooter {...ctx} />
      <ActionBar {...ctx} />
      {!ctx.preview && <ViewBeacon slug={ctx.slug} />}
    </div>
  );
}
