import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const uploadRouter = router({
  // Get presigned upload URL (base64 upload via tRPC)
  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(), // base64 encoded file content
        sessionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const ext = input.fileName.split(".").pop() ?? "bin";
      const key = `chat/${input.sessionId}/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),
});
