/** DESIGN §7.7. Empty rows are skipped; max 8 rows. */
export function SpecTable({ rows, caption }: { rows: [string, string | undefined][]; caption?: string }) {
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1])).slice(0, 8);
  if (filled.length === 0) return null;
  return (
    <table className="sp-spec">
      {caption && <caption className="sp-visually-hidden">{caption}</caption>}
      <tbody>
        {filled.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
