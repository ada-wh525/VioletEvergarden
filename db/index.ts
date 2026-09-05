import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let letterSchemaReady: Promise<void> | undefined;

async function initializeLetterSchema() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }

  const columnInfo = await env.DB
    .prepare("PRAGMA table_info(letters)")
    .all<{ name: string }>();
  const columns = new Set((columnInfo.results ?? []).map((column) => column.name));

  if (columns.size === 0) {
    throw new Error("The letters table is unavailable.");
  }

  const columnStatements = [
    ["moderation_flags", "ALTER TABLE letters ADD moderation_flags text DEFAULT '[]' NOT NULL"],
    ["visitor_id", "ALTER TABLE letters ADD visitor_id text"],
    ["like_count", "ALTER TABLE letters ADD like_count integer DEFAULT 0 NOT NULL"],
  ]
    .filter(([column]) => !columns.has(column))
    .map(([, statement]) => env.DB.prepare(statement));

  if (columnStatements.length > 0) {
    try {
      await env.DB.batch(columnStatements);
    } catch (error) {
      const refreshed = await env.DB
        .prepare("PRAGMA table_info(letters)")
        .all<{ name: string }>();
      const refreshedColumns = new Set((refreshed.results ?? []).map((column) => column.name));
      if (!["moderation_flags", "visitor_id", "like_count"].every((column) => refreshedColumns.has(column))) {
        throw error;
      }
    }
  }

  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS banned_visitors (id text PRIMARY KEY NOT NULL, visitor_id text NOT NULL, reason text DEFAULT '人工审核封禁' NOT NULL, source_letter_id text, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS banned_visitors_visitor_idx ON banned_visitors (visitor_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS letter_actions (id text PRIMARY KEY NOT NULL, letter_id text NOT NULL, visitor_id text NOT NULL, kind text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (letter_id) REFERENCES letters(id) ON UPDATE no action ON DELETE cascade)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS letter_actions_visitor_kind_idx ON letter_actions (letter_id, visitor_id, kind)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS letter_actions_letter_idx ON letter_actions (letter_id)"),
  ]);

  await env.DB.prepare("PRAGMA optimize").run();
}

export async function ensureLetterSchema() {
  if (!letterSchemaReady) {
    letterSchemaReady = initializeLetterSchema().catch((error) => {
      letterSchemaReady = undefined;
      throw error;
    });
  }

  await letterSchemaReady;
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
