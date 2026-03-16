DROP TABLE `organizations`;--> statement-breakpoint
ALTER TABLE `project_overlays` MODIFY COLUMN `coordinates` json DEFAULT ('[[0,0],[0,0],[0,0],[0,0]]');--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `organizationId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `orgRole`;