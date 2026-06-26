#!/usr/bin/env node
/**
 * 法的根拠付きRAGドキュメントを追加投入するスクリプト
 * 返金不可ポリシーの解決率向上のため、特定商取引法・消費者契約法の根拠を詳述
 */

import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!DB_URL || !OPENAI_API_KEY) { console.error("Missing env"); process.exit(1); }
const pool = createPool(DB_URL);

async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.substring(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

const LEGAL_RAG_DOCS = [
  // ===== 特定商取引法 =====
  {
    title: "返金不可の法的根拠 — 特定商取引法第15条の3（日本語）",
    content: `Q: 返金できないのはなぜですか？法的根拠はありますか？
A: はい、明確な法的根拠があります。

【特定商取引法 第15条の3（返品特約）】
通信販売（インターネット購入を含む）において、事業者が購入前に「返品不可」の特約を広告および最終確認画面に明示した場合、その特約が優先されます。yah.mobileは購入確認画面でこの特約を明示し、お客様にチェックボックスで同意いただいています。

【クーリング・オフは適用されません】
クーリング・オフ制度（特定商取引法第26条）は、訪問販売・電話勧誘販売にのみ適用されます。インターネット通販（通信販売）には適用されません。

【eSIMはQRコード発行時点で「引渡し完了」】
eSIMはデジタル商品（電磁的記録）であり、QRコードをメールでお送りした時点で商品の引渡しが完了します。インストール・使用の有無は関係ありません。

【消費者契約法との関係】
本ポリシーは購入前に明示・同意取得済みのため、消費者契約法上の「不当条項」には該当しません。`,
  },
  {
    title: "No-Refund Legal Basis — Act on Specified Commercial Transactions Article 15-3 (English)",
    content: `Q: Why can't I get a refund? What is the legal basis?
A: There is a clear legal basis under Japanese law.

【Act on Specified Commercial Transactions (特定商取引法), Article 15-3】
For mail-order/online sales, if the seller clearly displays a no-return/no-cancellation policy in the advertisement AND on the purchase confirmation screen, that policy takes legal precedence over the default 8-day return right. yah.mobile displays this policy at checkout, and customers actively check a consent checkbox before completing payment.

【Cooling-off rights do NOT apply】
Cooling-off rights under the Act on Specified Commercial Transactions apply ONLY to door-to-door sales and telephone solicitation sales. Online purchases (mail-order sales / 通信販売) are explicitly excluded from cooling-off provisions (Article 26).

【eSIM is legally "delivered" when QR code is issued】
eSIM is an intangible digital product (electromagnetic record / 電磁的記録). Under Japanese law, delivery of a digital product is complete when the product information (QR code / activation code) is transmitted to the customer — regardless of whether the customer has installed or activated it.

【Consumer Contract Act does not override】
The no-refund policy is not an "unfair clause" under the Consumer Contract Act because: (1) it was clearly disclosed before purchase, (2) the customer gave explicit consent via checkbox, and (3) it is consistent with the nature of digital goods.`,
  },
  {
    title: "退款不可的法律依据 — 日本特定商业交易法第15条之3（中文）",
    content: `Q: 为什么不能退款？有法律依据吗？
A: 是的，有明确的法律依据。

【日本《特定商业交易法》第15条之3（退货特约）】
在网络购物（通信销售）中，如果商家在购买前明确显示了"不可退款"特约，并在最终确认页面上展示，则该特约具有法律效力。yah.mobile在结账时明确显示了此政策，客户在完成付款前通过勾选确认框表示同意。

【冷静期制度不适用】
冷静期制度（特定商业交易法第26条）仅适用于上门销售和电话销售，不适用于网络购物。

【eSIM在QR码发出时即视为"交付完成"】
eSIM是无形数字商品（电磁记录），当QR码通过邮件发送给客户时，商品交付即告完成，与客户是否安装或激活无关。

【消费者合同法不构成例外】
本政策在购买前已明确告知并获得同意，不属于消费者合同法中的"不公平条款"。`,
  },
  {
    title: "환불 불가 법적 근거 — 일본 특정상거래법 제15조의3（한국어）",
    content: `Q: 왜 환불이 안 되나요? 법적 근거가 있나요?
A: 네, 명확한 법적 근거가 있습니다.

【일본 특정상거래법 제15조의3 (반품 특약)】
통신판매(인터넷 구매 포함)에서 사업자가 구매 전 광고 및 최종 확인 화면에 '반품 불가' 특약을 명시한 경우, 해당 특약이 우선 적용됩니다. yah.mobile은 결제 확인 화면에서 이 정책을 명시하고, 고객님께서 체크박스를 통해 동의하셨습니다.

【청약철회(쿨링오프)는 적용되지 않습니다】
청약철회 권리(특정상거래법 제26조)는 방문판매 및 전화권유판매에만 적용됩니다. 인터넷 통신판매에는 적용되지 않습니다.

【eSIM은 QR코드 발행 시점에 '인도 완료'】
eSIM은 무형의 디지털 상품(전자적 기록)으로, QR코드를 이메일로 발송한 시점에 상품 인도가 완료됩니다. 설치 또는 사용 여부와 관계없습니다.`,
  },
  {
    title: "ไม่สามารถคืนเงินได้ — ฐานทางกฎหมาย กฎหมายการค้าเฉพาะของญี่ปุ่น มาตรา 15-3（ภาษาไทย）",
    content: `Q: ทำไมถึงคืนเงินไม่ได้? มีฐานทางกฎหมายหรือไม่?
A: ใช่ มีฐานทางกฎหมายที่ชัดเจน

【กฎหมายการค้าเฉพาะของญี่ปุ่น (特定商取引法) มาตรา 15-3】
ในการซื้อขายทางไปรษณีย์/ออนไลน์ หากผู้ขายแสดงนโยบาย "ไม่คืนเงิน" อย่างชัดเจนในโฆษณาและหน้ายืนยันการสั่งซื้อ นโยบายดังกล่าวมีผลทางกฎหมาย yah.mobile แสดงนโยบายนี้ที่หน้าชำระเงิน และลูกค้าได้ยืนยันความยินยอมผ่านช่องทำเครื่องหมายก่อนชำระเงิน

【สิทธิ์การยกเลิก (Cooling-off) ไม่มีผลบังคับ】
สิทธิ์การยกเลิกใช้ได้เฉพาะการขายแบบเคาะประตูและการขายทางโทรศัพท์เท่านั้น ไม่ใช้กับการซื้อออนไลน์

【eSIM ถือว่า "ส่งมอบแล้ว" เมื่อออก QR Code】
eSIM เป็นสินค้าดิจิทัลไม่มีตัวตน การส่งมอบเสร็จสิ้นเมื่อส่ง QR Code ทางอีเมลแล้ว ไม่ว่าลูกค้าจะติดตั้งหรือใช้งานหรือไม่ก็ตาม`,
  },
  {
    title: "Không thể hoàn tiền — Cơ sở pháp lý theo Luật Giao dịch Thương mại Đặc biệt Nhật Bản Điều 15-3（Tiếng Việt）",
    content: `Q: Tại sao không thể hoàn tiền? Có cơ sở pháp lý không?
A: Có, có cơ sở pháp lý rõ ràng.

【Luật Giao dịch Thương mại Đặc biệt Nhật Bản (特定商取引法), Điều 15-3】
Trong mua bán qua thư/trực tuyến, nếu người bán hiển thị rõ ràng chính sách "không hoàn tiền" trong quảng cáo VÀ trên màn hình xác nhận mua hàng, chính sách đó có hiệu lực pháp lý. yah.mobile hiển thị chính sách này khi thanh toán, và khách hàng đã đồng ý qua ô checkbox trước khi hoàn tất thanh toán.

【Quyền hủy hợp đồng (Cooling-off) KHÔNG áp dụng】
Quyền hủy hợp đồng chỉ áp dụng cho bán hàng tận nhà và bán hàng qua điện thoại. Mua hàng trực tuyến được loại trừ rõ ràng khỏi quy định này.

【eSIM được coi là "đã giao" khi QR code được phát hành】
eSIM là sản phẩm kỹ thuật số vô hình. Việc giao hàng hoàn tất khi QR code được gửi qua email — bất kể khách hàng có cài đặt hay kích hoạt hay không.`,
  },
  // ===== 返金例外ケースの詳細 =====
  {
    title: "返金が認められる例外3ケース（全言語共通）",
    content: `Q: どんな場合に例外的に返金してもらえますか？
A: 以下の3ケースのみ、例外として返金対応が可能です。

【例外ケース1: システム障害によるeSIM未発行】
yah.mobileのシステム障害により、QRコードが発行・送信されなかった場合。
※迷惑メールフォルダを確認しても届いていない場合は、お問い合わせフォームからご連絡ください。

【例外ケース2: 二重請求（同一金額が2回引き落とし）】
同一購入に対して同じ金額が2回請求された場合。
※決済明細のスクリーンショットをお問い合わせフォームに添付してください。

【例外ケース3: 不正利用（クレジットカードの無断使用）】
カード名義人の同意なく第三者がカードを使用した場合。
※カード会社への申告も並行して行ってください。

【これらに該当しない場合】
・まだ使っていない → 返金不可（QRコード送信時点で引渡し完了）
・間違ったプランを購入した → 返金不可（プラン変更も不可）
・接続できない → まずトラブルシューティングを試みてください
・キャンセルしたい → 購入後のキャンセルは不可

Q: What are the 3 exception cases for refunds?
A: Only these 3 cases qualify for a refund exception:
1. System failure: yah.mobile system error caused QR code not to be issued/delivered
2. Duplicate charge: Same amount charged twice for one purchase
3. Unauthorized use: Credit card used without cardholder's consent (fraud)
All other cases (unused eSIM, wrong plan, can't connect, want to cancel) do NOT qualify for refund.`,
  },
  // ===== プラン変更不可ポリシー =====
  {
    title: "プラン変更・アップグレード不可ポリシーと代替案",
    content: `Q: 間違ったプランを買ってしまいました。プランを変更できますか？
A: 申し訳ございませんが、プランの変更・切り替えはできません。

【理由】
各プランは独立したデジタル商品として購入されます。購入後のプラン変更・アップグレード・ダウングレードはシステム上対応していません。

【代替案】
1. 現在のプランのデータ容量が足りない場合 → 追加データを購入できます（1GB = ¥550税込）
2. 全く別のプランが必要な場合 → 新しいプランを別途購入できます（古いプランは有効期限まで使用可能）
3. 古いプランは自動的に有効期限が来たら終了します（手動キャンセル不要）

Q: I bought the wrong plan. Can I switch to a different plan?
A: Unfortunately, plan switching is not available. Each purchase is a separate digital product and cannot be exchanged or upgraded. Alternatives: (1) Purchase additional data (¥550/GB) if your current plan is too small, or (2) Purchase a new separate plan — the old plan will expire naturally at its end date.`,
  },
];

async function main() {
  console.log("Connected to DB pool");

  let inserted = 0;
  for (const doc of LEGAL_RAG_DOCS) {
    console.log(`Processing: ${doc.title.substring(0, 50)}...`);
    try {
      const embedding = await getEmbedding(doc.title + "\n" + doc.content);
      const embeddingJson = JSON.stringify(embedding);
      await pool.execute(
        "INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())",
        [doc.title, doc.content, embeddingJson]
      );
      inserted++;
      console.log(`  \u2713 Inserted (${inserted}/${LEGAL_RAG_DOCS.length})`);
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`  \u2717 Error: ${err.message}`);
    }
  }

  await pool.end();
  console.log(`\nDone: ${inserted}/${LEGAL_RAG_DOCS.length} documents inserted`);
}

main().catch(console.error);
