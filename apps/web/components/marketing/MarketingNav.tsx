"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/content/marketing";

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="mk-nav">
      {NAV.map((item) => {
        const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
