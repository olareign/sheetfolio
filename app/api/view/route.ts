import { z } from "zod";
import { recordView } from "@/lib/site";

// PRD §6 asked for the Edge runtime; Next 16 deprecates it, so this runs on the default Node runtime.
// It only increments counters; the public pages themselves stay cached.

const Beacon = z.object({ slug: z.string().max(64), projectId: z.string().max(64).optional() });

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = JSON.parse(await request.text()); // sendBeacon posts text/plain
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = Beacon.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  // Unknown or malformed slugs are ignored inside recordView; always 204 so the beacon reveals nothing.
  await recordView(parsed.data.slug, parsed.data.projectId);
  return new Response(null, { status: 204 });
}
