CREATE TABLE `simulation_run_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalSessions` int NOT NULL DEFAULT 0,
	`totalTurns` int NOT NULL DEFAULT 0,
	`totalErrors` int NOT NULL DEFAULT 0,
	`formRedirects` int NOT NULL DEFAULT 0,
	`avgRagScore` float DEFAULT 0,
	`sessionResults` text,
	`ranAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_run_results_id` PRIMARY KEY(`id`)
);
