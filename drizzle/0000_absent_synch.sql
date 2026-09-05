CREATE TABLE `letters` (
	`id` text PRIMARY KEY NOT NULL,
	`addressee` text DEFAULT '给偶然拆开这封信的你' NOT NULL,
	`content` text NOT NULL,
	`author` text DEFAULT '一位未署名的寄信人' NOT NULL,
	`theme` text DEFAULT 'hydrangea' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`random_key` real NOT NULL,
	`risk_score` integer DEFAULT 0 NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `letters_status_random_idx` ON `letters` (`status`,`random_key`);--> statement-breakpoint
CREATE INDEX `letters_status_created_idx` ON `letters` (`status`,`created_at`);