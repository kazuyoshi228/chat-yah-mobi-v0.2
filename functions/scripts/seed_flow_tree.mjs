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
 *   下見:  node scripts/seed_flow_tree.mjs
 *   投入:  node scripts/seed_flow_tree.mjs --write
 *
 * doc ID 固定（root / b_purchase / b_esim / b_other）→ 再実行は上書き（重複しない）。
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "yah-mobile-v1-3ed24";
const WRITE = process.argv.includes("--write");

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
    options: JSON.stringify(["b_purchase", "b_esim", "b_other"]),
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
  console.log(`既存ノード: ${existing.size} 件\n`);

  if (!WRITE) {
    for (const n of NODES) {
      const label = JSON.parse(n.label);
      console.log(
        `  [${n.type}] ${n.id}  p:${n.parentId ?? "(root)"}  ai:${n.aiTrigger}  order:${n.sortOrder}  "${label.ja}"`
      );
    }
    console.log("\n--write で書き込みます。");
    process.exit(0);
  }

  const batch = chat.batch();
  for (const n of NODES) {
    const { id, ...data } = n;
    batch.set(
      chat.collection(COL).doc(id),
      { ...data, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
  await batch.commit();
  console.log(`✅ ${NODES.length} ノードを投入しました（root + 3分岐）。`);
  process.exit(0);
}

main().catch((e) => {
  console.error("seed エラー:", e);
  process.exit(1);
});
