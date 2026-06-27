ALTER TABLE `messages` MODIFY COLUMN `role` enum('visitor','admin','ai') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';