CREATE TABLE `chat_flow_nodes` (
	`id` varchar(64) NOT NULL,
	`parentId` varchar(64),
	`type` varchar(32) NOT NULL DEFAULT 'question',
	`label` text NOT NULL,
	`content` text,
	`options` text,
	`icon` varchar(32),
	`formTrigger` tinyint DEFAULT 0,
	`aiTrigger` tinyint DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_flow_nodes_id` PRIMARY KEY(`id`)
);
