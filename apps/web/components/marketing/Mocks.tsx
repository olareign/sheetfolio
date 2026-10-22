import Image from "next/image";
import { Avatar } from "./Avatar";

const WEEKS = [28, 34, 30, 46, 42, 58, 54, 72, 66, 88, 80, 104];

function Bars({ values, height = 56 }: { values: readonly number[]; height?: number }) {
  return (
    <div className="mk-bars" style={{ height }} aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="mk-bar" style={{ height: `${v}%`, animationDelay: `${i * 0.06}s` }} />
      ))}
    </div>
  );
}

function Lines({ n }: { n: number }) {
  const widths = [100, 86, 92, 60, 78];
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="mk-line" style={{ width: `${widths[i % 5]}%` }} />
      ))}
    </>
  );
}

/** A visitor's view of a portfolio page. */
export function PortfolioMock() {
  return (
    <div className="mk-mock">
      <div className="mk-mock-row">
        <Avatar person="amara" size={40} />
        <div>
          <b>Amara Okafor</b>
          <div className="mk-muted">Site Engineer, Lagos</div>
        </div>
      </div>
      <div className="mk-mock-photo">
        <Image src="/stock/projects/building.jpg" alt="A tall building under construction with a crane" fill sizes="320px" />
      </div>
      <div className="mk-hc-chips">
        <span className="mk-chip mk-chip--on">Building</span>
        <span className="mk-chip">Completed</span>
      </div>
      <Lines n={3} />
    </div>
  );
}

/** The dashboard's CV layout switches. */
export function CvMock() {
  const layouts: [string, boolean][] = [["Classic", true], ["Modern", true], ["Projects", false], ["Minimal", true]];
  return (
    <div className="mk-mock">
      <b>Layouts on your page</b>
      {layouts.map(([name, on]) => (
        <div key={name} className="mk-switch-row">
          <span>{name}</span>
          <span className={on ? "mk-switch mk-switch--on" : "mk-switch"} aria-label={on ? "On" : "Off"} role="img" />
        </div>
      ))}
    </div>
  );
}

export function LeadsMock() {
  const leads = [
    { person: "ngozi", name: "Ngozi E.", text: "Can we talk about a clinic build?", unread: true },
    { person: "emeka", name: "Emeka O.", text: "Interested in your road work.", unread: false },
    { person: "bisi", name: "Bisi L.", text: "Are you available in March?", unread: false },
  ] as const;
  return (
    <div className="mk-mock">
      <b>Leads</b>
      {leads.map((l) => (
        <div key={l.name} className="mk-lead-row">
          <Avatar person={l.person} size={30} />
          <div>
            <b>{l.name}</b>
            <div className="mk-muted">{l.text}</div>
          </div>
          {l.unread && <span className="mk-dot" aria-label="Unread" role="img" />}
        </div>
      ))}
    </div>
  );
}

export function InsightsMock() {
  return (
    <div className="mk-mock">
      <b>Views, last 7 days</b>
      <span className="mk-big">248</span>
      <Bars values={[30, 45, 38, 60, 52, 78, 90]} height={70} />
      <span className="mk-muted">Sample data</span>
    </div>
  );
}

/** The Home page dashboard preview, with example figures. */
export function DashboardPreview() {
  const kpis = [
    ["Page views", "1,284", "+18% this month"],
    ["Enquiries", "23", "5 unread"],
    ["CV downloads", "86", "Modern is most used"],
    ["Projects", "9", "3 with photos"],
  ];
  const top = [
    ["/stock/projects/healthcare.jpg", "Geriatric Centre", "Healthcare, Lagos", "412"],
    ["/stock/projects/road.jpg", "Departmental road works", "Roads, Ondo", "268"],
    ["/stock/projects/education.jpg", "School block, Ilaje", "Education, Ondo", "171"],
  ];
  const leads = [
    ["ngozi", "Ngozi E.", "Can we talk about a clinic build?", "2h", true],
    ["emeka", "Emeka O.", "Interested in your road work.", "1d", true],
    ["bisi", "Bisi L.", "Are you available in March?", "3d", false],
  ] as const;
  return (
    <>
      <div className="mk-dash">
        <div className="mk-dash-inner">
          <div className="mk-dash-head">
            <div className="mk-mock-row">
              <Avatar person="amara" size={40} />
              <div>
                <b>Amara Okafor</b>
                <div className="mk-muted">sheetfolio.vercel.app/amara-okafor</div>
              </div>
            </div>
            <span className="mk-chip mk-chip--on">Published</span>
          </div>
          <div className="mk-kpis">
            {kpis.map(([label, value, delta]) => (
              <div key={label} className="mk-kpi">
                <span className="mk-muted">{label}</span>
                <b>{value}</b>
                <span className="mk-kpi-delta">{delta}</span>
              </div>
            ))}
          </div>
          <div className="mk-dash-grid">
            <div className="mk-dash-card">
              <b>Views by week</b>
              <Bars values={WEEKS.map((w) => Math.round((w / 104) * 100))} height={130} />
              <div className="mk-dash-axis">
                <span>Week 1</span>
                <span>Week 12</span>
              </div>
            </div>
            <div className="mk-dash-card">
              <b>Most opened projects</b>
              {top.map(([src, title, sub, n]) => (
                <div key={title} className="mk-top-row">
                  <span className="mk-top-thumb">
                    <Image src={src ?? ""} alt="" fill sizes="56px" />
                  </span>
                  <div>
                    <b>{title}</b>
                    <div className="mk-muted">{sub}</div>
                  </div>
                  <b className="mk-num">{n}</b>
                </div>
              ))}
            </div>
            <div className="mk-dash-card">
              <b>Latest enquiries</b>
              {leads.map(([person, name, text, when, unread]) => (
                <div key={name} className="mk-lead-row">
                  <Avatar person={person} size={34} />
                  <div>
                    <b>{name}</b>
                    <div className="mk-muted">{text}</div>
                  </div>
                  <span className="mk-muted">{when}</span>
                  {unread && <span className="mk-dot mk-pulse" aria-label="Unread" role="img" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mk-note">Sample dashboard with example figures.</p>
    </>
  );
}

export function CvPreviewMock() {
  return (
    <div className="mk-mock mk-mock--wide">
      <b>Preview your CV</b>
      <div className="mk-tabs">
        <span>Classic</span>
        <span className="mk-tabs-on">Modern</span>
        <span>Minimal</span>
      </div>
      <div className="mk-cv-sheet">
        <Lines n={9} />
      </div>
    </div>
  );
}

export const MOCK_BY_NAME = { portfolio: PortfolioMock, cv: CvMock, leads: LeadsMock, insights: InsightsMock } as const;
