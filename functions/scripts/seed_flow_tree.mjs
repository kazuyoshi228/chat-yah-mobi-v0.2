/**
 * seed_flow_tree.mjs — 冒頭3分岐デシジョンツリーを chat_flow_nodes に投入
 *
 * 方針: 入口で3分岐だけツリー化 → その先はAIに寄せる（非履行）。
 *  - root（question）の options に3分岐のIDを列挙（widget はこの options で遷移）
 *  - 3分岐は redirect_ai（aiTrigger:1）。content = 選んだ意図（6言語）→ session.initialMessage 経由でAI文脈へ
 *  - parentId と options の両方を設定（管理画面の階層表示＋widget遷移を両立）
 *
 * 🚨 書き込むのは chat DB の chat_flow_nodes だけ。
 * 使い方（functions ディレクトリで）:
 *   下見:            node scripts/seed_flow_tree.mjs
 *   投入:            node scripts/seed_flow_tree.mjs --write
 *   投入＋旧掃除:     node scripts/seed_flow_tree.mjs --write --clean-legacy
 *
 * doc ID 固定（root / b_purchase / b_esim / b_other）→ 再実行は上書き（重複しない）。
 * --clean-legacy: root 直下で本seed以外の子ノード（旧ブランチ）を削除する。
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "yah-mobile-v1-3ed24";
const WRITE = process.argv.includes("--write");
const CLEAN_LEGACY = process.argv.includes("--clean-legacy");

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const chat = getFirestore(app, "chat");
const COL = "chat_flow_nodes";

/** 6言語 i18n を JSON 文字列で（widget/admin が JSON.parse する） */
const i18n = (ja, en, zh, ko, th, vi) => JSON.stringify({ ja, en, zh, ko, th, vi });

const NODES = [
  {
    id: "root",
    parentId: null,
    type: "question",
    label: i18n(
      "ご用件をお選びください",
      "How can we help you today?",
      "请选择您需要的帮助",
      "무엇을 도와드릴까요?",
      "เราช่วยอะไรคุณได้บ้าง?",
      "Chúng tôi có thể giúp gì cho bạn?"
    ),
    content: null,
    options: JSON.stringify(["b_purchase", "b_esim", "b_refund", "b_other"]),
    icon: "message",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
    isActive: 1,
  },
  {
    id: "b_purchase",
    parentId: "root",
    type: "redirect_ai",
    label: i18n(
      "購入・プランについて",
      "Plans & Purchase",
      "购买与套餐",
      "구매·요금제",
      "แพ็กเกจและการซื้อ",
      "Mua & Gói cước"
    ),
    content: i18n(
      "購入・プランについて相談したい（対応国・データ量・期間・料金）",
      "I'd like help with plans and purchasing (countries, data, duration, price).",
      "我想咨询购买与套餐（支持国家、流量、时长、价格）。",
      "요금제·구매에 대해 문의하고 싶어요 (지원 국가, 데이터, 기간, 요금).",
      "ต้องการสอบถามเรื่องแพ็กเกจและการซื้อ (ประเทศที่รองรับ ปริมาณเน็ต ระยะเวลา ราคา)",
      "Tôi muốn được tư vấn về gói cước và mua hàng (quốc gia hỗ trợ, dung lượng, thời hạn, giá)."
    ),
    options: null,
    icon: "cart",
    formTrigger: 0,
    aiTrigger: 1,
    sortOrder: 10,
    isActive: 1,
  },
  {
    id: "b_esim",
    parentId: "root",
    type: "redirect_ai",
    label: i18n(
      "eSIM設定・トラブル",
      "eSIM Setup & Issues",
      "eSIM 设置与故障",
      "eSIM 설정·문제",
      "การตั้งค่า eSIM และปัญหา",
      "Cài đặt eSIM & Sự cố"
    ),
    content: i18n(
      "eSIMの設定や接続について相談したい（機種や状況を確認）",
      "I need help with eSIM setup or connection (device and situation).",
      "我想咨询 eSIM 设置或连接问题（机型与情况）。",
      "eSIM 설정이나 연결에 대해 문의하고 싶어요 (기기·상황 확인).",
      "ต้องการความช่วยเหลือเรื่องการตั้งค่าหรือการเชื่อมต่อ eSIM (รุ่นเครื่องและสถานการณ์)",
      "Tôi cần trợ giúp về cài đặt hoặc kết nối eSIM (thiết bị và tình huống)."
    ),
    options: null,
    icon: "smartphone",
    formTrigger: 0,
    aiTrigger: 1,
    sortOrder: 20,
    isActive: 1,
  },
  {
    id: "b_refund",
    parentId: "root",
    type: "redirect_ai",
    label: i18n(
      "返金・キャンセル",
      "Refund & Cancellation",
      "退款与取消",
      "환불·취소",
      "การคืนเงิน/ยกเลิก",
      "Hoàn tiền & Huỷ"
    ),
    content: i18n(
      "返金・キャンセルについて相談したい（ログインで対象のご注文を確認します）",
      "I'd like help with a refund or cancellation (sign in so we can check your order).",
      "我想咨询退款或取消（登录后可确认您的订单）。",
      "환불·취소에 대해 문의하고 싶어요 (로그인하면 대상 주문을 확인해 드립니다).",
      "ต้องการสอบถามเรื่องการคืนเงิน/ยกเลิก (เข้าสู่ระบบเพื่อตรวจสอบคำสั่งซื้อของคุณ)",
      "Tôi cần hỗ trợ hoàn tiền hoặc huỷ (đăng nhập để chúng tôi kiểm tra đơn hàng)."
    ),
    options: null,
    icon: "bot",
    formTrigger: 0,
    aiTrigger: 1,
    sortOrder: 25,
    isActive: 1,
  },
  {
    id: "b_other",
    parentId: "root",
    type: "redirect_ai",
    label: i18n(
      "その他・AIに相談",
      "Something else — Ask AI",
      "其他 · 咨询 AI",
      "기타 · AI에게 문의",
      "อื่น ๆ · สอบถาม AI",
      "Khác — Hỏi AI"
    ),
    content: i18n(
      "その他について相談したい",
      "I have another question.",
      "我有其他问题想咨询。",
      "기타 문의가 있어요.",
      "ฉันมีคำถามอื่น ๆ",
      "Tôi có câu hỏi khác."
    ),
    options: null,
    icon: "bot",
    formTrigger: 0,
    aiTrigger: 1,
    sortOrder: 30,
    isActive: 1,
  },
];

async function main() {
  console.log(`\n=== 3分岐デシジョンツリー seed [${WRITE ? "本番書き込み" : "DRY RUN"}] ===\n`);
  console.log(`投入予定: ${NODES.length} ノード（root + 3分岐）\n`);

  const existing = await chat.collection(COL).get();
  console.log(`既存ノード: ${existing.size} 件`);

  if (!WRITE) {
    // 既存ノードの中身（ID・親・ラベル）を表示 ＝ 上書き/追加の判断材料
    if (existing.size > 0) {
      console.log("\n── 既存ノード（現状） ──");
      const seedIds = new Set(NODES.map((n) => n.id));
      for (const d of existing.docs) {
        const x = d.data();
        let l = "";
        try { l = JSON.parse(x.label).ja ?? ""; } catch { l = String(x.label ?? ""); }
        const mark = seedIds.has(d.id) ? "◎上書き対象" : "△別ノード(残存)";
        console.log(`  ${mark}  ${d.id}  p:${x.parentId ?? "(root)"}  "${l}"`);
      }
    }
    console.log("\n── 投入予定（このseed） ──");
    for (const n of NODES) {
      const label = JSON.parse(n.label);
      console.log(
        `  [${n.type}] ${n.id}  p:${n.parentId ?? "(root)"}  ai:${n.aiTrigger}  order:${n.sortOrder}  "${label.ja}"`
      );
    }
    // 掃除候補（root直下・本seed以外）を明示
    const seedIds = new Set(NODES.map((n) => n.id));
    const legacy = existing.docs.filter(
      (d) => d.data().parentId === "root" && !seedIds.has(d.id)
    );
    if (legacy.length > 0) {
      console.log(
        `\n⚠ 旧ブランチ ${legacy.length} 件（${legacy.map((d) => d.id).join(", ")}）が残っています。` +
          `\n   → 掃除するには: node scripts/seed_flow_tree.mjs --write --clean-legacy`
      );
    }
    console.log("\n--write で書き込みます。");
    process.exit(0);
  }

  const seedIds = new Set(NODES.map((n) => n.id));
  const batch = chat.batch();
  for (const n of NODES) {
    const { id, ...data } = n;
    batch.set(
      chat.collection(COL).doc(id),
      { ...data, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  // 旧ブランチ掃除（root直下で本seed以外の子を削除）
  let legacyDeleted = 0;
  if (CLEAN_LEGACY) {
    for (const d of existing.docs) {
      if (d.data().parentId === "root" && !seedIds.has(d.id)) {
        batch.delete(d.ref);
        legacyDeleted++;
      }
    }
  }

  await batch.commit();
  console.log(
    `✅ ${NODES.length} ノードを投入${
      CLEAN_LEGACY ? `＋旧ブランチ ${legacyDeleted} 件を削除` : ""
    }しました（root + 3分岐）。`
  );
  if (!CLEAN_LEGACY) {
    const remaining = existing.docs.filter(
      (d) => d.data().parentId === "root" && !seedIds.has(d.id)
    ).length;
    if (remaining > 0) {
      console.log(
        `⚠ 旧ブランチ ${remaining} 件が残っています。掃除は --clean-legacy を併用してください。`
      );
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("seed エラー:", e);
  process.exit(1);
});
