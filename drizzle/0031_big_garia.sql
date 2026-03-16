CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` varchar(500),
	`logoKey` varchar(500),
	`subscriptionTier` enum('starter','professional','pilot') NOT NULL DEFAULT 'starter',
	`type` enum('provider','municipality','other') NOT NULL DEFAULT 'provider',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `orgRole` enum('PROVIDER','ORG_ADMIN','ORG_USER') DEFAULT 'ORG_USER';