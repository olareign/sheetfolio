import type { DayViews } from "@/lib/site";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const day = (iso: string) => WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()] ?? "";

/**
 * 7-day page views: one series, so one colour (blueprint) and no legend; the title names it.
 * Each bar has a hover value; a visually hidden table is the accessible view.
 */
export function ViewsChart({ days }: { days: DayViews[] }) {
  const total = days.reduce((n, d) => n + d.views, 0);
  const max = Math.max(1, ...days.map((d) => d.views));
  return (
    <figure className="cms-chart">
      <figcaption className="cms-chart-head">
        <span className="sp-label">Views · 7 days</span>
        <span className="cms-chart-total">{total}</span>
      </figcaption>
      <ol className="cms-chart-bars" aria-hidden="true">
        {days.map((d) => (
          <li key={d.date} title={`${day(d.date)} ${d.date}: ${d.views} ${d.views === 1 ? "view" : "views"}`}>
            <span className="cms-chart-bar" style={{ height: `${(d.views / max) * 100}%` }} />
          </li>
        ))}
      </ol>
      <div className="cms-chart-axis" aria-hidden="true">
        <span>{day(days[0]?.date ?? "")}</span>
        <span>Today</span>
      </div>
      <table className="sp-visually-hidden">
        <caption>Page views, last 7 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
