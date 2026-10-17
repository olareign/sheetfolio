import type { ReactNode } from "react";

/** DESIGN §6 crop marks around every project image or placeholder. */
export function CropFrame({
  children,
  no,
  pending,
  wide,
}: {
  children: ReactNode;
  /** Label in the corner, e.g. "SP-004" or "FIG. 1". */
  no?: string;
  /** Shows "PHOTOS PENDING" over a placeholder. */
  pending?: boolean;
  /** 16:10 instead of 4:3 (project detail main image). */
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sp-crop sp-crop--wide" : "sp-crop"}>
      <span className="sp-crop-b" />
      {children}
      {pending && <span className="sp-crop-pending">PHOTOS PENDING</span>}
      {no && <span className="sp-crop-no">{no}</span>}
    </div>
  );
}
