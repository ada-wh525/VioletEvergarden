import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const letters = sqliteTable(
  "letters",
  {
    id: text("id").primaryKey(),
    addressee: text("addressee").notNull().default("给偶然拆开这封信的你"),
    content: text("content").notNull(),
    author: text("author").notNull().default("一位未署名的寄信人"),
    visitorId: text("visitor_id"),
    theme: text("theme").notNull().default("hydrangea"),
    status: text("status").notNull().default("pending"),
    randomKey: real("random_key").notNull(),
    riskScore: integer("risk_score").notNull().default(0),
    moderationFlags: text("moderation_flags").notNull().default("[]"),
    reportCount: integer("report_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("letters_status_random_idx").on(table.status, table.randomKey),
    index("letters_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const letterActions = sqliteTable(
  "letter_actions",
  {
    id: text("id").primaryKey(),
    letterId: text("letter_id").notNull().references(() => letters.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    kind: text("kind").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("letter_actions_visitor_kind_idx").on(table.letterId, table.visitorId, table.kind),
    index("letter_actions_letter_idx").on(table.letterId),
  ],
);

export const bannedVisitors = sqliteTable(
  "banned_visitors",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    reason: text("reason").notNull().default("人工审核封禁"),
    sourceLetterId: text("source_letter_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("banned_visitors_visitor_idx").on(table.visitorId)],
);
