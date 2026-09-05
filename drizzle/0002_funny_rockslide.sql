CREATE TABLE `banned_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`reason` text DEFAULT '人工审核封禁' NOT NULL,
	`source_letter_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `banned_visitors_visitor_idx` ON `banned_visitors` (`visitor_id`);--> statement-breakpoint
CREATE TABLE `letter_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`letter_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`letter_id`) REFERENCES `letters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `letter_actions_visitor_kind_idx` ON `letter_actions` (`letter_id`,`visitor_id`,`kind`);--> statement-breakpoint
CREATE INDEX `letter_actions_letter_idx` ON `letter_actions` (`letter_id`);--> statement-breakpoint
ALTER TABLE `letters` ADD `visitor_id` text;--> statement-breakpoint
ALTER TABLE `letters` ADD `like_count` integer DEFAULT 0 NOT NULL;