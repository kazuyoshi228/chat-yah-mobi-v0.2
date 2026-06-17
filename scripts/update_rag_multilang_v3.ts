import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { listRagDocuments, updateRagDocument } from "../server/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ragDir = join(__dirname, "../../yah-mobile-rag");

const updates = [
  {
    file: "rag_en_v3.md",
    title: "yah.mobile Support FAQ (English)",
    matchId: 30002,
    matchKeyword: "English",
  },
  {
    file: "rag_zh_v3.md",
    title: "yah.mobile 客户支持常见问题（中文）",
    matchId: 30003,
    matchKeyword: "中文",
  },
  {
    file: "rag_ko_v3.md",
    title: "yah.mobile 고객 지원 FAQ（한국어）",
    matchId: 30004,
    matchKeyword: "한국어",
  },
  {
    file: "rag_es_v3.md",
    title: "yah.mobile Preguntas Frecuentes (Español)",
    matchId: 30005,
    matchKeyword: "Español",
  },
];

async function main() {
  const docs = await listRagDocuments();

  console.log("現在のRAGドキュメント:");
  docs.forEach((d) => console.log(`  id=${d.id}: ${d.title}`));
  console.log("");

  for (const u of updates) {
    const content = readFileSync(join(ragDir, u.file), "utf-8");

    // IDで直接検索、なければキーワードで検索
    const doc =
      docs.find((d) => d.id === u.matchId) ||
      docs.find((d) => d.title?.includes(u.matchKeyword));

    if (doc) {
      await updateRagDocument(doc.id, {
        title: u.title,
        content: content,
      });
      console.log(`✓ 更新完了 (id=${doc.id}): ${u.title}`);
    } else {
      console.log(`✗ 対象ドキュメントが見つかりません: ${u.title}`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch(console.error);
