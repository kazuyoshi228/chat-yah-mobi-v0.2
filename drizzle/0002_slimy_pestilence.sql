ALTER TABLE `chat_sessions` ADD `scheduledDeleteAt` timestamp;--> statement-breakpoint
ALTER TABLE `rag_documents` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `surveys` ADD `resolved` enum('yes','no');--> statement-breakpoint
ALTER TABLE `surveys` ADD `freeComment` text;