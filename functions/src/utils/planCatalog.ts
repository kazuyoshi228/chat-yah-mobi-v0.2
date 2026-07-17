/**
 * planCatalog — 料金プランの正本（SSOT）を (default)/plans からリアルタイム取得
 *
 * 背景: RAGに手書きした料金表が実データと乖離し、存在しないプラン（無制限）や
 *       誤価格を案内する事故が起きた。以後、価格・プラン構成は本カタログのみを
 *       正とし、AIコンテキストに毎回注入する（静的な料金RAGは廃止）。
 *
 * - 🚨 (default) は read-only（既存方針どおり）
 * - モジュール内キャッシュ（TTL 5分）で Firestore 読取を実質ゼロコスト化
 *   （/admin/plans での変更は最大5分で chat にも反映される）
 */
import { defaultDb } from "../db";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { text: string; at: number } | null = null;

interface PlanDoc {
  name?: string;
  dataGb?: number | string;
  validityDays?: number;
  /** plans の価格フィールドは priceJpy（orders の amountJpy とは別名なので注意） */
  priceJpy?: number;
  planType?: string;
  sortOrder?: number;
}

function fmt(p: PlanDoc): string {
  const price =
    typeof p.priceJpy === "number" ? `¥${p.priceJpy.toLocaleString("en-US")}` : "?";
  return `- ${p.name ?? "unknown"}: ${p.dataGb ?? "?"}GB / ${p.validityDays ?? "?"} days / ${price}`;
}

export async function getPlanCatalog(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.text;
  try {
    const snap = await defaultDb
      .collection("plans")
      .where("isActive", "==", true)
      .get();
    const plans = snap.docs.map((d) => d.data() as PlanDoc);
    // 並びは管理画面（/admin/plans）の sortOrder 準拠（無ければ価格順）
    const byOrder = (a: PlanDoc, b: PlanDoc) =>
      (a.sortOrder ?? a.priceJpy ?? 0) - (b.sortOrder ?? b.priceJpy ?? 0);
    const initial = plans.filter((p) => p.planType === "initial").sort(byOrder);
    const topup = plans.filter((p) => p.planType === "topup").sort(byOrder);

    const lines: string[] = [
      "[Live from the official plan catalog (single source of truth). Prices in JPY.]",
      "New purchase plans (Japan only):",
      ...initial.map(fmt),
      "Top-up plans (additional data for an existing yah.mobile eSIM):",
      ...topup.map(fmt),
    ];
    const text = lines.join("\n");
    cache = { text, at: Date.now() };
    return text;
  } catch (e) {
    console.error("planCatalog 取得エラー:", e);
    // 取得失敗時: 古いキャッシュがあればそれを、無ければ空（プロンプト側で「価格は案内しない」挙動になる）
    return cache?.text ?? "";
  }
}
