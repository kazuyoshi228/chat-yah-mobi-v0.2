/**
 * migrate_to_chat_db.mjs — (default) → named DB「chat」への一回限りのデータ移行
 *
 * 対象（chat の設定/知識コレクションのみ・過去ログは移行しない）:
 *   chat_rag_documents（embedding ベクトルも保持）/ chat_flow_nodes /
 *   chat_quick_replies / hospitalityGuidelines
 *
 * 🚨 ガードレール:
 *   - 読むのは (default) の上記コレクションだけ（read-only）
 *   - 書くのは chat DB だけ。(default) には一切書き込まない
 *   - 販売系（orders / esim_links / users / plans 等）はコピーしない
 *
 * 使い方（functions ディレクトリで実行）:
 *   1) 認証（初回のみ）: gcloud auth application-default login
 *   2) 下見（dry-run・書き込みなし）: node scripts/migrate_to_chat_db.mjs
 *   3) 実行（本番書き込み）:           node scripts/migrate_to_chat_db.mjs --write
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "yah-mobile-v1-3ed24";
const CHAT_DATABASE_ID = "chat";

/** 移行対象（設定/知識のみ・過去ログは含めない）。{ src, dst } で改名にも対応 */
const COLLECTIONS = [
  { src: "chat_rag_documents", dst: "chat_rag_documents" },
  { src: "chat_flow_nodes", dst: "chat_flow_nodes" },
  { src: "chat_quick_replies", dst: "chat_quick_replies" },
  // (default) の hospitalityGuidelines → chat DB では chat_hospitality_guidelines に改名
  { src: "hospitalityGuidelines", dst: "chat_hospitality_guidelines" },
];

const WRITE = process.argv.includes("--write");

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});
const srcDb = getFirestore(app); // (default) — read only
const dstDb = getFirestore(app, CHAT_DATABASE_ID); // chat — write target

/** VectorValue を検出して FieldValue.vector に戻す（その他の値はそのまま） */
function convertVectors(data) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value &&
      typeof value === "object" &&
      typeof value.toArray === "function"
    ) {
      // Firestore VectorValue → 書き込み用に再ラップ
      if (typeof FieldValue.vector === "function") {
        out[key] = FieldValue.vector(value.toArray());
      } else {
        // 古い admin SDK で vector 未対応の場合はスキップ（trigger が後で再生成）
        console.warn(
          `  ⚠ ${key}: このSDKは FieldValue.vector 未対応のため embedding を省略（デプロイ後にトリガーが再生成）`
        );
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function copyCollection({ src, dst }) {
  const label = src === dst ? src : `${src} → ${dst}`;
  const snap = await srcDb.collection(src).get();
  if (snap.empty) {
    console.log(`- ${label}: 0 件（スキップ）`);
    return 0;
  }

  let count = 0;
  let batch = dstDb.batch();
  let inBatch = 0;

  for (const doc of snap.docs) {
    const data = convertVectors(doc.data());
    if (WRITE) {
      batch.set(dstDb.collection(dst).doc(doc.id), data);
      inBatch++;
      if (inBatch >= 400) {
        await batch.commit();
        batch = dstDb.batch();
        inBatch = 0;
      }
    }
    count++;
  }
  if (WRITE && inBatch > 0) await batch.commit();

  console.log(
    `- ${label}: ${count} 件${WRITE ? " → chat DB にコピー完了" : "（dry-run・書き込みなし）"}`
  );
  return count;
}

async function main() {
  console.log(
    `\n=== 移行: (default) → ${CHAT_DATABASE_ID} DB  [${WRITE ? "本番書き込み" : "DRY RUN（--write 未指定）"}] ===`
  );
  console.log(`プロジェクト: ${PROJECT_ID}\n`);

  let total = 0;
  for (const c of COLLECTIONS) {
    total += await copyCollection(c);
  }

  console.log(
    `\n合計 ${total} ドキュメント${WRITE ? " を chat DB にコピーしました。" : "（dry-run）。--write を付けて再実行すると書き込みます。"}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("移行エラー:", err);
  process.exit(1);
});
