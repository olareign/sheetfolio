import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { flushStats, pgStatsArchive } from "@/lib/store/stats";

export const dynamic = "force-dynamic";
// Reading every counter and writing them in batches takes a little longer than a normal request.
export const maxDuration = 60;

const sameSecret = (given: string, expected: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * The daily job (see vercel.json): copies the live view and download totals from Redis into Postgres. Vercel's scheduler
 * calls it with `Authorization: Bearer $CRON_SECRET`; anyone else gets a 401. Safe to call any time and as often as you
 * like: a copy only ever raises a stored total.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { CRON_SECRET, DATABASE_URL } = env();
  if (!CRON_SECRET || !DATABASE_URL) {
    return NextResponse.json({ error: "Not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!sameSecret(request.headers.get("authorization") ?? "", `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const copied = await flushStats(redis(), pgStatsArchive(db));
  return NextResponse.json({ ok: true, copied }, { headers: { "Cache-Control": "no-store" } });
}
