CREATE TABLE `user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`temporaryPassword` varchar(255) NOT NULL,
	`token` varchar(64) NOT NULL,
	`invitedBy` int NOT NULL,
	`clientId` int,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_invitations_email` ON `user_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_invitations_token` ON `user_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_user_invitations_status` ON `user_invitations` (`status`);