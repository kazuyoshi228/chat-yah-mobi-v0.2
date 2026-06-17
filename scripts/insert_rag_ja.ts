import { createRagDocument } from "../server/db";
import { readFileSync } from "fs";

async function main() {
  const content = readFileSync("/home/ubuntu/yah-mobile-rag/rag_ja_v2.md", "utf-8");
  await createRagDocument({
    title: "yah.mobile サポートFAQ（日本語）",
    content,
  });
  console.log(`✓ Inserted Japanese RAG document (${content.length} chars)`);
  process.exit(0);
}

main().catch(console.error);
