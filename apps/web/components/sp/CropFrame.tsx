import type { ReactNode } from "react";

/** DESIGN §6 crop marks around every project image or placeholder. */
export function CropFrame({
  children,
  pending,
  wide,
}: {
  children: ReactNode;
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
    </div>
  );
}
