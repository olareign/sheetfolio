import type { ReactNode } from "react";

export type TagTone = "default" | "done" | "ongoing" | "active";

/** DESIGN §7.2. Status tags always carry the word, never colour alone. */
export function Tag({ tone = "default", children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={tone === "default" ? "sp-tag" : `sp-tag sp-tag--${tone}`}>{children}</span>;
}

export function StatusTag({ status }: { status: "completed" | "ongoing" }) {
  return status === "ongoing" ? <Tag tone="ongoing">Ongoing</Tag> : <Tag tone="done">Completed</Tag>;
}
