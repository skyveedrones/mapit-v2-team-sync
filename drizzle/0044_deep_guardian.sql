-- Custom SQL migration file, put your code below! --
CREATE TABLE `onboarding_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`projectId` int NOT NULL,
	`projectName` varchar(255),
	`status` enum('pending','converted','recovery_sent') NOT NULL DEFAULT 'pending',
	`recoveryScheduledAt` timestamp,
	`recoverySentAt` timestamp,
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_leads_id` PRIMARY KEY(`id`)
);