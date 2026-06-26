import { and, avg, count, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  chatSessions,
  chatFlowNodes,
  imageAnalyses,
  messages,
  quickReplies,
  ragDocuments,
  sessionReads,
  surveys,
  testRunLogs,
  simulationRunResults,
  users,
  type ChatFlowNode,
  type InsertChatFlowNode,
  type ChatSession,
  type ImageAnalysis,
  type InsertChatSession,
  type InsertImageAnalysis,
  type InsertMessage,
  type InsertQuickReply,
  type InsertRagDocument,
  type InsertSurvey,
  type InsertTestRunLog,
  type Message,
  type TestRunLog,
  type SimulationRunResult,
  type InsertSimulationRunResult,
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
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

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));
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
 * B-4: Get all operators with their chat counts in a single query (avoids N+1).
 */
export async function getAllOperatorsWithChatCount() {
  const db = await getDb();
  if (!db) return [];
  const operators = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["operator", "admin"]));
  if (operators.length === 0) return [];

  const ids = operators.map((u) => u.id);
  const counts = await db
    .select({
      operatorId: chatSessions.operatorId,
      count: sql<number>`count(*)`,
    })
    .from(chatSessions)
    .where(inArray(chatSessions.operatorId, ids))
    .groupBy(chatSessions.operatorId);

  const countMap = new Map(counts.map((c) => [c.operatorId, Number(c.count)]));
  return operators.map((op) => ({ ...op, chatCount: countMap.get(op.id) ?? 0 }));
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
  data: Partial<Pick<ChatSession, "status" | "operatorId" | "summary" | "language" | "scheduledDeleteAt" | "formRedirected">>
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
  // Operator Handled = sessions where an operator was assigned (active + ended)
  const operatorHandledSessions = allSessions.filter((s) => !!s.operatorId);
  // Operator Handled count = sessions with operatorId that are ended
  const operatorResolved = operatorHandledSessions.filter((s) => s.status === "ended").length;

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

  // AI vs Operator resolved rate
  // Operator Resolution Rate = (operator-ended sessions) / (all operator-handled sessions) * 100
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
  // Operator Resolution Rate: operator-ended sessions / all ended sessions * 100
  const operatorEndedCount = operatorHandledSessions.filter((s) => s.status === "ended").length;
  const operatorResolvedRate = endedSessions.length > 0
    ? Math.round((operatorEndedCount / endedSessions.length) * 100)
    : null;

  // ── Bot-first KPIs ─────────────────────────────────────────────────────────
  // Form redirect rate: sessions where AI redirected to contact form / total ended sessions
  const formRedirectedCount = endedSessions.filter((s) => s.formRedirected === 1).length;
  const formRedirectRate = endedSessions.length > 0
    ? Math.round((formRedirectedCount / endedSessions.length) * 100)
    : null;

  // Average AI messages per session (ended sessions only)
  let avgAiMessagesPerSession: number | null = null;
  if (endedSessions.length > 0) {
    const sessionIds = endedSessions.map((s) => s.id);
    const aiMessages = since
      ? await db.select().from(messages).where(and(eq(messages.role, "ai"), gte(messages.createdAt, since)))
      : await db.select().from(messages).where(eq(messages.role, "ai"));
    const aiMsgForEnded = aiMessages.filter((m) => sessionIds.includes(m.sessionId));
    avgAiMessagesPerSession = Math.round((aiMsgForEnded.length / endedSessions.length) * 10) / 10;
  }

  // Average session duration (ms): from session createdAt to lastMessageAt for ended sessions
  const sessionsWithDuration = endedSessions.filter((s) => s.lastMessageAt);
  const avgSessionDurationMs = sessionsWithDuration.length > 0
    ? Math.round(
        sessionsWithDuration.reduce((sum, s) => sum + (s.lastMessageAt!.getTime() - s.createdAt.getTime()), 0)
        / sessionsWithDuration.length
      )
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
    // Bot-first KPIs
    formRedirectedCount,
    formRedirectRate,
    avgAiMessagesPerSession,
    avgSessionDurationMs,
  };
}

// ─── Image Analyses ───────────────────────────────────────────────────────────

/**
 * Save Vision AI analysis result for an uploaded image.
 */
export async function createImageAnalysis(data: InsertImageAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(imageAnalyses).values(data);
  return (result[0] as any).insertId as number;
}

/**
 * Get image analyses for a specific session.
 */
export async function getImageAnalysesBySession(sessionId: number): Promise<ImageAnalysis[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(imageAnalyses)
    .where(eq(imageAnalyses.sessionId, sessionId))
    .orderBy(desc(imageAnalyses.createdAt));
}

/**
 * Get aggregated image analytics for the admin dashboard.
 * Returns category counts, top keywords, and recent image messages.
 */
export async function getImageAnalyticsSummary(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { categoryCounts: [], topKeywords: [], recentAnalyses: [], totalImages: 0 };

  const conditions = [];
  if (startDate) conditions.push(gte(imageAnalyses.createdAt, startDate));
  if (endDate) conditions.push(lte(imageAnalyses.createdAt, endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Category counts
  const categoryCounts = await db
    .select({
      category: imageAnalyses.category,
      count: sql<number>`count(*)`,
    })
    .from(imageAnalyses)
    .where(whereClause)
    .groupBy(imageAnalyses.category)
    .orderBy(desc(sql<number>`count(*)`));

  // Total images
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(imageAnalyses)
    .where(whereClause);
  const totalImages = Number(totalResult[0]?.count ?? 0);

  // Recent analyses (last 20)
  const recentAnalyses = await db
    .select()
    .from(imageAnalyses)
    .where(whereClause)
    .orderBy(desc(imageAnalyses.createdAt))
    .limit(20);

  // Aggregate keywords from JSON column
  const allAnalyses = await db
    .select({ keywords: imageAnalyses.keywords })
    .from(imageAnalyses)
    .where(whereClause);

  const keywordFreq: Record<string, number> = {};
  for (const row of allAnalyses) {
    const kws = row.keywords as string[] | null;
    if (Array.isArray(kws)) {
      for (const kw of kws) {
        keywordFreq[kw] = (keywordFreq[kw] ?? 0) + 1;
      }
    }
  }
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    categoryCounts: categoryCounts.map((r) => ({
      category: r.category ?? "uncategorized",
      count: Number(r.count),
    })),
    topKeywords,
    recentAnalyses,
    totalImages,
  };
}

// ─── Session Reads (Unread Badge) ─────────────────────────────────────────────

/**
 * Mark a session as read by a specific user (upsert by userId+sessionId).
 * Updates readAt to now if the record already exists.
 */
export async function markSessionRead(userId: number, sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(sessionReads)
    .values({ userId, sessionId })
    .onDuplicateKeyUpdate({ set: { readAt: sql`now()` } })
    .catch(async () => {
      // Fallback: update existing row
      await db
        .update(sessionReads)
        .set({ readAt: sql`now()` })
        .where(and(eq(sessionReads.userId, userId), eq(sessionReads.sessionId, sessionId)));
    });
}

/**
 * Get unread session IDs for a user.
 * A session is "unread" if lastMessageAt > readAt, or if no read record exists.
 * Returns a Set of sessionIds that have unread messages.
 */
export async function getUnreadSessionIds(userId: number): Promise<Set<number>> {
  const db = await getDb();
  if (!db) return new Set();

  // Sessions with messages newer than last read
  const unreadRows = await db
    .select({ sessionId: chatSessions.id })
    .from(chatSessions)
    .leftJoin(
      sessionReads,
      and(eq(sessionReads.sessionId, chatSessions.id), eq(sessionReads.userId, userId))
    )
    .where(
      and(
        // Only active/waiting sessions (ended sessions don't need badge)
        or(eq(chatSessions.status, "waiting"), eq(chatSessions.status, "active")),
        or(
          // Never read
          isNull(sessionReads.readAt),
          // Last message is newer than last read
          sql`${chatSessions.lastMessageAt} > ${sessionReads.readAt}`
        ),
        // Must have at least one message (lastMessageAt is not null)
        sql`${chatSessions.lastMessageAt} IS NOT NULL`
      )
    );

  return new Set(unreadRows.map((r) => r.sessionId));
}

/**
 * Update lastMessageAt for a session when a new message is sent.
 */
export async function updateSessionLastMessageAt(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(chatSessions)
    .set({ lastMessageAt: sql`now()` })
    .where(eq(chatSessions.id, sessionId));
}

/**
 * Get team scorecard metrics for the admin dashboard.
 * Computes CSAT, resolution rate, AI resolution rate, avg first response time,
 * and escalation rate for a given time range.
 *
 * @param since  Optional start timestamp (ms). If omitted, all-time data is used.
 * @param until  Optional end timestamp (ms). If omitted, now is used.
 */
export async function getTeamScorecard(since?: number, until?: number): Promise<{
  totalSessions: number;
  aiHandled: number;
  operatorHandled: number;
  escalationRate: number;       // 0-1: sessions that went from waiting → active
  avgCsat: number | null;       // 1-5
  resolutionRate: number | null; // 0-1
  avgFirstResponseMs: number | null; // ms from session created to first operator message
  totalScore: number;           // 0-100 composite
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalSessions: 0, aiHandled: 0, operatorHandled: 0,
      escalationRate: 0, avgCsat: null, resolutionRate: null,
      avgFirstResponseMs: null, totalScore: 0,
    };
  }

  const sinceDate = since ? new Date(since) : undefined;
  const untilDate = until ? new Date(until) : undefined;

  const sessionWhere = and(
    sinceDate ? gte(chatSessions.createdAt, sinceDate) : undefined,
    untilDate ? lte(chatSessions.createdAt, untilDate) : undefined,
  );

  // ── Total / AI / Operator handled ────────────────────────────────────────
  const [sessionStats] = await db
    .select({
      total: count(chatSessions.id),
      operatorHandled: sql<number>`SUM(CASE WHEN ${chatSessions.operatorId} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(chatSessions)
    .where(sessionWhere);

  const total = Number(sessionStats?.total ?? 0);
  const opHandled = Number(sessionStats?.operatorHandled ?? 0);
  const aiHandled = total - opHandled;
  const escalationRate = total > 0 ? opHandled / total : 0;

  // ── CSAT & resolution rate ────────────────────────────────────────────────
  const surveyWhere = and(
    sinceDate
      ? gte(
          sql`(SELECT cs.createdAt FROM chat_sessions cs WHERE cs.id = ${surveys.sessionId})`,
          sinceDate
        )
      : undefined,
    untilDate
      ? lte(
          sql`(SELECT cs.createdAt FROM chat_sessions cs WHERE cs.id = ${surveys.sessionId})`,
          untilDate
        )
      : undefined,
  );

  const [surveyStats] = await db
    .select({
      avgRating: avg(surveys.rating),
      totalSurveys: count(surveys.id),
      resolvedYes: sql<number>`SUM(CASE WHEN ${surveys.resolved} = 'yes' THEN 1 ELSE 0 END)`,
    })
    .from(surveys)
    .where(surveyWhere);

  const avgCsat = surveyStats?.avgRating ? Number(surveyStats.avgRating) : null;
  const totalSurveys = Number(surveyStats?.totalSurveys ?? 0);
  const resolvedYes = Number(surveyStats?.resolvedYes ?? 0);
  const resolutionRate = totalSurveys > 0 ? resolvedYes / totalSurveys : null;

  // ── Avg first response time (operator messages) ───────────────────────────
  // For each session, find the earliest operator message and compare to session.createdAt
  const [frtStats] = await db.execute(sql`
    SELECT AVG(TIMESTAMPDIFF(SECOND, cs.createdAt, m.first_msg)) AS avg_frt_sec
    FROM chat_sessions cs
    JOIN (
      SELECT sessionId, MIN(createdAt) AS first_msg
      FROM messages
      WHERE role = 'operator'
      GROUP BY sessionId
    ) m ON m.sessionId = cs.id
    ${sinceDate ? sql`WHERE cs.createdAt >= ${sinceDate}` : sql``}
    ${untilDate ? sql`AND cs.createdAt <= ${untilDate}` : sql``}
  `) as any;

  const avgFrtSec = frtStats?.[0]?.avg_frt_sec ? Number(frtStats[0].avg_frt_sec) : null;
  const avgFirstResponseMs = avgFrtSec !== null ? avgFrtSec * 1000 : null;

  // ── Composite score (0-100) ───────────────────────────────────────────────
  // CSAT (30): rating/5 * 30
  // Resolution rate (25): rate * 25
  // AI resolution rate (20): aiHandled/total * 20
  // FRT (15): target = 60s; score = max(0, 1 - frtSec/300) * 15
  // Low escalation (10): (1 - escalationRate) * 10
  let score = 0;
  if (avgCsat !== null) score += (avgCsat / 5) * 30;
  if (resolutionRate !== null) score += resolutionRate * 25;
  if (total > 0) score += (aiHandled / total) * 20;
  if (avgFrtSec !== null) score += Math.max(0, 1 - avgFrtSec / 300) * 15;
  score += (1 - escalationRate) * 10;

  return {
    totalSessions: total,
    aiHandled,
    operatorHandled: opHandled,
    escalationRate,
    avgCsat,
    resolutionRate,
    avgFirstResponseMs,
    totalScore: Math.round(score),
  };
}

// ─── Test Run Logs ────────────────────────────────────────────────────────────

/** Save a test run result to the database. */
export async function createTestRunLog(data: InsertTestRunLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(testRunLogs).values(data);
  return (result[0] as any).insertId as number;
}

/** Get the latest test run log for each testType. */
export async function getLatestTestRunLogs(): Promise<TestRunLog[]> {
  const db = await getDb();
  if (!db) return [];
  // Get latest log per testType using subquery
  const rows = await db
    .select()
    .from(testRunLogs)
    .orderBy(desc(testRunLogs.ranAt))
    .limit(50);
  // Deduplicate: keep only the latest per testType
  const seen = new Set<string>();
  const result: TestRunLog[] = [];
  for (const row of rows) {
    if (!seen.has(row.testType)) {
      seen.add(row.testType);
      result.push(row);
    }
  }
  return result;
}

/** Get all test run logs (for history view). */
export async function listTestRunLogs(limit = 20): Promise<TestRunLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testRunLogs).orderBy(desc(testRunLogs.ranAt)).limit(limit);
}

// ─── Simulation Run Results ───────────────────────────────────────────────────

/** Save a simulation run result to the DB. */
export async function saveSimulationResult(
  data: InsertSimulationRunResult
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(simulationRunResults).values(data);
  return (result[0] as any).insertId as number;
}

/** Get the latest simulation run result. */
export async function getLatestSimulationResult(): Promise<SimulationRunResult | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(simulationRunResults)
    .orderBy(desc(simulationRunResults.ranAt))
    .limit(1);
  return rows[0] ?? null;
}

/** List simulation run results (most recent first). */
export async function listSimulationResults(limit = 10): Promise<SimulationRunResult[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(simulationRunResults)
    .orderBy(desc(simulationRunResults.ranAt))
    .limit(limit);
}

// ─── Chat Flow Nodes (Decision Tree) ────────────────────────────────────────

/** Get all active chat flow nodes (for building the decision tree client-side). */
export async function getChatFlowNodes(): Promise<ChatFlowNode[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatFlowNodes)
    .where(eq(chatFlowNodes.isActive, 1))
    .orderBy(chatFlowNodes.sortOrder);
}

/** Get a single chat flow node by ID. */
export async function getChatFlowNode(id: string): Promise<ChatFlowNode | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(chatFlowNodes)
    .where(eq(chatFlowNodes.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** List ALL chat flow nodes (including inactive) for admin management. */
export async function listAllChatFlowNodes(): Promise<ChatFlowNode[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatFlowNodes)
    .orderBy(chatFlowNodes.sortOrder, chatFlowNodes.id);
}

/** Upsert (insert or update) a chat flow node. */
export async function upsertChatFlowNode(
  node: InsertChatFlowNode
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(chatFlowNodes)
    .values(node)
    .onDuplicateKeyUpdate({
      set: {
        parentId: node.parentId,
        type: node.type,
        label: node.label,
        content: node.content,
        options: node.options,
        icon: node.icon,
        formTrigger: node.formTrigger,
        aiTrigger: node.aiTrigger,
        sortOrder: node.sortOrder,
        isActive: node.isActive,
      },
    });
}

/** Soft-delete a chat flow node (set isActive = 0). */
export async function deactivateChatFlowNode(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(chatFlowNodes)
    .set({ isActive: 0 })
    .where(eq(chatFlowNodes.id, id));
}
