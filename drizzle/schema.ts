import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
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
  isGoogleLogin: int("isGoogleLogin").default(0), // 1 = visitor authenticated via Google OAuth
  formRedirected: int("formRedirected").default(0), // 1 = AI redirected visitor to contact form
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
  translation: text("translation"), // DeepL translated text (nullable)
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

/**
 * Test run logs - records the result of each test execution from the Testing admin page.
 * testType: "e2e" | "vitest" | "rag-embedding"
 * passed: number of tests that passed
 * failed: number of tests that failed
 * total: total number of tests
 * details: JSON array of { name, status } per test
 */
export const testRunLogs = mysqlTable("test_run_logs", {
  id: int("id").autoincrement().primaryKey(),
  testType: varchar("testType", { length: 64 }).notNull(), // "e2e" | "vitest" | "rag-embedding"
  status: varchar("status", { length: 16 }).notNull().default("pass"), // "pass" | "fail"
  passed: int("passed").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  total: int("total").default(0).notNull(),
  details: text("details"),
  triggeredBy: int("triggeredBy").references(() => users.id, { onDelete: "set null" }),
  ranAt: timestamp("ranAt").defaultNow().notNull(),
});
export type TestRunLog = typeof testRunLogs.$inferSelect;
export type InsertTestRunLog = typeof testRunLogs.$inferInsert;

/**
 * Simulation run results - stores the output of run_chat_simulation.mjs.
 * Each row represents one full simulation run (10 sessions).
 * sessionResults: JSON array of per-session results
 */
export const simulationRunResults = mysqlTable("simulation_run_results", {
  id: int("id").autoincrement().primaryKey(),
  totalSessions: int("totalSessions").notNull().default(0),
  totalTurns: int("totalTurns").notNull().default(0),
  totalErrors: int("totalErrors").notNull().default(0),
  formRedirects: int("formRedirects").notNull().default(0),
  avgRagScore: float("avgRagScore").default(0),
  sessionResults: text("sessionResults"), // JSON array of per-session results
  ranAt: timestamp("ranAt").defaultNow().notNull(),
});
export type SimulationRunResult = typeof simulationRunResults.$inferSelect;
export type InsertSimulationRunResult = typeof simulationRunResults.$inferInsert;

/**
 * Chat flow nodes - decision tree for structured chat flow.
 * Each node is a step in the decision tree (question, answer, or redirect).
 * label/content/options stored as JSON for multi-language support.
 */
export const chatFlowNodes = mysqlTable("chat_flow_nodes", {
  id: varchar("id", { length: 64 }).primaryKey(), // e.g. "root", "connection", "connection_not_installed_iphone"
  parentId: varchar("parentId", { length: 64 }),
  type: varchar("type", { length: 32 }).notNull().default("question"), // "question" | "answer" | "redirect_form" | "redirect_ai"
  label: text("label").notNull(), // JSON: {ja, en, ko, zh, th, vi}
  content: text("content"), // JSON: {ja, en, ko, zh, th, vi} - shown for answer nodes
  options: text("options"), // JSON: array of child node IDs
  icon: varchar("icon", { length: 32 }), // emoji icon
  formTrigger: tinyint("formTrigger").default(0), // 1 = triggers form redirect
  aiTrigger: tinyint("aiTrigger").default(0), // 1 = falls back to AI chat
  sortOrder: int("sortOrder").default(0),
  isActive: tinyint("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatFlowNode = typeof chatFlowNodes.$inferSelect;
export type InsertChatFlowNode = typeof chatFlowNodes.$inferInsert;

/**
 * Improvement cards - tracks periodic improvement tasks with scheduled dates.
 * Each card represents a recurring improvement action (e.g., AI model review, RAG translation).
 */
export const improvementCards = mysqlTable("improvement_cards", {
  id: int("id").autoincrement().primaryKey(),
  cardKey: varchar("cardKey", { length: 64 }).notNull().unique(), // e.g. "ai_model", "rag_translation"
  nextDate: timestamp("nextDate"),
  lastDate: timestamp("lastDate"),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ImprovementCard = typeof improvementCards.$inferSelect;
export type InsertImprovementCard = typeof improvementCards.$inferInsert;


/**
 * Plans - yah.mobi/app からWebhookで同期される自社eSIMプラン一覧
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }).unique(), // yah.mobi側のプランID
  name: varchar("name", { length: 128 }).notNull(),
  dataGb: float("dataGb").notNull(),
  durationDays: int("durationDays").notNull(),
  priceYen: int("priceYen").notNull(),
  bestFor: text("bestFor"), // 推奨用途の説明
  isActive: tinyint("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Competitor Plans - yah.mobi/app からWebhookで同期される競合他社プラン
 */
export const competitorPlans = mysqlTable("competitor_plans", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }).unique(),
  competitorName: varchar("competitorName", { length: 128 }).notNull(),
  planName: varchar("planName", { length: 128 }).notNull(),
  dataGb: float("dataGb").notNull(),
  durationDays: int("durationDays").notNull(),
  priceYen: int("priceYen").notNull(),
  sourceUrl: text("sourceUrl"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompetitorPlan = typeof competitorPlans.$inferSelect;
export type InsertCompetitorPlan = typeof competitorPlans.$inferInsert;

/**
 * Customer Profiles - yah.mobi/app からWebhookで同期される顧客プロファイル
 */
export const customerProfiles = mysqlTable("customer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  externalUserId: varchar("externalUserId", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 256 }),
  language: varchar("language", { length: 8 }).default("ja"),
  registeredAt: timestamp("registeredAt"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = typeof customerProfiles.$inferInsert;

/**
 * Purchases - yah.mobi/app からWebhookで同期される購入履歴
 */
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  externalOrderId: varchar("externalOrderId", { length: 128 }).notNull().unique(),
  externalUserId: varchar("externalUserId", { length: 128 }).notNull(),
  planName: varchar("planName", { length: 128 }).notNull(),
  dataGb: float("dataGb"),
  durationDays: int("durationDays"),
  priceYen: int("priceYen").notNull(),
  purchasedAt: timestamp("purchasedAt").notNull(),
  expiresAt: timestamp("expiresAt"),
  status: mysqlEnum("status", ["pending", "active", "expired", "refunded", "cancelled"]).default("pending").notNull(),
  email: varchar("email", { length: 320 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  qrCodeUrl: text("qrCodeUrl"), // QRコード画像URL（yah.mobi/appから受け取り再送に使用）
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

/**
 * eSIM Statuses - yah.mobi/app からWebhookで同期されるeSIM状態
 */
export const esimStatuses = mysqlTable("esim_statuses", {
  id: int("id").autoincrement().primaryKey(),
  externalUserId: varchar("externalUserId", { length: 128 }).notNull(),
  externalOrderId: varchar("externalOrderId", { length: 128 }).notNull().unique(),
  iccid: varchar("iccid", { length: 64 }),
  status: mysqlEnum("status", ["not_installed", "installed", "active", "expired", "error"]).default("not_installed").notNull(),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  dataUsedMb: int("dataUsedMb").default(0),
  dataTotalMb: int("dataTotalMb"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EsimStatus = typeof esimStatuses.$inferSelect;
export type InsertEsimStatus = typeof esimStatuses.$inferInsert;

/**
 * eSIM Incidents - プロビジョニング失敗・自動返金の記録
 */
export const esimIncidents = mysqlTable("esim_incidents", {
  id: int("id").autoincrement().primaryKey(),
  iccid: varchar("iccid", { length: 64 }),
  externalOrderId: varchar("externalOrderId", { length: 128 }),
  externalUserId: varchar("externalUserId", { length: 128 }),
  email: varchar("email", { length: 256 }),
  incidentType: mysqlEnum("incidentType", [
    "provisioning_failed",
    "activation_timeout",
    "esim_expired_early",
    "manual_refund",
  ]).notNull(),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  refundStatus: mysqlEnum("refundStatus", [
    "pending",
    "processing",
    "refunded",
    "failed",
    "not_required",
  ]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  stripeRefundId: varchar("stripeRefundId", { length: 256 }),
  refundAmountYen: int("refundAmountYen"),
  notifiedAt: timestamp("notifiedAt"),
  omaxStatus: varchar("omaxStatus", { length: 64 }),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EsimIncident = typeof esimIncidents.$inferSelect;
export type InsertEsimIncident = typeof esimIncidents.$inferInsert;

/**
 * System Health - 全レイヤーエラー監視レコード
 * layer: frontend | server | stripe | resend | omax | database
 * status: ok | degraded | down | unknown
 */
export const systemHealth = mysqlTable("system_health", {
  id: int("id").autoincrement().primaryKey(),
  layer: mysqlEnum("layer", ["frontend", "server", "stripe", "resend", "omax", "database"]).notNull(),
  status: mysqlEnum("status", ["ok", "degraded", "down", "unknown"]).default("unknown").notNull(),
  message: text("message"),
  errorCount: int("errorCount").default(0).notNull(),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  metadata: json("metadata"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = typeof systemHealth.$inferInsert;
