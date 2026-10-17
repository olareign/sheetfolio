/** DESIGN §7.5. Figures must come from data. */
export function DimensionLine({ figure, caption }: { figure: string; caption: string }) {
  return (
    <div className="sp-dim">
      <div className="sp-dim-fig">{figure}</div>
      <div className="sp-dim-line" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="sp-label sp-dim-cap">{caption}</div>
    </div>
  );
}
