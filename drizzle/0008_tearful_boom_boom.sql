CREATE TABLE `test_run_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testType` varchar(64) NOT NULL,
	`passed` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`details` json,
	`triggeredBy` int,
	`ranAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `test_run_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `test_run_logs` ADD CONSTRAINT `test_run_logs_triggeredBy_users_id_fk` FOREIGN KEY (`triggeredBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;