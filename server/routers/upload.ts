import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { getChatSession } from "../db";

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

export const uploadRouter = router({
  // Upload a file (image) to S3 storage.
  // Validates: session ownership (visitorId), MIME type, and file size (≤ 20 MB).
  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(128),
        base64Data: z.string().min(1),
        sessionId: z.number().int().positive(),
        // visitorId is required for visitor uploads; operators/admins pass their own userId
        visitorId: z.string().min(1).optional(),
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

      const isOperatorOrAdmin =
        ctx.user && (ctx.user.role === "operator" || ctx.user.role === "admin");

      if (!isOperatorOrAdmin) {
        // Visitor upload: visitorId must match the session
        if (!input.visitorId || session.visitorId !== input.visitorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to upload to this session.",
          });
        }
      }

      // ── 4. Upload ────────────────────────────────────────────────────────────
      const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "bin";
      const key = `chat/${input.sessionId}/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, normalizedMime);
      return { url, key };
    }),
});
