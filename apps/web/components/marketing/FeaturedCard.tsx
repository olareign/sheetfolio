import { Eye, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CoverImage } from "@/components/sp/CoverImage";
import { SHOWCASE_DAYS, type FeaturedUser } from "@/lib/showcase";

const number = new Intl.NumberFormat("en");

/** One featured page: their most-opened project's picture, who they are, and how many people looked. */
export function FeaturedCard({ user, rank }: { user: FeaturedUser; rank: number }) {
  return (
    <Link href={`/${user.slug}`} className="mk-example mk-lift">
      <div className="mk-example-photo">
        <CoverImage cover={user.cover} sizes="(max-width: 700px) 100vw, 360px" />
        <span className="mk-story-badge">
          <span className={rank === 1 ? "mk-sample mk-sample--live" : "mk-sample"}>{rank === 1 ? "#1 most visited" : `#${rank}`}</span>
        </span>
      </div>
      <div className="mk-example-body">
        <div>
          <b className="mk-featured-name">{user.name}</b>
          <span className="mk-muted mk-featured-role">{[user.headline, user.location].filter(Boolean).join(" · ")}</span>
          <span className="mk-featured-slug">/{user.slug}</span>
        </div>
        <div className="mk-featured-stats">
          <span>
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
            <b>{number.format(user.views)}</b> views, last {SHOWCASE_DAYS} days
          </span>
          <span>
            <LayoutGrid size={15} strokeWidth={1.8} aria-hidden="true" />
            {user.projects} {user.projects === 1 ? "project" : "projects"}
          </span>
        </div>
      </div>
    </Link>
  );
}
