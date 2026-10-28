import Image from "next/image";
import { AutoSlide } from "./AutoSlide";
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
        <Avatar label="YN" size={40} />
        <div>
          <b>Your name</b>
          <div className="mk-muted">Your headline, your city</div>
        </div>
      </div>
      <div className="mk-mock-photo">
        <Image
          src="/stock/projects/building.jpg"
          alt="A tall building under construction with a crane"
          fill
          sizes="320px"
        />
      </div>
      <div className="mk-hc-chips">
        <span className="mk-chip mk-chip--on">Building</span>
        <span className="mk-chip">Completed</span>
      </div>
      <Lines n={3} />
    </div>
  );
}

/** The dashboard's CV picker: the owner chooses one layout; visitors get that one. */
export function CvMock() {
  const layouts = ["Classic", "Modern", "Projects first", "Minimal"];
  const chosen = "Modern";
  return (
    <div className="mk-mock">
      <b>CV on your page</b>
      {layouts.map((name) => (
        <div key={name} className={name === chosen ? "mk-switch-row mk-switch-row--on" : "mk-switch-row"}>
          <span>{name}</span>
          <span
            className={name === chosen ? "mk-radio mk-radio--on" : "mk-radio"}
            role="img"
            aria-label={name === chosen ? "Chosen" : "Not chosen"}
          />
        </div>
      ))}
      <span className="mk-muted">Visitors download the Modern layout</span>
    </div>
  );
}

export function LeadsMock() {
  const leads = [
    { label: "C", name: "A client", text: "Can we talk about a clinic build?", unread: true },
    { label: "R", name: "A recruiter", text: "Interested in your road work.", unread: false },
    { label: "V", name: "A visitor", text: "Are you available in March?", unread: false },
  ] as const;
  return (
    <div className="mk-mock">
      <b>Leads</b>
      {leads.map((l) => (
        <div key={l.name} className="mk-lead-row">
          <Avatar label={l.label} size={30} />
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
    </div>
  );
}

/** The Home page dashboard preview, with example figures. */
export function DashboardPreview() {
  const kpis = [
    ["Page views", "1,284", "+18% this month"],
    ["Enquiries", "23", "5 unread"],
    ["CV downloads", "86", "Modern layout"],
    ["Projects", "9", "3 with photos"],
  ];
  const top = [
    ["/stock/projects/healthcare.jpg", "Geriatric Centre", "Healthcare, Lagos", "412"],
    ["/stock/projects/road.jpg", "Departmental road works", "Roads, Ondo", "268"],
    ["/stock/projects/education.jpg", "School block, Ilaje", "Education, Ondo", "171"],
  ];
  const leads = [
    ["C", "A client", "Can we talk about a clinic build?", "2h", true],
    ["R", "A recruiter", "Interested in your road work.", "1d", true],
    ["V", "A visitor", "Are you available in March?", "3d", false],
  ] as const;
  return (
    <>
      <div className="mk-dash">
        <div className="mk-dash-inner">
          <div className="mk-dash-head">
            <div className="mk-mock-row">
              <Avatar label="YN" size={40} />
              <div>
                <b>Your name</b>
                <div className="mk-muted">your-link/your-name</div>
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
          <AutoSlide>
            <div className="mk-dash-grid mk-cards--swipe">
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
                {leads.map(([label, name, text, when, unread]) => (
                  <div key={name} className="mk-lead-row">
                    <Avatar label={label} size={34} />
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
          </AutoSlide>
        </div>
      </div>
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

/** Tailor to a job: a job link goes in, a reworded CV and an honest match read come out, kept as one of three versions. */
export function TailorMock() {
  return (
    <div className="mk-mock mk-mock--wide mk-tailor">
      <b>Tailor to a job</b>
      <div className="mk-tailor-job">
        <span className="mk-tailor-icon" aria-hidden="true">
          ↗
        </span>
        <span>company.com/careers/frontend-developer</span>
      </div>
      <div className="mk-tailor-out">
        <span className="mk-muted">Tailored headline</span>
        <b>Frontend Developer</b>
        <Lines n={3} />
      </div>
      <div className="mk-tailor-fit">
        <span className="mk-muted">What matches</span>
        <span className="mk-tailor-chips">
          <span className="mk-chip mk-chip--on">React</span>
          <span className="mk-chip mk-chip--on">TypeScript</span>
          <span className="mk-chip mk-chip--on">Accessibility</span>
        </span>
        <span className="mk-muted">Not on your page yet</span>
        <span className="mk-tailor-chips">
          <span className="mk-chip mk-chip--gap">GraphQL</span>
        </span>
      </div>
      <div className="mk-tabs">
        <span className="mk-tabs-on">Frontend</span>
        <span>Backend</span>
        <span>Fullstack</span>
      </div>
    </div>
  );
}

/** A link shared in a chat: the card people see before they tap it, with the owner's photo and details. */
export function LinkPreviewMock({ host }: { host: string }) {
  return (
    <div className="mk-mock mk-mock--chat">
      <span className="mk-bubble">Here is my work 👇</span>
      <div className="mk-og">
        <div className="mk-og-photo" aria-hidden="true">
          <Avatar label="YN" size={84} />
        </div>
        <div className="mk-og-text">
          <b>Your name · Your headline</b>
          <span className="mk-muted">Your city · 6 projects</span>
          <small>{host}/your-name</small>
        </div>
      </div>
    </div>
  );
}

/** Start from a CV: drop a PDF and the basics fill themselves in, to be checked before anything is saved. */
export function ImportMock() {
  const found = ["Name and headline", "Contact details", "Experience", "Education"];
  return (
    <div className="mk-mock">
      <b>Start from your CV</b>
      <div className="mk-drop">
        <span className="mk-drop-icon" aria-hidden="true">
          ↑
        </span>
        <span>Drop your CV here (PDF)</span>
      </div>
      <ul className="mk-found">
        {found.map((f, i) => (
          <li key={f} style={{ animationDelay: `${0.15 * i}s` }}>
            <span aria-hidden="true">✓</span> {f}
          </li>
        ))}
      </ul>
      <span className="mk-muted">You check everything before it is saved</span>
    </div>
  );
}
