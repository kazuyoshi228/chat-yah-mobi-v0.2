ALTER TABLE `test_run_logs` MODIFY COLUMN `details` text;--> statement-breakpoint
ALTER TABLE `test_run_logs` ADD `status` varchar(16) DEFAULT 'pass' NOT NULL;