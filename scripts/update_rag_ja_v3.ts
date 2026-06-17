import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { listRagDocuments, updateRagDocument, createRagDocument } from "../server/db";

const __dirname = dirname(fileURLToPath(import.meta.url));

const content = readFileSync(
  join(__dirname, "../../yah-mobile-rag/rag_ja_v3.md"),
  "utf-8"
);

async function main() {
  const docs = await listRagDocuments();

  console.log("現在のRAGドキュメント:");
  docs.forEach((d) => console.log(`  id=${d.id}: ${d.title}`));

  // 日本語ドキュメントを検索
  const jaDoc = docs.find(
    (d) =>
      d.title?.includes("日本語") ||
      d.title?.includes("日本語版") ||
      d.id === 60001
  );

  if (jaDoc) {
    await updateRagDocument(jaDoc.id, {
      title: "yah.mobile サポートFAQ（日本語）",
      content: content,
    });
    console.log(`\n✓ 日本語RAGドキュメント更新完了 (id=${jaDoc.id})`);
  } else {
    await createRagDocument({
      title: "yah.mobile サポートFAQ（日本語）",
      content: content,
    });
    console.log(`\n✓ 日本語RAGドキュメント新規追加完了`);
  }

  console.log("Done!");
  process.exit(0);
}

main().catch(console.error);
