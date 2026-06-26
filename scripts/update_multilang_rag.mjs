/**
 * Update multilingual RAG documents with no-refund-after-payment policy
 * - Chinese (id:30003): Add refund policy section
 * - Korean (id:30004): Update from "QR code issued" to "payment complete"
 * - Thai (id:90001): Update from "QR code issued" to "payment complete"
 * - Vietnamese (id:90002): Update from "QR code issued" to "payment complete"
 */

import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// ── Chinese (id:30003): Add refund policy section ──────────────────────────
const zhRefundSection = `

---

## 10. 退款与取消政策

### 原则：不可退款，不可取消

eSIM 是数字商品。**一旦完成付款，无论是否已安装，均不可取消或申请退款。**

此政策依据日本《特定商业交易法》第15条第3款（数字内容特例）。

### 购买流程中的同意确认

在最终购买确认页面，您已同意以下复选框内容：

> "eSIM 是数字商品。付款完成后，不受理取消及退款申请。"

### 例外处理情形

以下情况可联系运营团队个别处理：

- yah.mobile 系统故障导致 eSIM 未能发行
- 经确认的重复收费
- 经确认的信用卡未授权使用

如需联系，请前往 yah.mobi/app，滚动至"联系我们"部分提交表单。工作时间内2小时内回复。

### 关于特定商业交易法

依据日本《特定商业交易法》第15条第3款，数字内容（eSIM）一旦开始提供，消费者不享有撤回权（冷静期）。购买前请务必确认。
`;

// Get current Chinese content
const [zhRows] = await conn.execute('SELECT content FROM rag_documents WHERE id = 30003');
const zhContent = zhRows[0].content;
const newZhContent = zhContent + zhRefundSection;
await conn.execute('UPDATE rag_documents SET content = ? WHERE id = 30003', [newZhContent]);
console.log('✅ Chinese (id:30003): Refund policy section added');

// ── Korean (id:30004): Update refund policy wording ──────────────────────
const [koRows] = await conn.execute('SELECT content FROM rag_documents WHERE id = 30004');
let koContent = koRows[0].content;

// Replace "QR 코드가 발급된 이후에는" with "결제 완료 후에는"
koContent = koContent.replace(
  /\*\*QR 코드가 발급된 이후에는 설치 여부와 관계없이 환불 및 취소가 불가합니다\.\*\*/,
  '**결제 완료 후에는 설치 여부와 관계없이 환불 및 취소가 불가합니다.**'
);
// Update checkbox text
koContent = koContent.replace(
  /> "eSIM은 디지털 상품입니다\. QR 코드 발급 후에는 취소 및 환불 요청을 받지 않습니다\."/,
  '> "eSIM은 디지털 상품입니다. 결제 완료 후에는 취소 및 환불 요청을 받지 않습니다."'
);

await conn.execute('UPDATE rag_documents SET content = ? WHERE id = 30004', [koContent]);
console.log('✅ Korean (id:30004): Refund policy updated to "payment complete"');

// ── Thai (id:90001): Update refund policy wording ────────────────────────
const [thRows] = await conn.execute('SELECT content FROM rag_documents WHERE id = 90001');
let thContent = thRows[0].content;

// Replace "เมื่อออก QR Code แล้ว" with "หลังจากชำระเงินเสร็จสมบูรณ์"
thContent = thContent.replace(
  /\*\*เมื่อออก QR Code แล้ว ไม่สามารถยกเลิกหรือขอคืนเงินได้ ไม่ว่าจะติดตั้งแล้วหรือยังไม่ได้ติดตั้ง\*\*/,
  '**หลังจากชำระเงินเสร็จสมบูรณ์ ไม่สามารถยกเลิกหรือขอคืนเงินได้ ไม่ว่าจะติดตั้งแล้วหรือยังไม่ได้ติดตั้ง**'
);

await conn.execute('UPDATE rag_documents SET content = ? WHERE id = 90001', [thContent]);
console.log('✅ Thai (id:90001): Refund policy updated to "payment complete"');

// ── Vietnamese (id:90002): Update refund policy wording ─────────────────
const [viRows] = await conn.execute('SELECT content FROM rag_documents WHERE id = 90002');
let viContent = viRows[0].content;

// Replace "Sau khi mã QR được phát hành" with "Sau khi thanh toán hoàn tất"
viContent = viContent.replace(
  /\*\*Sau khi mã QR được phát hành, không thể hủy hoặc hoàn tiền dù đã cài đặt hay chưa\.\*\*/,
  '**Sau khi thanh toán hoàn tất, không thể hủy hoặc hoàn tiền dù đã cài đặt hay chưa.**'
);

await conn.execute('UPDATE rag_documents SET content = ? WHERE id = 90002', [viContent]);
console.log('✅ Vietnamese (id:90002): Refund policy updated to "payment complete"');

await conn.end();
console.log('\n✅ All multilingual RAG documents updated successfully');
