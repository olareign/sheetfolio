/** A round initials badge for the example screens: no stock portraits, so nothing reads as a real person. */
export function Avatar({ label, size = 44 }: { label: string; size?: number }) {
  return (
    <span
      className="mk-avatar mk-avatar--initials"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
