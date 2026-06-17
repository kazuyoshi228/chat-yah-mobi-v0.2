import { createRagDocument } from "../server/db";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAG_DIR = "/home/ubuntu/yah-mobile-rag";

const docs = [
  {
    title: "yah.mobile サポートFAQ（日本語）",
    file: join(RAG_DIR, "rag_ja_v2.md"),
  },
  {
    title: "yah.mobile Support FAQ (English)",
    file: join(RAG_DIR, "rag_en_v2.md"),
  },
  {
    title: "yah.mobile 客户支持常见问题（中文）",
    file: join(RAG_DIR, "rag_zh_v2.md"),
  },
  {
    title: "yah.mobile 고객 지원 FAQ（한국어）",
    file: join(RAG_DIR, "rag_ko_v2.md"),
  },
  {
    title: "yah.mobile Preguntas Frecuentes (Español)",
    file: join(RAG_DIR, "rag_es_v2.md"),
  },
];

async function main() {
  console.log("Inserting enhanced RAG documents...");

  for (const doc of docs) {
    const content = readFileSync(doc.file, "utf-8");
    await createRagDocument({
      title: doc.title,
      content,
    });
    console.log(`✓ Inserted: ${doc.title} (${content.length} chars)`);
  }

  console.log("Done! All 5 documents inserted.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
