import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { eq } from "drizzle-orm";
import { bannedVisitors, letters } from "../../../db/schema";
import { moderateLetter } from "../../../lib/letter-moderation.mjs";
import { getReaderIdentity } from "../../../lib/letter-visitor";
import { verifyTurnstile } from "../../../lib/turnstile";

const themes = new Set(["hydrangea", "ivory", "wine"]);

export async function POST(request: Request) {
  try {
    const runtime = env as unknown as { LETTER_SUBMISSIONS_ENABLED?: string };
    if (runtime.LETTER_SUBMISSIONS_ENABLED?.trim().toLowerCase() === "false") {
      return Response.json({ error: "letter submissions are not enabled" }, { status: 503 });
    }

    const payload = (await request.json()) as {
      author?: string;
      content?: string;
      theme?: string;
      turnstileToken?: string;
    };
    const content = payload.content?.trim() ?? "";
    const author = payload.author?.trim().slice(0, 24) || "一位未署名的寄信人";
    const theme = themes.has(payload.theme ?? "") ? payload.theme! : "hydrangea";

    if (!content || content.length > 600) {
      return Response.json({ error: "letter content must contain 1 to 600 characters" }, { status: 400 });
    }

    const verification = await verifyTurnstile(payload.turnstileToken, request);
    if (!verification.ok) {
      const unavailable = verification.reason === "unavailable";
      return Response.json(
        {
          code: unavailable ? "verification_unavailable" : "verification_failed",
          error: unavailable ? "verification service is unavailable" : "verification failed",
        },
        { status: unavailable ? 503 : 400 },
      );
    }

    const moderation = moderateLetter(`${author}\n${content}`);
    if (moderation.hardBlock) {
      return Response.json({ error: "please remove private contact information" }, { status: 400 });
    }

    const db = getDb();
    const identity = getReaderIdentity(request);
    const [ban] = await db.select({ id: bannedVisitors.id }).from(bannedVisitors).where(eq(bannedVisitors.visitorId, identity.visitorId)).limit(1);
    if (ban) {
      return Response.json({ error: "this visitor is blocked from sending letters" }, { status: 403 });
    }

    const id = crypto.randomUUID();
    await db.insert(letters).values({
      id,
      content,
      author,
      visitorId: identity.visitorId,
      theme,
      status: "pending",
      randomKey: Math.random(),
      riskScore: moderation.riskScore,
      moderationFlags: JSON.stringify(moderation.flags),
    });

    const headers = new Headers();
    if (identity.cookie) headers.set("set-cookie", identity.cookie);
    return Response.json({ submission: { id, status: "pending", queuedForReview: true } }, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "letter service is unavailable";
    return Response.json({ error: message }, { status: 503 });
  }
}
