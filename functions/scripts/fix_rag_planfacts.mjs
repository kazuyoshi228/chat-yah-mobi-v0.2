/**
 * fix_rag_planfacts.mjs — プラン特徴の事実修正（ユーザー確定事実 2026-07-17）
 *
 * 確定事実:
 *   1. テザリング/ホットスポット共有は【不可】（FAQが「全プラン可」と誤記→反転）
 *   2. データ専用（通話/SMS不可・元のSIMは通話に使える）＝既存記述どおり
 *   3. 有効期間の起算＝【eSIMをアクティベートした日時】から（「初回接続/初回データ利用」表現を正確化）
 *
 * 処理:
 *   A. FAQ(EN/ZH/KO)のテザリングQ&Aを「不可」に修正
 *   B. 起算表現を「アクティベート時点から」に統一（FAQ/チェックリスト/タイミングガイド）
 *   C. 検証済み「プラン特徴」文書を6言語で upsert（固定ID・価格は書かない＝ライブカタログが正本）
 *
 * 使い方（functions ディレクトリで）:
 *   下見:  node scripts/fix_rag_planfacts.mjs
 *   実行:  node scripts/fix_rag_planfacts.mjs --write
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "yah-mobile-v1-3ed24",
});
const db = getFirestore(app, "chat");
const COL = "chat_rag_documents";

// ── A+B: 文字列置換 ──
const REWRITES = [
  // A. テザリング: 可 → 不可
  {
    idPrefix: "i2ZWU3CU", label: "FAQ EN Q3 テザリング",
    from: "A: Yes, hotspot/tethering is supported on all plans. Go to Settings → Personal Hotspot and turn it on.",
    to: "A: No, hotspot/tethering is not supported on yah.mobile plans. Please use the data directly on the device where the eSIM is installed.",
  },
  {
    idPrefix: "TUSlZEtB", label: "FAQ ZH Q3 テザリング",
    from: "A: 可以，所有套餐都支持热点共享。前往 设置 → 个人热点 开启即可。",
    to: "A: 不可以。yah.mobile 的套餐不支持热点/网络共享，请在安装 eSIM 的设备上直接使用数据。",
  },
  {
    idPrefix: "AYB2qeK6", label: "FAQ KO Q3 テザリング",
    from: "A: 네, 모든 요금제에서 핫스팟 지원됩니다. 설정 → 개인용 핫스팟에서 켜면 됩니다.",
    to: "A: 아니요, yah.mobile 요금제는 핫스팟/테더링을 지원하지 않습니다. eSIM을 설치한 기기에서 직접 데이터를 이용해 주세요.",
  },
  // B. 起算: 初回接続 → アクティベート時点
  {
    idPrefix: "i2ZWU3CU", label: "FAQ EN Q2 起算",
    from: "Your plan starts when you FIRST CONNECT to a mobile network at your destination (not from purchase date).",
    to: "Your plan validity starts from the moment you ACTIVATE the eSIM (turn the line on) — not from the purchase date.",
  },
  {
    idPrefix: "TUSlZEtB", label: "FAQ ZH Q2 起算",
    from: "套餐从您在目的地首次连接移动网络时开始计算（非购买日期）。",
    to: "套餐有效期从您激活eSIM（启用该线路）的那一刻开始计算（非购买日期）。",
  },
  {
    idPrefix: "AYB2qeK6", label: "FAQ KO Q2 起算",
    from: "목적지에서 모바일 네트워크에 처음 연결할 때부터 시작됩니다 (구매일이 아님).",
    to: "eSIM을 활성화(회선을 켠) 시점부터 시작됩니다 (구매일이 아님).",
  },
  {
    idPrefix: "5LZm07UW", label: "チェックリストZH 起算1",
    from: "□ 暂时不要启用（套餐从首次连接开始计算）",
    to: "□ 暂时不要启用（套餐有效期从激活eSIM时开始计算）",
  },
  {
    idPrefix: "5LZm07UW", label: "チェックリストZH 起算2",
    from: "- 套餐有效期从首次连接开始，非安装日期",
    to: "- 套餐有效期从激活eSIM时开始，非安装日期",
  },
  {
    idPrefix: "SplJ8qZ9", label: "チェックリストEN 起算",
    from: "□ DO NOT enable it yet (plan starts on first connection)",
    to: "□ DO NOT enable it yet (plan validity starts when the eSIM is activated)",
  },
  {
    idPrefix: "wIh4szZP", label: "タイミングガイドZH 起算",
    from: "重要：套餐有效期从您首次使用eSIM连接移动网络的那一刻开始计算。",
    to: "重要：套餐有效期从您激活eSIM（启用该线路）的那一刻开始计算。",
  },
  // ── 第2弾（広域再スキャン 2026-07-17 で追加検出）──
  {
    idPrefix: "04h5rUKp", label: "FAQ TH Q4 起算",
    from: "เริ่มต้นเมื่อคุณ **ใช้ข้อมูลครั้งแรก** ไม่ใช่เมื่อติดตั้ง eSIM",
    to: "เริ่มต้นเมื่อคุณ **เปิดใช้งาน (activate) eSIM** ไม่ใช่วันซื้อหรือวันติดตั้ง",
  },
  {
    idPrefix: "qVGI26z9", label: "購入ガイドTH 起算",
    from: "**เมื่อคุณใช้ข้อมูลครั้งแรก** ไม่ใช่เมื่อติดตั้ง",
    to: "**เมื่อคุณเปิดใช้งาน (activate) eSIM** ไม่ใช่วันซื้อหรือวันติดตั้ง",
  },
  {
    idPrefix: "AizYuGak", label: "FAQ VI Q4 起算",
    from: "Bắt đầu khi bạn **sử dụng dữ liệu lần đầu** — không phải khi cài đặt eSIM.",
    to: "Bắt đầu **từ thời điểm bạn kích hoạt eSIM (bật đường truyền)** — không phải ngày mua hay ngày cài đặt.",
  },
  {
    idPrefix: "0Alj7fzG", label: "購入ガイドVI 起算",
    from: "Gói cước bắt đầu **khi bạn sử dụng dữ liệu lần đầu** — không phải khi cài đặt eSIM.",
    to: "Gói cước bắt đầu **từ thời điểm bạn kích hoạt eSIM (bật đường truyền)** — không phải ngày mua hay ngày cài đặt.",
  },
  {
    idPrefix: "5EhugBhB", label: "チェックリストKO 起算1",
    from: "□ 아직 활성화하지 마세요 (요금제는 첫 연결부터 시작)",
    to: "□ 아직 활성화하지 마세요 (유효기간은 eSIM을 활성화한 시점부터 시작)",
  },
  {
    idPrefix: "5EhugBhB", label: "チェックリストKO 起算2",
    from: "- 요금제 유효기간은 첫 연결부터 시작, 설치일이 아님",
    to: "- 요금제 유효기간은 eSIM을 활성화한 시점부터 시작, 설치일이 아님",
  },
  {
    idPrefix: "wElzLSCR", label: "サービス紹介KO 起算",
    from: "- 요금제는 첫 연결 날짜부터 시작 (구매 날짜가 아님)",
    to: "- 요금제는 eSIM을 활성화한 시점부터 시작 (구매 날짜가 아님)",
  },
  {
    idPrefix: "zrI2cDwx", label: "タイミングガイドKO 起算",
    from: "eSIM으로 모바일 네트워크에 처음 연결하는 순간부터 시작됩니다",
    to: "eSIM을 활성화(회선을 켠) 순간부터 시작됩니다",
  },
  {
    idPrefix: "SplJ8qZ9", label: "チェックリストEN 起算2",
    from: "- Plan validity starts from FIRST connection, not installation",
    to: "- Plan validity starts when the eSIM is activated, not on installation",
  },
  {
    idPrefix: "pldVUthh", label: "タイミングガイドEN 起算",
    from: "IMPORTANT: Your plan validity period starts from the moment you FIRST CONNECT to a mobile network using the eSIM. Choose your activation timing carefully!",
    to: "IMPORTANT: Your plan validity period starts from the moment you ACTIVATE the eSIM (turn the line on). Choose your activation timing carefully!",
  },
];

// ── C: 検証済み「プラン特徴」文書（6言語・固定ID upsert・価格は書かない） ──
const FEATURES = [
  {
    id: "plan-features-verified-ja",
    title: "プラン共通の特徴（検証済み）- 日本語",
    content: `# yah.mobile プラン共通の特徴（検証済み）

- 対象地域: 日本国内のみ（他の国・地域では利用不可）
- データ専用: 音声通話・SMSは利用できません。お手持ちの元のSIMはそのまま通話・SMSに使えます（デュアルSIM運用）
- テザリング/ホットスポット共有: 利用できません。eSIMを入れた端末上で直接データをご利用ください
- 有効期間の起算: eSIMをアクティベート（回線を有効化）した日時から開始します。購入日やインストール日ではありません。出発前にインストールしておき、使い始めたいタイミングでアクティベートするのがおすすめです
- データを使い切った場合: トップアップ（追加データ）を購入できます
- 料金・プラン構成: 最新の正確な情報は【料金プラン】を参照（このチャットに常に最新が表示されます）`,
  },
  {
    id: "plan-features-verified-en",
    title: "Plan Features (Verified) - English",
    content: `# yah.mobile Plan Features (Verified)

- Coverage: Japan only (cannot be used in any other country or region)
- Data-only: no voice calls or SMS on this eSIM. Your original SIM keeps working for calls/SMS (dual-SIM setup)
- Hotspot/tethering: NOT supported. Please use the data directly on the device with the eSIM installed
- Validity start: your plan validity begins the moment you ACTIVATE the eSIM (turn the line on) — not the purchase or installation date. Install before departure, then activate when you want to start using it
- Ran out of data: you can purchase a top-up (additional data)
- Prices & plan lineup: always refer to the live plan catalog shown to this chat (kept up to date automatically)`,
  },
  {
    id: "plan-features-verified-zh",
    title: "套餐通用特点（已验证）- 中文",
    content: `# yah.mobile 套餐通用特点（已验证）

- 适用地区：仅限日本国内（其他国家/地区无法使用）
- 仅数据：不支持语音通话和短信。您原有的SIM卡可继续用于通话/短信（双卡并用）
- 热点/网络共享：不支持。请在安装eSIM的设备上直接使用数据
- 有效期起算：从您激活eSIM（启用该线路）的那一刻开始，而非购买日或安装日。建议出发前安装，想开始使用时再激活
- 数据用完：可购买追加数据（Top-up）
- 价格与套餐阵容：以本聊天中显示的实时套餐目录为准（自动保持最新）`,
  },
  {
    id: "plan-features-verified-ko",
    title: "요금제 공통 특징 (검증됨) - 한국어",
    content: `# yah.mobile 요금제 공통 특징 (검증됨)

- 이용 지역: 일본 국내 전용 (다른 국가/지역에서는 사용 불가)
- 데이터 전용: 음성 통화·SMS는 불가합니다. 기존 SIM은 통화/SMS에 그대로 사용 가능합니다 (듀얼 SIM)
- 핫스팟/테더링: 지원하지 않습니다. eSIM을 설치한 기기에서 직접 데이터를 이용해 주세요
- 유효기간 시작: eSIM을 활성화(회선을 켠) 시점부터 시작됩니다. 구매일·설치일이 아닙니다. 출발 전에 설치해 두고, 사용을 시작하고 싶을 때 활성화하세요
- 데이터 소진 시: 톱업(추가 데이터)을 구매할 수 있습니다
- 요금·요금제 구성: 이 채팅에 표시되는 실시간 요금제 목록을 참조하세요 (항상 최신 상태로 유지됩니다)`,
  },
  {
    id: "plan-features-verified-th",
    title: "คุณสมบัติแพ็กเกจ (ยืนยันแล้ว) - ภาษาไทย",
    content: `# คุณสมบัติแพ็กเกจ yah.mobile (ยืนยันแล้ว)

- พื้นที่ใช้งาน: เฉพาะในญี่ปุ่นเท่านั้น (ใช้ในประเทศ/ภูมิภาคอื่นไม่ได้)
- ข้อมูลเท่านั้น: ไม่รองรับการโทรและ SMS ซิมเดิมของคุณยังใช้โทร/ส่งข้อความได้ตามปกติ (ใช้แบบดูอัลซิม)
- ฮอตสปอต/แชร์อินเทอร์เน็ต: ไม่รองรับ กรุณาใช้ข้อมูลบนเครื่องที่ติดตั้ง eSIM โดยตรง
- การเริ่มนับอายุแพ็กเกจ: เริ่มนับตั้งแต่เวลาที่คุณเปิดใช้งาน (activate) eSIM ไม่ใช่วันซื้อหรือวันติดตั้ง แนะนำให้ติดตั้งก่อนออกเดินทาง แล้วค่อยเปิดใช้งานเมื่อต้องการเริ่มใช้
- ข้อมูลหมด: สามารถซื้อ Top-up (ข้อมูลเพิ่ม) ได้
- ราคาและแพ็กเกจ: อ้างอิงจากแคตตาล็อกแพ็กเกจแบบเรียลไทม์ที่แสดงในแชทนี้ (อัปเดตล่าสุดเสมอ)`,
  },
  {
    id: "plan-features-verified-vi",
    title: "Đặc điểm gói cước (Đã xác minh) - Tiếng Việt",
    content: `# Đặc điểm gói cước yah.mobile (Đã xác minh)

- Khu vực sử dụng: chỉ trong Nhật Bản (không dùng được ở quốc gia/khu vực khác)
- Chỉ dữ liệu: không hỗ trợ gọi thoại và SMS. SIM gốc của bạn vẫn dùng được để gọi/nhắn tin (chạy song song 2 SIM)
- Điểm phát sóng/chia sẻ mạng: KHÔNG hỗ trợ. Vui lòng dùng dữ liệu trực tiếp trên thiết bị đã cài eSIM
- Thời điểm bắt đầu hiệu lực: tính từ lúc bạn kích hoạt eSIM (bật đường truyền), không phải ngày mua hay ngày cài đặt. Nên cài trước khi khởi hành, và kích hoạt khi muốn bắt đầu sử dụng
- Hết dữ liệu: có thể mua Top-up (dữ liệu bổ sung)
- Giá và danh sách gói: tham khảo danh mục gói cước thời gian thực hiển thị trong chat này (luôn được cập nhật)`,
  },
];

async function main() {
  console.log(`\n=== プラン事実修正 [${WRITE ? "本番書き込み" : "DRY RUN"}] ===\n`);
  const snap = await db.collection(COL).get();
  const findByPrefix = (p) => snap.docs.find((d) => d.id.startsWith(p));

  console.log("── A+B: 置換 ──");
  // 🚨 同一文書に複数置換があるため、文書ごとにローカルで全置換を適用してから
  //    1回だけ書き込む（置換ごとに古いスナップショットから書くと互いに巻き戻る）。
  const pending = new Map(); // docId -> { ref, content, labels: [] }
  for (const r of REWRITES) {
    const doc = findByPrefix(r.idPrefix);
    if (!doc) { console.log(`⚠ 見つからない: ${r.idPrefix}`); continue; }
    const entry = pending.get(doc.id) ?? { ref: doc.ref, content: doc.data().content || "", labels: [] };
    if (!entry.content.includes(r.from)) { console.log(`⚠ パターン不一致（スキップ）: ${r.label}`); continue; }
    entry.content = entry.content.replace(r.from, r.to);
    entry.labels.push(r.label);
    pending.set(doc.id, entry);
    console.log(`置換: ${r.label}`);
  }
  if (WRITE) {
    for (const [id, e] of pending) {
      await e.ref.update({ content: e.content, updatedAt: FieldValue.serverTimestamp() });
      console.log(`書込: ${id.slice(0, 8)} (${e.labels.length}置換)`);
    }
  }

  console.log("\n── C: プラン特徴文書 upsert（6言語） ──");
  for (const f of FEATURES) {
    console.log(`upsert: ${f.id} | ${f.title}`);
    if (WRITE) {
      await db.collection(COL).doc(f.id).set(
        {
          title: f.title,
          content: f.content,
          category: "plans",
          isActive: true,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  console.log(WRITE ? "\n✅ 完了（変更文書は自動で再Embeddingされます）" : "\n--write で実行します。");
  process.exit(0);
}

main().catch((e) => { console.error("fix エラー:", e); process.exit(1); });
