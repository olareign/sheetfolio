import type { ReactNode } from "react";

/** Rounded frame for a project picture. Fixed aspect ratio, so pictures in a group never take their height from the text beside them. */
export function MediaFrame({ children, wide }: { children: ReactNode; /** 16:10 instead of 4:3 (project page main picture). */ wide?: boolean }) {
  return <div className={wide ? "sp-media sp-media--wide" : "sp-media"}>{children}</div>;
}
