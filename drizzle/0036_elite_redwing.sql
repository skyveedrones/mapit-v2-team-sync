CREATE TABLE `project_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int NOT NULL,
	`category` enum('blueprint','permit','contract','site_plan','other') NOT NULL DEFAULT 'other',
	`convertedOverlayUrl` varchar(512),
	`linkedOverlayId` int,
	`description` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
