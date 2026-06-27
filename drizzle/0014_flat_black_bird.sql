CREATE TABLE `esim_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`iccid` varchar(64),
	`externalOrderId` varchar(128),
	`externalUserId` varchar(128),
	`email` varchar(256),
	`incidentType` enum('provisioning_failed','activation_timeout','esim_expired_early','manual_refund') NOT NULL,
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`refundStatus` enum('pending','processing','refunded','failed','not_required') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(256),
	`stripeRefundId` varchar(256),
	`refundAmountYen` int,
	`notifiedAt` timestamp,
	`omaxStatus` varchar(64),
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `esim_incidents_id` PRIMARY KEY(`id`)
);
