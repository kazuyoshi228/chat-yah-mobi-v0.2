/**
 * fix_rag_japan_only.mjs — RAGの「グローバル提供」誤記述を日本専用に修正
 *
 * 背景: 英語版・中国語版の Service Overview が旧グローバル版（「100+カ国で提供」）の
 *       ままで、AIが他国向けプランを創作する実バグの根本原因だった（タイ語/ベトナム語版は
 *       正しく「日本専用」と記載済み）。渡航先ガイド（韓国/タイ・ベトナム）は文書ごと
 *       事実違反のため無効化する。
 *
 * 処理:
 *   1. 書き換え: Service Overview 英語版・中国語版 → 日本専用の正しい内容
 *      （content 変更で onRagDocumentWritten が自動再Embedding）
 *   2. 無効化: Destination Connection Guide (South Korea / Thailand & Vietnam)
 *      → isActive:false（searchRAG から即除外）
 *
 * 使い方（functions ディレクトリで）:
 *   下見:  node scripts/fix_rag_japan_only.mjs
 *   実行:  node scripts/fix_rag_japan_only.mjs --write
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yah-mobile-v1-3ed24",
});
const db = getFirestore(app, "chat");

const EN_OVERVIEW = `# What is yah.mobile? - Service Overview (English)

## Keywords: yah.mobile, eSIM, Japan, service, travelers, price, plans

## What is yah.mobile?

yah.mobile is a data eSIM service exclusively for Japan, designed for international travelers visiting Japan. Get fast, reliable mobile data across Japan from the moment you land — no physical SIM card, no expensive roaming charges.

Key features:
- Japan specialist: we focus 100% on connectivity in Japan. We do not offer plans for any other country or region.
- Instant activation: no physical SIM needed. Scan the QR code and connect within minutes.
- No contract: pay as you go. No monthly fees, no commitments.
- Nationwide coverage in Japan: major cities, shinkansen routes, and tourist areas.
- Simple setup: Scan QR → install eSIM → connect. That's it.
- 24/7 AI chat support in 6 languages (English / Japanese / Chinese / Korean / Thai / Vietnamese).

Note: If a customer asks about eSIMs for destinations other than Japan (e.g., Singapore, Thailand, Korea), politely clarify that yah.mobile offers Japan-only eSIMs and does not sell plans for other countries.`;

const ZH_OVERVIEW = `# 什么是yah.mobile？- 服务概述（中文）

## 关键词：yah.mobile、eSIM、日本、服务、旅行者、价格、套餐

## 什么是yah.mobile？

yah.mobile是专为访日旅行者设计的日本专用数据eSIM服务。落地日本即可使用快速、可靠的移动数据——无需实体SIM卡，也无需支付昂贵的漫游费。

主要特点：
- 日本专属：我们100%专注于日本境内的网络连接，不提供任何其他国家或地区的套餐。
- 即时激活：无需实体SIM卡。扫描二维码，几分钟内即可连接。
- 无合约：按需付费。无月费，无承诺。
- 覆盖日本全国：主要城市、新干线沿线及旅游景区。
- 设置简单：扫描二维码 → 安装eSIM → 连接，就这么简单。
- 24/7 AI在线聊天支持，提供6种语言（英语/日语/中文/韩语/泰语/越南语）。

注意：如果客户询问日本以外目的地（如新加坡、泰国、韩国）的eSIM，请礼貌说明yah.mobile仅提供日本专用eSIM，不销售其他国家的套餐。`;

// 対象（IDプレフィックスで特定）
const REWRITES = [
  { idPrefix: "DWKYwhHM", label: "Service Overview (English)", content: EN_OVERVIEW },
  { idPrefix: "6eBSjJMs", label: "服务概述（中文）", content: ZH_OVERVIEW },
];
const DEACTIVATE = [
  { idPrefix: "ig53Eurg", label: "Destination Guide - South Korea" },
  { idPrefix: "zr9zTfPn", label: "Destination Guide - Thailand & Vietnam" },
];

async function main() {
  console.log(`\n=== RAG 日本専用修正 [${WRITE ? "本番書き込み" : "DRY RUN"}] ===\n`);
  const snap = await db.collection("chat_rag_documents").get();
  const findByPrefix = (p) => snap.docs.find((d) => d.id.startsWith(p));

  for (const r of REWRITES) {
    const doc = findByPrefix(r.idPrefix);
    if (!doc) { console.log(`⚠ 見つからない: ${r.idPrefix} (${r.label})`); continue; }
    console.log(`書き換え: ${doc.id} | ${doc.data().title}`);
    console.log(`  旧: ${(doc.data().content || "").slice(0, 80).replace(/\n/g, " ")}...`);
    console.log(`  新: ${r.content.slice(0, 80).replace(/\n/g, " ")}...`);
    if (WRITE) {
      await doc.ref.update({
        content: r.content,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  for (const x of DEACTIVATE) {
    const doc = findByPrefix(x.idPrefix);
    if (!doc) { console.log(`⚠ 見つからない: ${x.idPrefix} (${x.label})`); continue; }
    console.log(`無効化: ${doc.id} | ${doc.data().title}`);
    if (WRITE) {
      await doc.ref.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(WRITE ? "\n✅ 完了（書き換えは自動で再Embeddingされます）" : "\n--write で実行します。");
  process.exit(0);
}

main().catch((e) => { console.error("fix エラー:", e); process.exit(1); });
