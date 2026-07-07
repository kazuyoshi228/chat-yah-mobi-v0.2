/**
 * inspect_default_schema.mjs — 販売 (default) DB のフィールド名を read-only で確認
 *
 * 目的: buildCustomerContext（AIの個別参照）が前提にしている
 *   orders/esim_links の userId / planName / status / iccid、users の displayName/name
 *   が、yah.mobi 実データの実キーと一致しているかを確認する。
 *
 * 🚨 完全に read-only（get のみ）。書き込みは一切しない。
 * 🚨 PII 保護のため「値」は出さず、フィールドの「キー名＋型」だけを表示する。
 *
 * 使い方（functions ディレクトリで）:
 *   node scripts/inspect_default_schema.mjs
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yah-mobile-v1-3ed24",
});
const db = getFirestore(app); // ← (default) 販売DB（read-only）

function keysWithTypes(data) {
  return Object.entries(data)
    .map(([k, v]) => {
      const t =
        v === null
          ? "null"
          : v && v.constructor && v.constructor.name
            ? v.constructor.name
            : typeof v;
      return `${k}:${t}`;
    })
    .join(", ");
}

async function dump(col, limit = 3) {
  console.log(`\n===== ${col}（最大${limit}件・キー名と型のみ） =====`);
  try {
    const snap = await db.collection(col).limit(limit).get();
    if (snap.empty) {
      console.log("  (0件 or 権限なし)");
      return;
    }
    snap.docs.forEach((d, i) => {
      console.log(`  [${i}] { ${keysWithTypes(d.data())} }`);
    });
  } catch (e) {
    console.log(`  読取エラー: ${e.message}`);
  }
}

async function main() {
  console.log("=== (default) DB スキーマ確認 [READ-ONLY / 値は非表示] ===");
  await dump("orders");
  await dump("esim_links");
  await dump("users");
  console.log(
    "\n※ buildCustomerContext の前提: orders/esim_links に userId、orders に planName/status、" +
      "esim_links に iccid/status、users に displayName または name。上の実キーと突き合わせます。"
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("inspect エラー:", e);
  process.exit(1);
});
