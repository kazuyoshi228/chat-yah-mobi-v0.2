import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extended with 'operator' role for live chat support.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "operator"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Chat sessions table - tracks each visitor conversation.
 * Status: waiting (AI responding) | active (operator assigned) | ended (closed)
 */
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  visitorName: varchar("visitorName", { length: 128 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  status: mysqlEnum("status", ["waiting", "active", "ended"]).default("waiting").notNull(),
  operatorId: int("operatorId").references(() => users.id, { onDelete: "set null" }),
  language: varchar("language", { length: 8 }).default("ja"),
  summary: text("summary"),
  scheduledDeleteAt: timestamp("scheduledDeleteAt"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * Messages table - stores all chat messages.
 * role: visitor | operator | ai
 * senderId: FK to users.id — NULL for visitor/AI messages, set for operator/admin messages.
 *           Allows tracking which staff member sent each message.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["visitor", "operator", "ai"]).notNull(),
  senderId: int("senderId").references(() => users.id, { onDelete: "set null" }), // FK to users.id (nullable)
  content: text("content").notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Quick replies - predefined operator response templates.
 */
export const quickReplies = mysqlTable("quick_replies", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = typeof quickReplies.$inferInsert;

/**
 * RAG documents - knowledge base for AI responses.
 * embedding stored as JSON array of floats.
 * expiresAt: document expiry date; expired docs are excluded from RAG search.
 */
export const ragDocuments = mysqlTable("rag_documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  embedding: json("embedding").$type<number[]>(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RagDocument = typeof ragDocuments.$inferSelect;
export type InsertRagDocument = typeof ragDocuments.$inferInsert;

/**
 * Surveys - post-chat satisfaction surveys.
 * resolved: whether the visitor's issue was resolved (yes/no)
 * freeComment: optional free-text feedback shown only for rating <= 3
 */
export const surveys = mysqlTable("surveys", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(), // 1-5
  resolved: mysqlEnum("resolved", ["yes", "no"]),
  comment: text("comment"),
  freeComment: text("freeComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof surveys.$inferInsert;

/**
 * Image analyses - Vision AI analysis results for uploaded images.
 * category: e.g. "error_screen", "product", "billing", "other"
 * keywords: array of extracted keywords
 * description: AI-generated description of the image content
 * confidence: 0.0-1.0 confidence score
 */
export const imageAnalyses = mysqlTable("image_analyses", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  messageId: int("messageId"),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  category: varchar("category", { length: 128 }),
  keywords: json("keywords").$type<string[]>(),
  description: text("description"),
  confidence: float("confidence").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImageAnalysis = typeof imageAnalyses.$inferSelect;
export type InsertImageAnalysis = typeof imageAnalyses.$inferInsert;

/**
 * Session reads - tracks when each staff member last read a session.
 * Used to compute unread message counts per session per user.
 */
export const sessionReads = mysqlTable("session_reads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  readAt: timestamp("readAt").defaultNow().notNull(),
});

export type SessionRead = typeof sessionReads.$inferSelect;
export type InsertSessionRead = typeof sessionReads.$inferInsert;
