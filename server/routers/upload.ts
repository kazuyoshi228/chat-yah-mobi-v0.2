import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { getChatSession, createImageAnalysis } from "../db";
import { invokeLLM } from "../_core/llm";

/** Allowed MIME types for chat image uploads */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** 20 MB limit (base64 string length: 20 * 1024 * 1024 * 4/3 ≈ 28.3 MB) */
const MAX_BASE64_LENGTH = Math.ceil(20 * 1024 * 1024 * (4 / 3));

/**
 * Vision AI categories for image classification.
 * These are the possible categories the AI can assign to an uploaded image.
 */
const IMAGE_CATEGORIES = [
  "error_screen",     // Error messages, system errors, crash screens
  "product",          // Product photos, items, merchandise
  "billing",          // Invoices, receipts, payment screenshots
  "account",          // Account settings, profile, login issues
  "ui_feedback",      // UI bugs, layout issues, design feedback
  "document",         // Documents, PDFs, forms, contracts
  "other",            // Anything that doesn't fit above
] as const;

type ImageCategory = (typeof IMAGE_CATEGORIES)[number];

/**
 * Analyze an image using Vision AI (GPT-4o with image_url support).
 * Returns category, keywords, description, and confidence score.
 * Runs asynchronously after upload — never blocks the upload response.
 */
async function analyzeImageWithVisionAI(
  imageUrl: string,
  sessionId: number,
  messageId?: number
): Promise<void> {
  try {
    const prompt = `You are an image analysis assistant for a customer support chat system.
Analyze the uploaded image and return a JSON object with the following fields:
- category: one of ${IMAGE_CATEGORIES.join(", ")}
- keywords: array of 3-8 descriptive keywords (in English)
- description: 1-2 sentence description of what the image shows (in English)
- confidence: float 0.0-1.0 indicating your confidence in the classification

Respond ONLY with valid JSON, no markdown, no explanation.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "image_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              category: { type: "string" },
              keywords: { type: "array", items: { type: "string" } },
              description: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["category", "keywords", "description", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    const category = IMAGE_CATEGORIES.includes(parsed.category as ImageCategory)
      ? (parsed.category as string)
      : "other";

    await createImageAnalysis({
      sessionId,
      messageId: messageId ?? null,
      fileUrl: imageUrl,
      category,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 500) : null,
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    });
  } catch (err) {
    // Vision AI analysis is best-effort — log but never throw
    console.warn("[Vision AI] Image analysis failed:", err);
  }
}

export const uploadRouter = router({
  // Upload a file (image) to S3 storage.
  // Validates: session ownership (visitorId), MIME type, and file size (≤ 20 MB).
  // After upload, triggers async Vision AI analysis (non-blocking).
  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(128),
        base64Data: z.string().min(1),
        sessionId: z.number().int().positive(),
        // visitorId is required for visitor uploads; operators/admins pass their own userId
        visitorId: z.string().min(1).optional(),
        // messageId is optional — set after the message is created
        messageId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // ── 1. Size check ────────────────────────────────────────────────────────
      if (input.base64Data.length > MAX_BASE64_LENGTH) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "File must be 20 MB or smaller.",
        });
      }

      // ── 2. MIME type check ───────────────────────────────────────────────────
      const normalizedMime = input.mimeType.toLowerCase().trim();
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only image files (JPEG, PNG, GIF, WebP, HEIC) are allowed.",
        });
      }

      // ── 3. Session ownership check ───────────────────────────────────────────
      const session = await getChatSession(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat session not found." });
      }

      const isAdmin = ctx.user && ctx.user.role === "admin";

      if (!isAdmin) {
        // Visitor upload: visitorId must match the session
        if (!input.visitorId || session.visitorId !== input.visitorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to upload to this session.",
          });
        }
      }

      // ── 4. Upload ────────────────────────────────────────────────────────────────────────────
      const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "bin";
      const key = `chat/${input.sessionId}/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, normalizedMime);

      // ── 5. Async Vision AI analysis (non-blocking) ───────────────────────────────────────
      // Only analyze images from visitors (not admin uploads)
      // to focus on understanding customer issues.
      if (!isAdmin) {
        setImmediate(() => {
          analyzeImageWithVisionAI(url, input.sessionId, input.messageId).catch(() => {});
        });
      }

      return { url, key };
    }),
});
