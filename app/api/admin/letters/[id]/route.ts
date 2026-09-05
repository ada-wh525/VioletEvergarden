import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { bannedVisitors, letters } from "../../../../../db/schema";
import { isAdminRequest } from "../../../../../lib/admin-session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { action?: "publish" | "reject" | "pending" | "ban" | "unban"; reason?: string };
    const db = getDb();

    if (payload.action === "ban" || payload.action === "unban") {
      const [letter] = await db.select({ visitorId: letters.visitorId }).from(letters).where(eq(letters.id, id)).limit(1);
      if (!letter) return Response.json({ error: "letter not found" }, { status: 404 });
      if (!letter.visitorId) return Response.json({ error: "legacy letter has no sender identity" }, { status: 400 });

      if (payload.action === "ban") {
        await db.insert(bannedVisitors).values({
          id: crypto.randomUUID(),
          visitorId: letter.visitorId,
          reason: payload.reason?.trim().slice(0, 120) || "人工审核封禁",
          sourceLetterId: id,
        }).onConflictDoUpdate({
          target: bannedVisitors.visitorId,
          set: { reason: payload.reason?.trim().slice(0, 120) || "人工审核封禁", sourceLetterId: id },
        });
        await db.update(letters).set({ status: "rejected", reviewedAt: sql`CURRENT_TIMESTAMP` }).where(eq(letters.visitorId, letter.visitorId));
        return Response.json({ banned: true });
      }

      await db.delete(bannedVisitors).where(eq(bannedVisitors.visitorId, letter.visitorId));
      return Response.json({ banned: false });
    }

    const status = payload.action === "publish" ? "published" : payload.action === "reject" ? "rejected" : payload.action === "pending" ? "pending" : null;
    if (!status) return Response.json({ error: "invalid review action" }, { status: 400 });

    const [updated] = await db.update(letters).set({
      status,
      reviewedAt: status === "pending" ? null : sql`CURRENT_TIMESTAMP`,
    }).where(eq(letters.id, id)).returning({ id: letters.id, status: letters.status });

    if (!updated) return Response.json({ error: "letter not found" }, { status: 404 });
    return Response.json({ letter: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "review action failed";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();
    const [removed] = await db.delete(letters).where(eq(letters.id, id)).returning({ id: letters.id });
    if (!removed) return Response.json({ error: "letter not found" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete action failed";
    return Response.json({ error: message }, { status: 503 });
  }
}
