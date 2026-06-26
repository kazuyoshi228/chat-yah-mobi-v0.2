CREATE TABLE `improvement_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardKey` varchar(64) NOT NULL,
	`nextDate` timestamp,
	`lastDate` timestamp,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `improvement_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `improvement_cards_cardKey_unique` UNIQUE(`cardKey`)
);
