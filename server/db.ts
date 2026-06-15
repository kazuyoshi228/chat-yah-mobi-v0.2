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

/**
 * Create a new operator user record.
 * openId is auto-generated as a placeholder (not linked to OAuth).
 */
export async function createOperatorUser(data: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const openId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const name = `${data.firstName} ${data.lastName}`.trim();
  const result = await db.insert(users).values({
    openId,
    name,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: "operator",
    lastSignedIn: new Date(),
  });
  return (result[0] as any).insertId as number;
}

/**
 * Update operator profile (firstName, lastName, email).
 */
export async function updateOperatorProfile(
  userId: number,
  data: { firstName?: string; lastName?: string; email?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { ...data };
  if (data.firstName !== undefined || data.lastName !== undefined) {
    // Re-derive name from current + new values
    const current = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const cur = current[0];
    const fn = data.firstName ?? cur?.firstName ?? "";
    const ln = data.lastName ?? cur?.lastName ?? "";
    updateSet.name = `${fn} ${ln}`.trim();
  }
  await db.update(users).set(updateSet as any).where(eq(users.id, userId));
}

/**
 * Get the number of chat sessions handled by an operator.
 */
export async function getOperatorChatCount(operatorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(chatSessions)
    .where(eq(chatSessions.operatorId, operatorId));
  return Number(result[0]?.count ?? 0);
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

/** List all surveys with their associated session info (for admin feedback view). */
export async function listSurveys(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: surveys.id,
      sessionId: surveys.sessionId,
      rating: surveys.rating,
      resolved: surveys.resolved,
      comment: surveys.comment,
      freeComment: surveys.freeComment,
      createdAt: surveys.createdAt,
      visitorName: chatSessions.visitorName,
      language: chatSessions.language,
      operatorId: chatSessions.operatorId,
    })
    .from(surveys)
    .leftJoin(chatSessions, eq(surveys.sessionId, chatSessions.id))
    .orderBy(desc(surveys.createdAt))
    .limit(limit);
  return rows;
}

/** Aggregate data for the Data Analysis page. */
export async function getAnalysisData(since?: Date) {
  const db = await getDb();
  if (!db) return { sessions: [], messages: [] };

  const sessionsQuery = since
    ? db.select().from(chatSessions).where(gte(chatSessions.createdAt, since))
    : db.select().from(chatSessions);
  const allSessions = await sessionsQuery;

  const messagesQuery = since
    ? db.select().from(messages).where(gte(messages.createdAt, since))
    : db.select().from(messages);
  const allMessages = await messagesQuery;

  return { sessions: allSessions, messages: allMessages };
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
