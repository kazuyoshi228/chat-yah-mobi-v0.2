import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  chatSessions,
  messages,
  quickReplies,
  ragDocuments,
  surveys,
  users,
  type ChatSession,
  type InsertChatSession,
  type InsertMessage,
  type InsertQuickReply,
  type InsertRagDocument,
  type InsertSurvey,
  type Message,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllOperators() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(inArray(users.role, ["operator", "admin"]));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "operator") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export async function createChatSession(data: InsertChatSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(chatSessions).values(data);
  return (result[0] as any).insertId as number;
}

export async function getChatSession(id: number): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1);
  return result[0];
}

export async function getChatSessionByVisitorId(visitorId: string): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.visitorId, visitorId)))
    .orderBy(desc(chatSessions.createdAt))
    .limit(1);
  return result[0];
}

export async function listChatSessions(status?: "waiting" | "active" | "ended") {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt));
  if (status) {
    return db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.status, status))
      .orderBy(desc(chatSessions.updatedAt));
  }
  return query;
}

export async function updateChatSession(
  id: number,
  data: Partial<Pick<ChatSession, "status" | "operatorId" | "summary" | "language" | "scheduledDeleteAt">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatSessions).set(data).where(eq(chatSessions.id, id));
}

/**
 * Data retention: set scheduledDeleteAt = 2 years from createdAt for ended sessions
 * that don't yet have a scheduled delete date.
 */
export async function scheduleSessionDeletion(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const session = await getChatSession(sessionId);
  if (!session || session.scheduledDeleteAt) return;
  const deleteAt = new Date(session.createdAt);
  deleteAt.setFullYear(deleteAt.getFullYear() + 2);
  await db
    .update(chatSessions)
    .set({ scheduledDeleteAt: deleteAt })
    .where(eq(chatSessions.id, sessionId));
}

/**
 * Data retention: physically delete sessions and messages past their scheduled delete date.
 * Called by the heartbeat job.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const now = new Date();
  const expired = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(and(sql`${chatSessions.scheduledDeleteAt} IS NOT NULL`, lte(chatSessions.scheduledDeleteAt, now)));
  if (expired.length === 0) return 0;
  const ids = expired.map((s) => s.id);
  // Delete messages first (FK dependency)
  for (const id of ids) {
    await db.delete(messages).where(eq(messages.sessionId, id));
  }
  await db.delete(chatSessions).where(inArray(chatSessions.id, ids));
  console.log(`[DataRetention] Purged ${ids.length} expired sessions`);
  return ids.length;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function createMessage(data: InsertMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(messages).values(data);
  return (result[0] as any).insertId as number;
}

export async function getMessagesBySessionId(sessionId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);
}

// ─── Quick Replies ────────────────────────────────────────────────────────────

export async function listQuickReplies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quickReplies).orderBy(quickReplies.createdAt);
}

export async function createQuickReply(data: InsertQuickReply) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(quickReplies).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateQuickReply(id: number, data: Partial<InsertQuickReply>) {
  const db = await getDb();
  if (!db) return;
  await db.update(quickReplies).set(data).where(eq(quickReplies.id, id));
}

export async function deleteQuickReply(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(quickReplies).where(eq(quickReplies.id, id));
}

// ─── RAG Documents ────────────────────────────────────────────────────────────

/** List all RAG documents (admin view - includes expired). */
export async function listRagDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ragDocuments).orderBy(desc(ragDocuments.createdAt));
}

/** List only non-expired RAG documents (used for AI search). */
export async function listActiveRagDocuments() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(ragDocuments)
    .where(or(isNull(ragDocuments.expiresAt), sql`${ragDocuments.expiresAt} > ${now}`))
    .orderBy(desc(ragDocuments.createdAt));
}

export async function createRagDocument(data: InsertRagDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(ragDocuments).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateRagDocument(id: number, data: Partial<InsertRagDocument>) {
  const db = await getDb();
  if (!db) return;
  await db.update(ragDocuments).set(data).where(eq(ragDocuments.id, id));
}

export async function deleteRagDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(ragDocuments).where(eq(ragDocuments.id, id));
}

export async function getRagDocumentsWithEmbeddings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ragDocuments).where(eq(ragDocuments.embedding, ragDocuments.embedding));
}

// ─── Surveys ──────────────────────────────────────────────────────────────────

export async function createSurvey(data: InsertSurvey) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(surveys).values(data);
  return (result[0] as any).insertId as number;
}

export async function getSurveyBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(surveys).where(eq(surveys.sessionId, sessionId)).limit(1);
  return result[0];
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

export async function getKpiStats(since?: Date) {
  const db = await getDb();
  if (!db) return {
    total: 0, aiResolved: 0, operatorResolved: 0, avgRating: 0,
    resolvedRate: 0, aiResolvedRate: 0, operatorResolvedRate: 0,
    surveyCount: 0, resolvedCount: 0, unresolvedCount: 0,
  };

  const allSessions = since
    ? await db.select().from(chatSessions).where(gte(chatSessions.createdAt, since))
    : await db.select().from(chatSessions);
  const total = allSessions.length;
  const endedSessions = allSessions.filter((s) => s.status === "ended");
  // AI resolved = sessions that ended without an operator
  const aiResolved = endedSessions.filter((s) => !s.operatorId).length;
  // Operator resolved = sessions that ended with an operator
  const operatorResolved = endedSessions.filter((s) => !!s.operatorId).length;

  const allSurveys = since
    ? await db.select().from(surveys).where(gte(surveys.createdAt, since))
    : await db.select().from(surveys);
  const surveyCount = allSurveys.length;
  const avgRating =
    surveyCount > 0
      ? allSurveys.reduce((sum, s) => sum + s.rating, 0) / surveyCount
      : 0;

  // Resolution rate from survey answers
  const surveysWithResolved = allSurveys.filter((s) => s.resolved !== null && s.resolved !== undefined);
  const resolvedCount = surveysWithResolved.filter((s) => s.resolved === "yes").length;
  const unresolvedCount = surveysWithResolved.filter((s) => s.resolved === "no").length;
  const resolvedRate = surveysWithResolved.length > 0
    ? Math.round((resolvedCount / surveysWithResolved.length) * 100)
    : null;

  // AI vs Operator resolved rate (from surveys joined with sessions)
  const sessionMap = new Map(allSessions.map((s) => [s.id, s]));
  const aiSurveys = surveysWithResolved.filter((sv) => {
    const sess = sessionMap.get(sv.sessionId);
    return sess && !sess.operatorId;
  });
  const opSurveys = surveysWithResolved.filter((sv) => {
    const sess = sessionMap.get(sv.sessionId);
    return sess && !!sess.operatorId;
  });
  const aiResolvedRate = aiSurveys.length > 0
    ? Math.round((aiSurveys.filter((s) => s.resolved === "yes").length / aiSurveys.length) * 100)
    : null;
  const operatorResolvedRate = opSurveys.length > 0
    ? Math.round((opSurveys.filter((s) => s.resolved === "yes").length / opSurveys.length) * 100)
    : null;

  return {
    total,
    aiResolved,
    operatorResolved,
    avgRating: Math.round(avgRating * 10) / 10,
    surveyCount,
    resolvedCount,
    unresolvedCount,
    resolvedRate,       // overall % resolved (null if no survey data)
    aiResolvedRate,     // AI-handled sessions % resolved
    operatorResolvedRate, // Operator-handled sessions % resolved
  };
}
