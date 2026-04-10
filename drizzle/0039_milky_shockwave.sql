ALTER TABLE `project_documents` ADD `status` varchar(50) DEFAULT 'uploaded';--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `fileUrl`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `fileSize`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `convertedOverlayUrl`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `linkedOverlayId`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `project_documents` DROP COLUMN `uploadedBy`;