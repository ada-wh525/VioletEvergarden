import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { letters } from "../../../db/schema";
import { DEFAULT_LETTERS } from "../../../lib/default-letters";

function displayDate(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "来自不远的某一天";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export async function GET() {
  try {
    const db = getDb();
    const pivot = Math.random();
    const fields = {
      id: letters.id,
      addressee: letters.addressee,
      content: letters.content,
      author: letters.author,
      theme: letters.theme,
      likeCount: letters.likeCount,
      createdAt: letters.createdAt,
    };

    let [letter] = await db
      .select(fields)
      .from(letters)
      .where(and(eq(letters.status, "published"), gte(letters.randomKey, pivot)))
      .orderBy(asc(letters.randomKey))
      .limit(1);

    if (!letter) {
      [letter] = await db
        .select(fields)
        .from(letters)
        .where(eq(letters.status, "published"))
        .orderBy(asc(letters.randomKey))
        .limit(1);
    }

    if (!letter) {
      await db.insert(letters).values(DEFAULT_LETTERS).onConflictDoNothing();

      [letter] = await db
        .select(fields)
        .from(letters)
        .where(eq(letters.status, "published"))
        .orderBy(asc(letters.randomKey))
        .limit(1);
    }

    if (!letter) return Response.json({ error: "letter pool is empty" }, { status: 404 });

    return Response.json({
      letter: {
        id: letter.id,
        addressee: letter.addressee,
        content: letter.content.replace(/\\n/g, "\n"),
        author: letter.author,
        theme: letter.theme,
        likes: letter.likeCount,
        date: displayDate(letter.createdAt),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "letter service is unavailable";
    return Response.json({ error: message }, { status: 503 });
  }
}
