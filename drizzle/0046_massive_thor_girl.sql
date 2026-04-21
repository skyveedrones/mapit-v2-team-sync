ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','webmaster','client','project_mgr') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `media` ADD `issueReportType` enum('none','corrective','punchlist') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `issueStatus` enum('open','corrected') DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `issueWorkflowAction` enum('none','assign','review','rejected','accepted') DEFAULT 'none' NOT NULL;