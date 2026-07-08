/**
 * customerContext — 顧客コンテキストの構築（販売 (default) DB を read-only 参照）
 *
 * - 本人特定: visitorId = Firebase Auth uid（匿名 uid は何もヒットせず自動的に RAG のみ）
 * - 参照: users/{uid} / orders(userId==uid) / esim_links(userId==uid)
 * - 🚨 機微情報（決済ID・メール等）は AI コンテキストに載せない
 * - (default) に複合インデックスを要求しないよう orderBy は使わず、メモリ内でソート
 * - フィールド実キーは yah.mobi 実データで確認済み（orders.userId/planName/status、
 *   esim_links.userId/iccid/status/planName/dataRemainingMb/dataTotalMb/expiryDate、users.name）
 * - ラベルは言語中立（英語）。値が日本語でも回答言語は訪問者言語に固定（システムプロンプト参照）
 */
import * as admin from "firebase-admin";
import { defaultDb } from "../db";

/** ms(number) / 秒(number) / Timestamp を安全に ms へ */
function toMs(v: unknown): number | null {
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (v instanceof admin.firestore.Timestamp) return v.toMillis();
  return null;
}

/** number(ms) / Firestore Timestamp のどちらでも ms を返す（ソート用・不明は0） */
function toMillis(v: unknown): number {
  return toMs(v) ?? 0;
}

/** MB(number) → GB表示（十進・キャリア標準 1GB=1000MB） */
function toGb(mb: unknown): string | null {
  return typeof mb === "number" ? `${(mb / 1000).toFixed(1)}GB` : null;
}

export async function buildCustomerContext(
  visitorId: string
): Promise<{ text: string; customerName: string }> {
  const parts: string[] = [];

  // 顧客プロファイル（(default)/users/{uid}）
  const userSnap = await defaultDb.doc(`users/${visitorId}`).get();
  const uname = userSnap.exists
    ? ((userSnap.data()?.name as string) ||
        (userSnap.data()?.displayName as string) ||
        "")
    : "";
  if (uname) {
    parts.push(`Customer name: ${uname}`);
  } else {
    // 名前不明（匿名等）: AI が『匿名ユーザー様』等と呼ばないよう明示
    parts.push(
      "Customer name: unknown (address them politely as 'customer' in the visitor's language)"
    );
  }

  // 購入状況（(default)/orders where userId == uid）
  const ordersSnap = await defaultDb
    .collection("orders")
    .where("userId", "==", visitorId)
    .limit(10)
    .get();

  if (!ordersSnap.empty) {
    const orders = ordersSnap.docs
      .map((doc) => doc.data())
      .filter((d) => d.hiddenByUser !== true) // ユーザーが非表示にした注文は参照しない
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 5)
      .map((d) => {
        const plan = d.planName || d.planId || "unknown plan";
        return `- ${plan} (${d.status || "unknown"})`;
      });
    if (orders.length > 0) {
      parts.push(`\nPurchase history:\n${orders.join("\n")}`);
    }
  }

  // eSIM状態（(default)/esim_links where userId == uid）
  const esimSnap = await defaultDb
    .collection("esim_links")
    .where("userId", "==", visitorId)
    .limit(5)
    .get();

  if (!esimSnap.empty) {
    const statuses = esimSnap.docs.map((doc) => {
      const d = doc.data();
      // ICCID は機微なため下4桁のみ（本人確認の言及用・全桁は載せない）
      const iccid = d.iccid ? `****${String(d.iccid).slice(-4)}` : "unknown";
      const bits: string[] = [`ICCID ${iccid}`, `status: ${d.status || "unknown"}`];
      if (d.planName) bits.push(`plan: ${d.planName}`);
      const remain = toGb(d.dataRemainingMb);
      const total = toGb(d.dataTotalMb);
      if (remain) bits.push(`data remaining: ~${remain}${total ? ` / ${total}` : ""}`);
      const ms = toMs(d.expiryDate);
      if (ms) {
        const y = new Date(ms).getUTCFullYear();
        // 妥当な範囲の日付のみ（誤フォーマットを載せない）
        if (y >= 2024 && y <= 2032) {
          bits.push(`expires: ${new Date(ms).toISOString().slice(0, 10)}`);
        }
      }
      return `- ${bits.join(" / ")}`;
    });
    parts.push(`\neSIM status:\n${statuses.join("\n")}`);
  }

  return { text: parts.join("\n"), customerName: uname };
}
