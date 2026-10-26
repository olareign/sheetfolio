import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

/** Whether the database answers. No secrets, no data. */
export async function GET(): Promise<NextResponse> {
  const health = await checkHealth(db);
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
