CREATE TABLE `system_health` (
	`id` int AUTO_INCREMENT NOT NULL,
	`layer` enum('frontend','server','stripe','resend','omax','database') NOT NULL,
	`status` enum('ok','degraded','down','unknown') NOT NULL DEFAULT 'unknown',
	`message` text,
	`errorCount` int NOT NULL DEFAULT 0,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`metadata` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_health_id` PRIMARY KEY(`id`)
);
