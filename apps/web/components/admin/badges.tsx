import type { PublishState } from "@/content/cms";
import type { UserPlan } from "@/content/schemas";

const STATUS: Record<PublishState, { label: string; className: string }> = {
  live: { label: "Live", className: "sp-tag sp-tag--done" },
  changes: { label: "Live, edits pending", className: "sp-tag sp-tag--done" },
  unpublished: { label: "Not published", className: "sp-tag" },
  suspended: { label: "Suspended", className: "sp-tag sp-tag--ongoing" },
};

export function StatusTag({ status }: { status: PublishState }) {
  return <span className={STATUS[status].className}>{STATUS[status].label}</span>;
}

export function PlanTag({ plan }: { plan: UserPlan }) {
  return <span className={plan === "pro" ? "ad-plan ad-plan--pro" : "ad-plan"}>{plan === "pro" ? "Pro" : "Free"}</span>;
}
