import Link from "next/link";

/** Marks the draft preview so it's never mistaken for the live page. */
export function PreviewBanner({ live }: { live: boolean }) {
  return (
    <div className="pp-preview" role="status">
      <span>Draft preview · {live ? "your live page may differ until you publish" : "not published yet"}</span>
      <Link href="/dashboard">Back to dashboard</Link>
    </div>
  );
}
