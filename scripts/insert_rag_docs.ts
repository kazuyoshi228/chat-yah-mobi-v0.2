#!/usr/bin/env tsx
/**
 * yah.mobile RAGドキュメントをDBに直接挿入するスクリプト
 * 実行: cd /home/ubuntu/yah-chat-webdev && npx tsx scripts/insert_rag_docs.ts
 */

import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { chat_rag_documents } from "../drizzle/schema";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL が設定されていません");
  process.exit(1);
}

const documents = [
  {
    title: "yah.mobile サポートFAQ（日本語）",
    file: "/home/ubuntu/yah-mobile-rag/rag_ja.md",
  },
  {
    title: "yah.mobile Support FAQ (English)",
    file: "/home/ubuntu/yah-mobile-rag/rag_en.md",
  },
  {
    title: "yah.mobile 客户支持常见问题（中文）",
    file: "/home/ubuntu/yah-mobile-rag/rag_zh.md",
  },
  {
    title: "yah.mobile 고객 지원 FAQ（한국어）",
    file: "/home/ubuntu/yah-mobile-rag/rag_ko.md",
  },
  {
    title: "yah.mobile Preguntas Frecuentes (Español)",
    file: "/home/ubuntu/yah-mobile-rag/rag_es.md",
  },
];

async function main() {
  const db = drizzle(DATABASE_URL!);
  console.log("DB接続成功");

  for (const doc of documents) {
    const content = readFileSync(doc.file, "utf-8");
    console.log(`\n登録中: ${doc.title} (${content.length} 文字)...`);

    const result = await db.insert(chat_rag_documents).values({
      title: doc.title,
      content,
      embedding: null,
      expiresAt: null,
    });

    const insertId = (result[0] as any).insertId;
    console.log(`✅ 登録完了: ${doc.title} (id: ${insertId})`);
  }

  console.log("\n全ドキュメントの登録が完了しました！");
  process.exit(0);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
