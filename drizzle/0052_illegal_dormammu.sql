CREATE TABLE `survey_ocr_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`pattern` varchar(256) NOT NULL,
	`aliases` text,
	`source_document` varchar(256),
	`confidence` int NOT NULL DEFAULT 50,
	`approved` tinyint NOT NULL DEFAULT 0,
	`hit_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `survey_ocr_patterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ocr_patterns_category` ON `survey_ocr_patterns` (`category`);--> statement-breakpoint
CREATE INDEX `idx_ocr_patterns_approved` ON `survey_ocr_patterns` (`approved`);