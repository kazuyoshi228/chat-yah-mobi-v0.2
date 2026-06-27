CREATE TABLE `competitor_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128),
	`competitorName` varchar(128) NOT NULL,
	`planName` varchar(128) NOT NULL,
	`dataGb` float NOT NULL,
	`durationDays` int NOT NULL,
	`priceYen` int NOT NULL,
	`sourceUrl` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitor_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitor_plans_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `customer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalUserId` varchar(128) NOT NULL,
	`email` varchar(320),
	`name` varchar(256),
	`language` varchar(8) DEFAULT 'ja',
	`registeredAt` timestamp,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_profiles_externalUserId_unique` UNIQUE(`externalUserId`)
);
--> statement-breakpoint
CREATE TABLE `esim_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalUserId` varchar(128) NOT NULL,
	`externalOrderId` varchar(128) NOT NULL,
	`iccid` varchar(64),
	`status` enum('not_installed','installed','active','expired','error') NOT NULL DEFAULT 'not_installed',
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`dataUsedMb` int DEFAULT 0,
	`dataTotalMb` int,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `esim_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `esim_statuses_externalOrderId_unique` UNIQUE(`externalOrderId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128),
	`name` varchar(128) NOT NULL,
	`dataGb` float NOT NULL,
	`durationDays` int NOT NULL,
	`priceYen` int NOT NULL,
	`bestFor` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int DEFAULT 0,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalOrderId` varchar(128) NOT NULL,
	`externalUserId` varchar(128) NOT NULL,
	`planName` varchar(128) NOT NULL,
	`dataGb` float,
	`durationDays` int,
	`priceYen` int NOT NULL,
	`purchasedAt` timestamp NOT NULL,
	`expiresAt` timestamp,
	`status` enum('pending','active','expired','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_externalOrderId_unique` UNIQUE(`externalOrderId`)
);
