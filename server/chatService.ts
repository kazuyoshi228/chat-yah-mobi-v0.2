/**
 * chatService.ts
 * Shared business logic for sending operator/admin messages.
 * Used by both operator.ts and admin.ts to avoid duplication.
 */
import { createMessage, updateSessionLastMessageAt } from "./db";
import { toTranslationLabel, translateFromJapaneseWithResult } from "./_core/deepl";
import { getIo } from "./socket";
import type { ChatSession } from "../drizzle/schema";

export interface SendMessageOptions {
  session: ChatSession;
  content: string;
  fileUrl?: string;
  senderId: number;
  senderName: string | null;
}

export interface SendMessageResult {
  messageId: number;
  translatedContent: string | null;
  translationLabel: string | null;
}

/**
 * Translate, save, and broadcast an operator/admin message.
 * Returns the saved message ID and translation metadata.
 */
export async function sendOperatorMessage(opts: SendMessageOptions): Promise<SendMessageResult> {
  const { session, content, fileUrl, senderId, senderName } = opts;

  // Layer 2: Auto-translate to visitor's language (server-side)
  const sessionLang = session.language ?? "ja";
  const txResult = await translateFromJapaneseWithResult(content, sessionLang).catch(
    () => ({ ok: false as const, reason: "network_error" as const })
  );
  const translatedContent = txResult.ok ? txResult.text : null;
  const translationLabel = toTranslationLabel(txResult) ?? null;

  const msgId = await createMessage({
    sessionId: session.id,
    role: "operator",
    senderId,
    content,
    translation: translationLabel ?? undefined,
    fileUrl,
  });
  await updateSessionLastMessageAt(session.id);

  const io = getIo();
  if (io) {
    io.to(`session:${session.id}`).emit("new_message", {
      id: msgId,
      sessionId: session.id,
      role: "operator",
      // Visitor sees translated text (or original if translation failed/skipped)
      content: translatedContent ?? content,
      originalContent: content,
      translation: translationLabel,
      fileUrl,
      operatorName: senderName,
      createdAt: new Date(),
    });
  }

  return { messageId: msgId, translatedContent, translationLabel };
}
