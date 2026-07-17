/**
 * fix_rag_audit.mjs — RAG全数監査（2026-07-17）で見つかった事実不整合の一括修正
 *
 * A. 他国渡航先ガイドの無効化（6件）: 韓/中/英の 台湾・香港・タイ・ベトナム・韓国・欧州
 *    ガイド。yah.mobile は日本専用のため文書ごと事実違反（シンガポール事案と同種）。
 * B. 静的料金文書の無効化（6言語）: 実データ(plans)と全価格が不一致＋存在しない
 *    「無制限プラン」を記載。以後、料金は utils/planCatalog が (default)/plans から
 *    リアルタイム注入する（SSOT一本化）。
 * C. QR再発行/交換eSIM表現の修正（6件）: 「サポートに再発行依頼」→「マイページで再表示」、
 *    「代替eSIM発行」の確約を削除（非履行方針・実仕様に整合）。
 *
 * 使い方（functions ディレクトリで）:
 *   下見:  node scripts/fix_rag_audit.mjs
 *   実行:  node scripts/fix_rag_audit.mjs --write
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yah-mobile-v1-3ed24",
});
const db = getFirestore(app, "chat");

// ── A: 他国渡航先ガイド（日本専用と矛盾＝無効化） ──
const DEACTIVATE_DESTINATION = [
  { idPrefix: "5hotqdAt", label: "목적지 가이드 - 대만/홍콩/태국 (KO)" },
  { idPrefix: "76ML5Zvd", label: "Destination Guide - Europe (EN)" },
  { idPrefix: "GZ5uPBa2", label: "目的地指南 - 泰越欧 (ZH)" },
  { idPrefix: "Gd6s8os3", label: "목적지 가이드 - 베트남/유럽 (KO)" },
  { idPrefix: "M90qTYrg", label: "Destination Guide - Taiwan & HK (EN)" },
  { idPrefix: "YFwRWb9U", label: "目的地指南 - 韩台港 (ZH)" },
];

// ── B: 静的料金文書（実データと不一致＝無効化。以後はライブ注入が正本） ──
const DEACTIVATE_PRICING = [
  { idPrefix: "ndjHSpmH", label: "料金プラン詳細 (JA)" },
  { idPrefix: "XWsAuwPa", label: "Pricing Plans (EN)" },
  { idPrefix: "AOW5XiAd", label: "资费方案详情 (ZH)" },
  { idPrefix: "HgDCRO2E", label: "요금제 상세 (KO)" },
  { idPrefix: "WMxrovx8", label: "แผนราคา (TH)" },
  { idPrefix: "tOiRM20g", label: "Gói cước (VI)" },
];

// ── C: QR再発行/交換eSIM表現の修正（文字列置換） ──
const REWRITES = [
  {
    idPrefix: "KDfZZ5Qz",
    label: "eSIM 설치 가이드 (KO)",
    from: "고객지원에 QR 코드 재발급 요청",
    to: "마이페이지(My Page)에 로그인하여 QR 코드를 다시 표시하고 재스캔",
  },
  {
    idPrefix: "VYWOYfgn",
    label: "eSIM 安装指南 (ZH)",
    from: "联系客服重新发送 QR 码",
    to: "登录“我的页面”(My Page) 重新显示二维码并再次扫描",
  },
  {
    idPrefix: "uSwncS2y",
    label: "Installation Guide (EN)",
    from: "contact support for QR code reissue",
    to: "log in to My Page to re-display your QR code and scan it again",
  },
  {
    idPrefix: "mic17TMp",
    label: "返金ポリシー (JA)",
    from: "- QRコードの再発行\n- 接続トラブルシューティング\n- 代替eSIMの発行",
    to: "- マイページからのQRコード再表示（再スキャン）\n- 接続トラブルシューティング",
  },
  {
    idPrefix: "IvZQWY2p",
    label: "Refund Policy (EN)",
    from: "- QR code reissuance\n- Step-by-step troubleshooting\n- Replacement eSIM if needed",
    to: "- Re-displaying your QR code from My Page (rescan)\n- Step-by-step troubleshooting",
  },
  {
    idPrefix: "IvZQWY2p",
    label: "Refund Policy (EN) - staff表現",
    from: "(staff follow up on complex cases)",
    to: "(complex cases are handled by our operations team via the contact form)",
  },
  {
    idPrefix: "warzEW1Y",
    label: "退款政策 (ZH)",
    from: "- QR码重新发行\n- 逐步故障排除\n- 必要时更换eSIM",
    to: "- 在“我的页面”重新显示二维码（重新扫描）\n- 逐步故障排除",
  },
];

async function main() {
  console.log(`\n=== RAG監査修正 [${WRITE ? "本番書き込み" : "DRY RUN"}] ===\n`);
  const snap = await db.collection("chat_rag_documents").get();
  const findByPrefix = (p) => snap.docs.find((d) => d.id.startsWith(p));

  console.log("── A+B: 無効化 ──");
  for (const x of [...DEACTIVATE_DESTINATION, ...DEACTIVATE_PRICING]) {
    const doc = findByPrefix(x.idPrefix);
    if (!doc) { console.log(`⚠ 見つからない: ${x.idPrefix} (${x.label})`); continue; }
    const already = doc.data().isActive === false;
    console.log(`${already ? "（既に無効）" : "無効化"}: ${doc.id.slice(0, 8)} | ${x.label}`);
    if (WRITE && !already) {
      await doc.ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() });
    }
  }

  console.log("\n── C: 表現修正 ──");
  for (const r of REWRITES) {
    const doc = findByPrefix(r.idPrefix);
    if (!doc) { console.log(`⚠ 見つからない: ${r.idPrefix} (${r.label})`); continue; }
    const content = doc.data().content || "";
    if (!content.includes(r.from)) {
      console.log(`⚠ パターン不一致（スキップ）: ${r.label}`);
      continue;
    }
    console.log(`置換: ${doc.id.slice(0, 8)} | ${r.label}`);
    console.log(`  - ${r.from.replace(/\n/g, " / ").slice(0, 70)}`);
    console.log(`  + ${r.to.replace(/\n/g, " / ").slice(0, 70)}`);
    if (WRITE) {
      await doc.ref.update({
        content: content.replace(r.from, r.to),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(WRITE ? "\n✅ 完了（置換した文書は自動で再Embeddingされます）" : "\n--write で実行します。");
  process.exit(0);
}

main().catch((e) => { console.error("fix エラー:", e); process.exit(1); });
