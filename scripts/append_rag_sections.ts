import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { listRagDocuments, updateRagDocument } from "../server/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ragDir = join(__dirname, "../../yah-mobile-rag");

// 追加コンテンツを言語別に分割
const additionsRaw = readFileSync(join(ragDir, "rag_additions.md"), "utf-8");

function extractSection(raw: string, startMarker: string, endMarker?: string): string {
  const start = raw.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? raw.indexOf(endMarker, start + startMarker.length) : raw.length;
  return raw.slice(start + startMarker.length, end === -1 ? raw.length : end).trim();
}

const additions: Record<string, string> = {
  ja: extractSection(additionsRaw, "## 日本語", "## English"),
  en: extractSection(additionsRaw, "## English", "## 中文"),
  zh: extractSection(additionsRaw, "## 中文", "## 한국어"),
  ko: extractSection(additionsRaw, "## 한국어", "## Español"),
  es: extractSection(additionsRaw, "## Español"),
};

const targets = [
  { lang: "ja", matchId: 60001, keyword: "日本語" },
  { lang: "en", matchId: 30002, keyword: "English" },
  { lang: "zh", matchId: 30003, keyword: "中文" },
  { lang: "ko", matchId: 30004, keyword: "한국어" },
  { lang: "es", matchId: 30005, keyword: "Español" },
];

async function main() {
  const docs = await listRagDocuments();

  console.log("現在のRAGドキュメント:");
  docs.forEach((d) => console.log(`  id=${d.id}: ${d.title}`));
  console.log("");

  for (const t of targets) {
    const doc = docs.find((d) => d.id === t.matchId) ||
      docs.find((d) => d.title?.includes(t.keyword));

    if (!doc) {
      console.log(`✗ 対象ドキュメントが見つかりません: ${t.keyword}`);
      continue;
    }

    const addition = additions[t.lang];
    if (!addition) {
      console.log(`✗ 追加コンテンツが見つかりません: ${t.lang}`);
      continue;
    }

    const newContent = (doc.content ?? "") + "\n\n---\n\n" + addition;
    await updateRagDocument(doc.id, { content: newContent });
    console.log(`✓ 追記完了 (id=${doc.id}): ${doc.title} (+${addition.length}文字)`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch(console.error);
