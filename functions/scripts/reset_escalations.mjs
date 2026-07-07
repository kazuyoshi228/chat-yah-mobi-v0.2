/**
 * reset_escalations.mjs — 既存 chat_sessions の escalated フラグをリセット
 *
 * 背景: resolved 過剰 false のバグ期に付いた escalated=true が古いセッションに残存。
 *       ロジック修正は今後の会話に効くため、既存分は本スクリプトで false に戻す。
 *       （履歴は消さない。バッジ/エスカレーション数だけをクリア）
 *
 * 🚨 書き込むのは chat DB の chat_sessions.escalated だけ。
 * 使い方（functions ディレクトリで）:
 *   下見:  node scripts/reset_escalations.mjs
 *   実行:  node scripts/reset_escalations.mjs --write
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "yah-mobile-v1-3ed24";
const WRITE = process.argv.includes("--write");

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const chat = getFirestore(app, "chat");

async function main() {
  console.log(`\n=== escalated リセット [${WRITE ? "本番書き込み" : "DRY RUN"}] ===\n`);

  const snap = await chat
    .collection("chat_sessions")
    .where("escalated", "==", true)
    .get();

  console.log(`escalated=true のセッション: ${snap.size} 件`);

  if (snap.empty) {
    console.log("対象なし。処理を終了します。");
    process.exit(0);
  }

  if (!WRITE) {
    for (const d of snap.docs) {
      console.log(`  - ${d.id}  (status: ${d.data().status ?? "?"})`);
    }
    console.log("\n--write で escalated を false に戻します（履歴は保持）。");
    process.exit(0);
  }

  // バッチ（500上限）で分割更新
  let updated = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = chat.batch();
    for (const d of docs.slice(i, i + 450)) {
      batch.update(d.ref, { escalated: false });
      updated++;
    }
    await batch.commit();
  }
  console.log(`✅ ${updated} 件の escalated を false に戻しました。`);
  process.exit(0);
}

main().catch((e) => {
  console.error("reset エラー:", e);
  process.exit(1);
});
