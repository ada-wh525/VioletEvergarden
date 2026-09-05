import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { ensureLetterSchema, getDb } from "../../../db";
import { bannedVisitors, letterActions, letters } from "../../../db/schema";
import { getReaderIdentity } from "../../../lib/letter-visitor";

export async function POST(request: Request) {
  try {
    const runtime = env as unknown as { LETTER_REACTIONS_ENABLED?: string };
    if (runtime.LETTER_REACTIONS_ENABLED?.trim().toLowerCase() === "false") {
      return Response.json({ error: "letter reactions are not enabled" }, { status: 503 });
    }

    const payload = (await request.json()) as { id?: string };
    const id = payload.id?.trim() ?? "";
    if (!id) return Response.json({ error: "letter id is required" }, { status: 400 });

    await ensureLetterSchema();
    const db = getDb();
    const identity = getReaderIdentity(request);
    const [ban] = await db.select({ id: bannedVisitors.id }).from(bannedVisitors).where(eq(bannedVisitors.visitorId, identity.visitorId)).limit(1);
    if (ban) return Response.json({ error: "this visitor is blocked" }, { status: 403 });

    const [letter] = await db.select({ id: letters.id, likeCount: letters.likeCount }).from(letters).where(and(eq(letters.id, id), eq(letters.status, "published"))).limit(1);
    if (!letter) return Response.json({ error: "letter not found" }, { status: 404 });

    const [action] = await db.insert(letterActions).values({
      id: crypto.randomUUID(),
      letterId: id,
      visitorId: identity.visitorId,
      kind: "like",
    }).onConflictDoNothing().returning({ id: letterActions.id });

    let likeCount = letter.likeCount;
    if (action) {
      const [updated] = await db.update(letters).set({ likeCount: sql`${letters.likeCount} + 1` }).where(eq(letters.id, id)).returning({ likeCount: letters.likeCount });
      likeCount = updated?.likeCount ?? likeCount + 1;
    }

    const headers = new Headers();
    if (identity.cookie) headers.set("set-cookie", identity.cookie);
    return Response.json({ liked: true, duplicate: !action, likeCount }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "letter service is unavailable";
    return Response.json({ error: message }, { status: 503 });
  }
}
