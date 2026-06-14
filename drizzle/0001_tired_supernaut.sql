CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`visitorName` varchar(128),
	`visitorEmail` varchar(320),
	`status` enum('waiting','active','ended') NOT NULL DEFAULT 'waiting',
	`operatorId` int,
	`language` varchar(8) DEFAULT 'ja',
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('visitor','operator','ai') NOT NULL,
	`content` text NOT NULL,
	`fileUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(128) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quick_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rag_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rag_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operator') NOT NULL DEFAULT 'user';