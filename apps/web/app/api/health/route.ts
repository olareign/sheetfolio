import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Says which store each kind of data is on and whether the database answers. No secrets, no data. */
export async function GET(): Promise<NextResponse> {
  const { ACCOUNTS_STORE, LEADS_STORE, SITES_STORE } = env();
  const health = await checkHealth({ accounts: ACCOUNTS_STORE, leads: LEADS_STORE, sites: SITES_STORE }, db);
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
