import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { bannedVisitors, letters } from "../../../../db/schema";
import { isAdminRequest } from "../../../../lib/admin-session";

function parseFlags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(letters).orderBy(desc(letters.riskScore), desc(letters.reportCount), desc(letters.createdAt)).limit(250);
    const bans = await db.select({ visitorId: bannedVisitors.visitorId }).from(bannedVisitors);
    const bannedIds = new Set(bans.map((ban) => ban.visitorId));
    return Response.json({
      letters: rows.map((letter) => ({
        ...letter,
        visitorId: undefined,
        canBan: Boolean(letter.visitorId),
        senderBanned: letter.visitorId ? bannedIds.has(letter.visitorId) : false,
        moderationFlags: parseFlags(letter.moderationFlags),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "review queue is unavailable";
    return Response.json({ error: message }, { status: 503 });
  }
}
