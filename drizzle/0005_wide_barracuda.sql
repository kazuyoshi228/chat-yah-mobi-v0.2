CREATE TABLE `image_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`messageId` int,
	`fileUrl` varchar(1024) NOT NULL,
	`category` varchar(128),
	`keywords` json,
	`description` text,
	`confidence` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `image_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_reads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD `lastMessageAt` timestamp;--> statement-breakpoint
ALTER TABLE `image_analyses` ADD CONSTRAINT `image_analyses_sessionId_chat_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_reads` ADD CONSTRAINT `session_reads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_reads` ADD CONSTRAINT `session_reads_sessionId_chat_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;