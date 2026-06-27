import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChatSession,
  createMessage,
  getChatSession,
  getChatSessionByVisitorId,
  getMessagesBySessionId,
  updateChatSession,
  updateSessionLastMessageAt,
  createSurvey,
  getSurveyBySessionId,
  scheduleSessionDeletion,
  listQuickReplies,
  getChatFlowNodes,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { detectLanguageFromMessage, generateAIResponse, generateSummary } from "./ai";
import { notifyOwner } from "../_core/notification";
import { getIo } from "../socket";
import { sendEscalationEmail, sendNewChatEmail, sendAIEscalationNotificationEmail, sendQrResendEmail } from "../email";
import { getAllAdmins } from "../db";
import { toTranslationLabel, translateToJapaneseWithResult } from "../_core/deepl";
import { checkRateLimit, messageLimiter, sessionLimiter, qrResendLimiter, ipLimiter, dailyAiCostLimiter } from "../rateLimit";
import { sanitizeInput, containsXSS, isSpamContent, isNonsenseMessage } from "../sanitize";
import { verifyTurnstile } from "../turnstile";

export const chatRouter = router({
  // Start a new chat session or resume existing one
  startSession: publicProcedure
    .input(
      z.object({
        visitorId: z.string().min(1).max(100),
        visitorName: z.string().max(100).optional(),
        visitorEmail: z.string().email().max(254).optional(),
        initialMessage: z.string().min(1).max(2000),
        language: z.enum(["ja", "en", "zh", "ko", "th", "vi"]).default("ja"),
        isGoogleLogin: z.boolean().optional().default(false),
        flowContext: z.object({
          category: z.string().optional(),
          device: z.string().optional(),
          stage: z.string().optional(),
          issue: z.string().optional(),
        }).optional(),
        turnstileToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Turnstile CAPTCHA verification (if token provided)
      if (input.turnstileToken) {
        const isHuman = await verifyTurnstile(input.turnstileToken);
        if (!isHuman) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CAPTCHA verification failed. Please try again." });
        }
      }

      // Rate limit: max 5 sessions per 10 min per visitorId
      const rl = await checkRateLimit(sessionLimiter, input.visitorId);
      if (!rl.success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sessions. Please wait before starting a new chat." });
      }
      // 5.3: Race condition guard — re-check after first lookup to prevent duplicate sessions
      // Pattern: check → create → re-check (handles concurrent requests from the same visitor)
      const existing = await getChatSessionByVisitorId(input.visitorId);
      if (existing && existing.status !== "ended") {
        return { sessionId: existing.id, isNew: false };
      }

      // Create new session
      const sessionId = await createChatSession({
        visitorId: input.visitorId,
        visitorName: input.visitorName,
        visitorEmail: input.visitorEmail,
        status: "waiting",
        language: input.language,
        isGoogleLogin: input.isGoogleLogin ? 1 : 0,
      });

      // 5.3: Post-insert re-check — if a concurrent request created a session first,
      // return the earliest active session to avoid duplicates
      const concurrent = await getChatSessionByVisitorId(input.visitorId);
      if (concurrent && concurrent.id !== sessionId && concurrent.status !== "ended") {
        // Another session was created concurrently; discard ours (it will be cleaned up by purge)
        await updateChatSession(sessionId, { status: "ended" });
        return { sessionId: concurrent.id, isNew: false };
      }

      // Save visitor's first message (with translation if non-Japanese)
      const initialTxResult = await translateToJapaneseWithResult(
        input.initialMessage,
        input.language
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const initialTranslation = toTranslationLabel(initialTxResult);
      await createMessage({
        sessionId,
        role: "visitor",
        content: input.initialMessage,
        translation: initialTranslation,
      });

      // Generate AI response (with flow context if user came through decision tree)
      const { content: aiContent, shouldEscalate } = await generateAIResponse(
        sessionId,
        input.initialMessage,
        [],
        input.language,
        input.flowContext,
        input.visitorEmail
      );

      // Translate AI response to Japanese for operator display (skip if already Japanese)
      const aiTxResult0 = await translateToJapaneseWithResult(
        aiContent,
        input.language
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const aiTranslation0 = toTranslationLabel(aiTxResult0);

      await createMessage({
        sessionId,
        role: "ai",
        content: aiContent,
        translation: aiTranslation0,
      });

      // Notify via socket
      const io = getIo();
      if (io) {
        io.to("operators").emit("new_session", {
          sessionId,
          visitorName: input.visitorName,
          language: input.language,
          shouldEscalate,
        });
      }

      // Notify owner (Manus platform notification)
      await notifyOwner({
        title: "新規チャット開始",
        content: `${input.visitorName ?? "訪問者"} がチャットを開始しました。\n最初のメッセージ: ${input.initialMessage}`,
      }).catch(() => {});

      // Send email notification to admins if escalation is needed
      if (shouldEscalate) {
        const admins = await getAllAdmins().catch(() => []);
        await Promise.allSettled(
          admins
            .filter((a) => a.email)
            .map((a) =>
              sendEscalationEmail({
                toEmail: a.email!,
                operatorName: a.name ?? "Admin",
                sessionId,
                visitorName: input.visitorName,
                language: input.language,
                urgent: true,
                appUrl: "https://chat.yah.mobi",
              })
            )
        );
      }

      return { sessionId, isNew: true, aiResponse: aiContent, shouldEscalate };
    }),

  // Get session info
  getSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      return session;
    }),

  // Get messages for a session.
  // Visitors must supply their visitorId to prove ownership.
  // Operators/admins (authenticated users) can access any session.
  getMessages: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string().optional(), // required for unauthenticated visitors
      })
    )
    .query(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const isOperatorOrAdmin =
        ctx.user && (ctx.user.role === "operator" || ctx.user.role === "admin");

      if (!isOperatorOrAdmin) {
        if (!input.visitorId || session.visitorId !== input.visitorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Visitor ID does not match this session.",
          });
        }
      }

      const msgs = await getMessagesBySessionId(input.sessionId);

      // For visitors: remap operator messages so they see translated content
      if (!isOperatorOrAdmin) {
        return msgs.map((m) => {
          if (m.role === "operator" && m.translation) {
            return { ...m, content: m.translation, translation: null };
          }
          return m;
        });
      }

      return msgs;
    }),

  // Send a visitor message and get AI response
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string().max(100),
        content: z.string().max(2000),
        fileUrl: z.string().optional(),
        flowContext: z.object({
          category: z.string().optional(),
          device: z.string().optional(),
          stage: z.string().optional(),
          issue: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Rate limit: max 20 messages per minute per visitorId
      const rl = await checkRateLimit(messageLimiter, input.visitorId);
      if (!rl.success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You are sending messages too quickly. Please wait a moment." });
      }
      // Sanitize input
      const sanitizedContent = sanitizeInput(input.content);
      if (!sanitizedContent.trim() && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message content or image required" });
      }
      // Block XSS attempts
      if (containsXSS(input.content)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid message content." });
      }
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // B-6: Reject messages to ended sessions
      if (session.status === "ended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This chat session has ended.",
        });
      }

      // Max 50 messages per session to prevent abuse
      const existingMessages = await getMessagesBySessionId(input.sessionId);
      if (existingMessages.length >= 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This session has reached the maximum message limit. Please start a new chat or use the contact form.",
        });
      }

      // Spam/nonsense detection (repeated messages, gibberish)
      if (isSpamContent(sanitizedContent, existingMessages.filter(m => m.role === "visitor").slice(-3).map(m => m.content))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please provide a meaningful message." });
      }
      // Nonsense/random character detection
      if (isNonsenseMessage(sanitizedContent)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please provide a meaningful message related to your inquiry." });
      }

      // Save visitor message (with translation if non-Japanese)
      const visitorTxResult = await translateToJapaneseWithResult(
        sanitizedContent,
        session.language ?? "ja"
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const visitorTranslation = toTranslationLabel(visitorTxResult) ?? null;
      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "visitor",
        content: sanitizedContent,
        translation: visitorTranslation ?? undefined,
        fileUrl: input.fileUrl,
      });
      await updateSessionLastMessageAt(input.sessionId);

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: msgId,
          sessionId: input.sessionId,
          role: "visitor",
          content: sanitizedContent,
          translation: visitorTranslation ?? null,
          fileUrl: input.fileUrl,
          createdAt: new Date(),
        });
      }

      // If operator is assigned OR session is active (operator taking over), don't auto-reply
      if (session.status === "active" || session.operatorId) {
        return { aiResponse: null, shouldEscalate: false };
      }

      // Get conversation history for context
      const history = await getMessagesBySessionId(input.sessionId);

      // Detect language from message content; update session if changed
      const sessionLang = session.language ?? "ja";
      const detectedLang = detectLanguageFromMessage(input.content) ?? sessionLang;
      if (detectedLang !== sessionLang) {
        await updateChatSession(input.sessionId, { language: detectedLang }).catch(() => {});
      }
      const effectiveLang = detectedLang;

      // Daily AI cost limit check (global)
      const costCheck = await checkRateLimit(dailyAiCostLimiter, "global");
      if (!costCheck.success) {
        // Cost limit exceeded — return a polite fallback without calling LLM
        const fallbackMsg = effectiveLang === "ja"
          ? "現在AIサポートが一時的に利用できません。お手数ですが、お問い合わせフォームよりご連絡ください。"
          : "AI support is temporarily unavailable. Please use the contact form for assistance.";
        const fallbackMsgId = await createMessage({
          sessionId: input.sessionId,
          role: "ai",
          content: fallbackMsg,
        });
        if (io) {
          io.to(`session:${input.sessionId}`).emit("new_message", {
            id: fallbackMsgId,
            sessionId: input.sessionId,
            role: "ai",
            content: fallbackMsg,
            createdAt: new Date(),
          });
        }
        // Notify owner about cost limit reached (fire-and-forget)
        import("../_core/notification").then(({ notifyOwner }) => {
          notifyOwner({
            title: "[Alert] AI日次コスト上限に到達",
            content: `本日のAI応答回数が上限(500回)に達しました。\nAI応答は一時停止中です。\n\n対応: Upstash Redisのrl:cost:globalキーを削除するか、翌日の自動リセットをお待ちください。`,
          }).catch(() => {});
        }).catch(() => {});

        return { aiResponse: fallbackMsg, shouldEscalate: true };
      }

      // Generate AI response (language detection already done above, with flow context if available)
      const { content: aiContent, shouldEscalate, shouldRedirectToForm } = await generateAIResponse(
        input.sessionId,
        input.content,
        history.map((m) => ({ role: m.role, content: m.content })),
        effectiveLang,
        input.flowContext,
        session.visitorEmail
      );

      // Translate AI response to Japanese for operator display (skip if already Japanese)
      const aiTxResult = await translateToJapaneseWithResult(
        aiContent,
        effectiveLang
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const aiTranslation = toTranslationLabel(aiTxResult);

      const aiMsgId = await createMessage({
        sessionId: input.sessionId,
        role: "ai",
        content: aiContent,
        translation: aiTranslation,
      });

      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: aiMsgId,
          sessionId: input.sessionId,
          role: "ai",
          content: aiContent,
          translation: aiTranslation ?? null,
          createdAt: new Date(),
        });

        if (shouldRedirectToForm) {
          // Persist form-redirect flag for analytics
          await updateChatSession(input.sessionId, { formRedirected: 1 }).catch(() => {});
          io.to(`session:${input.sessionId}`).emit("redirect_to_form", {
            sessionId: input.sessionId,
          });
          // Notify owner via email so they can add the question to RAG
          sendAIEscalationNotificationEmail({
            sessionId: input.sessionId,
            visitorName: session.visitorName,
            visitorEmail: session.visitorEmail,
            language: effectiveLang,
            userMessage: input.content,
            aiResponse: aiContent,
            appUrl: "https://chat.yah.mobi",
          }).catch(() => {});
        }
      }

      return { aiResponse: aiContent, shouldEscalate, shouldRedirectToForm };
    }),

  // End a session
  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Generate summary
      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      await updateChatSession(input.sessionId, { status: "ended", summary });

      // Data retention: schedule deletion 2 years from now (GDPR/個人情報保護法対応)
      await scheduleSessionDeletion(input.sessionId).catch(() => {});

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("session_ended", {
          sessionId: input.sessionId,
        });
        io.to("operators").emit("session_ended", { sessionId: input.sessionId });
      }

      return { success: true };
    }),

  // Submit post-chat survey
  submitSurvey: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
        rating: z.number().min(1).max(5),
        resolved: z.enum(["yes", "no"]).optional(),
        comment: z.string().optional(),
        freeComment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check if survey already submitted
      const existing = await getSurveyBySessionId(input.sessionId);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Survey already submitted" });

      await createSurvey({
        sessionId: input.sessionId,
        rating: input.rating,
        resolved: input.resolved,
        comment: input.comment,
        freeComment: input.freeComment,
      });

      // Notify operators via Socket.io that survey has been submitted
      const io = getIo();
      if (io) {
        const surveyPayload = {
          sessionId: input.sessionId,
          rating: input.rating,
          resolved: input.resolved ?? null,
          freeComment: input.freeComment ?? null,
          submittedAt: new Date(),
        };
        // Notify the session room (operator viewing this specific chat)
        io.to(`session:${input.sessionId}`).emit("survey_submitted", surveyPayload);
        // Also notify all operators (for list view updates)
        io.to("operators").emit("survey_submitted", surveyPayload);
      }

      return { success: true };
    }),

  // Request escalation to operator
  requestEscalation: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const io = getIo();
      if (io) {
        io.to("operators").emit("escalation_alert", {
          sessionId: input.sessionId,
          visitorName: session.visitorName,
          urgent: true,
        });
      }

      // Send escalation email to admins only
      const admins = await getAllAdmins().catch(() => []);
      await Promise.allSettled(
        admins
          .filter((a) => a.email)
          .map((a) =>
            sendEscalationEmail({
              toEmail: a.email!,
              operatorName: a.name ?? "Admin",
              sessionId: input.sessionId,
              visitorName: session.visitorName,
              language: session.language,
              urgent: true,
              appUrl: "https://chat.yah.mobi",
            })
          )
      );

      return { success: true };
    }),

  // Public read-only quick replies (used by operator and admin panels)
  listQuickReplies: publicProcedure.query(async () => {
    return listQuickReplies();
  }),

  // Public decision tree flow nodes
  getFlowNodes: publicProcedure.query(async () => {
    return getChatFlowNodes();
  }),

  // Submit contact form (for form-redirect nodes)
  submitContactForm: publicProcedure
    .input(
      z.object({
        visitorId: z.string().min(1),
        email: z.string().email(),
        message: z.string().min(1),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Notify owner about the form submission
      await notifyOwner({
        title: `サポートフォーム送信 [${input.language ?? "en"}]`,
        content: `Email: ${input.email}\n\n${input.message}`,
      });
      return { success: true };
    }),

  // Check purchase and resend QR code email
  checkQrResend: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Rate limit: max 3 QR resends per 30 min per email
      const rl = await checkRateLimit(qrResendLimiter, input.email);
      if (!rl.success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many resend attempts. Please wait 30 minutes." });
      }

      const { getDb } = await import("../db");
      const { purchases } = await import("../../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return { status: "error" as const, message: "Service temporarily unavailable." };

      // Find the most recent purchase by email
      const [purchase] = await db
        .select()
        .from(purchases)
        .where(eq(purchases.email, input.email))
        .orderBy(desc(purchases.purchasedAt))
        .limit(1);

      if (!purchase) {
        // No purchase record found
        return {
          status: "not_found" as const,
          message: "no_purchase",
        };
      }

      if (!purchase.qrCodeUrl) {
        // Purchase exists but QR URL not stored yet
        return {
          status: "no_qr" as const,
          message: "qr_not_available",
          orderId: purchase.externalOrderId,
        };
      }

      // Resend the QR code email
      const sent = await sendQrResendEmail({
        to: input.email,
        qrCodeUrl: purchase.qrCodeUrl,
        planName: purchase.planName,
        orderId: purchase.externalOrderId,
        language: input.language ?? "en",
      });

      if (sent) {
        console.log(`[QR Resend] Sent QR code to ${input.email} for order ${purchase.externalOrderId}`);
        return {
          status: "sent" as const,
          message: "qr_sent",
          orderId: purchase.externalOrderId,
          planName: purchase.planName,
        };
      } else {
        return {
          status: "error" as const,
          message: "send_failed",
        };
      }
    }),
});
