export type TitleBlockCell = { label: string; value: string; mono?: boolean; wide?: boolean };

/** DESIGN §7.4. `columns={6}` is the full-width project header variant. Empty cells are dropped. */
export function TitleBlock({ cells, columns = 3 }: { cells: TitleBlockCell[]; columns?: 3 | 6 }) {
  return (
    <div className={columns === 6 ? "sp-titleblock sp-titleblock--6" : "sp-titleblock"}>
      {cells
        .filter((c) => c.value)
        .map((c) => (
          <div key={c.label} className={c.wide ? "sp-tb-wide" : undefined}>
            <span className="sp-label">{c.label}</span>
            <div className={c.mono ? "sp-tb-mono" : "sp-tb-val"}>{c.value}</div>
          </div>
        ))}
    </div>
  );
}
