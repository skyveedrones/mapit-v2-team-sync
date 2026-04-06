DROP TABLE `project_documents`;--> statement-breakpoint
ALTER TABLE `client_invitations` DROP INDEX `client_invitations_token_unique`;--> statement-breakpoint
ALTER TABLE `project_invitations` DROP INDEX `project_invitations_token_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `audit_log` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `client_invitations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `client_project_assignments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `client_users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `clients` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `flights` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `media` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `organizations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_collaborators` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_invitations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_members` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_overlays` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_templates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `projects` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `referrals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `warranty_reminders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `client_invitations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `client_project_assignments` MODIFY COLUMN `assignedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `client_users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `flights` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `duration` decimal(10,2);--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `frameRate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `telemetryPath` text;--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `uploadSessionId` varchar(64);--> statement-breakpoint
ALTER TABLE `media` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `organizations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_collaborators` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_invitations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_members` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_overlays` MODIFY COLUMN `coordinates` json;--> statement-breakpoint
ALTER TABLE `project_overlays` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_templates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `isPinned` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `isPinned` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `referrals` MODIFY COLUMN `emailSent` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `referrals` MODIFY COLUMN `emailSent` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `referrals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `orgRole` enum('PROVIDER','ORG_ADMIN','ORG_USER') DEFAULT 'ORG_USER';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `warranty_reminders` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `media` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `organizations` ADD `logoKey` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `setupCompleted` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_audit_log_entity` ON `audit_log` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_user` ON `audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_created` ON `audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `client_invitations_token_unique` ON `client_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_clients_deleted` ON `clients` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `idx_flights_deleted` ON `flights` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `idx_media_deleted` ON `media` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `project_invitations_token_unique` ON `project_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_projects_deleted` ON `projects` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);