import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { bannedVisitors, letterActions, letters } from "../../../db/schema";
import { getReaderIdentity } from "../../../lib/letter-visitor";

export async function POST(request: Request) {
  try {
    const runtime = env as unknown as { LETTER_REACTIONS_ENABLED?: string };
    if (runtime.LETTER_REACTIONS_ENABLED?.trim().toLowerCase() === "false") {
      return Response.json({ error: "letter reports are not enabled" }, { status: 503 });
    }

    const payload = (await request.json()) as { id?: string };
    const id = payload.id?.trim() ?? "";
    if (!id) return Response.json({ error: "letter id is required" }, { status: 400 });

    const db = getDb();
    const identity = getReaderIdentity(request);
    const [ban] = await db.select({ id: bannedVisitors.id }).from(bannedVisitors).where(eq(bannedVisitors.visitorId, identity.visitorId)).limit(1);
    if (ban) return Response.json({ error: "this visitor is blocked" }, { status: 403 });

    const [letter] = await db.select({ id: letters.id, reportCount: letters.reportCount }).from(letters).where(and(eq(letters.id, id), eq(letters.status, "published"))).limit(1);
    if (!letter) return Response.json({ error: "letter not found" }, { status: 404 });

    const [action] = await db.insert(letterActions).values({
      id: crypto.randomUUID(),
      letterId: id,
      visitorId: identity.visitorId,
      kind: "report",
    }).onConflictDoNothing().returning({ id: letterActions.id });

    let reportCount = letter.reportCount;
    if (action) {
      const [updated] = await db.update(letters).set({ reportCount: sql`${letters.reportCount} + 1` }).where(eq(letters.id, id)).returning({ reportCount: letters.reportCount });
      reportCount = updated?.reportCount ?? reportCount + 1;
      if (reportCount >= 3) {
        await db.update(letters).set({ status: "pending", reviewedAt: null }).where(eq(letters.id, id));
      }
    }

    const headers = new Headers();
    if (identity.cookie) headers.set("set-cookie", identity.cookie);
    return Response.json({ reported: true, duplicate: !action, reportCount }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "letter service is unavailable";
    return Response.json({ error: message }, { status: 503 });
  }
}
