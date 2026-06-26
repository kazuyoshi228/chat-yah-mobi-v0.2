import { getDb } from './server/db.js';
import { ragDocuments } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const db = await getDb();

// ─── 中国語（id:30003）───────────────────────────────────────────────────────
const zhDoc = await db.select({ content: ragDocuments.content })
  .from(ragDocuments).where(eq(ragDocuments.id, 30003));
if (zhDoc.length > 0) {
  let content = zhDoc[0].content || '';
  // 旧返金セクションを置換
  content = content.replace(
    /## 9\. 退款政策[\s\S]*?(?=\n## |\n---|\n# |$)/,
    `## 9. 退款与取消政策

### 原则：不可退款、不可取消

eSIM 是数字商品。**一旦 QR 码发出，无论是否安装，均不可退款或取消。**

此政策依据日本《特定商业交易法》第 15 条之 3（数字内容特例）制定。

### 购买流程中的同意确认

在购买最终确认页面，您已通过勾选以下复选框表示同意：

> "eSIM 为数字商品。QR 码发出后，不接受取消或退款申请。"

### 例外处理情形

以下情况将单独上报运营团队处理，不得自行进行退款操作：

| 情形 | 处理方式 |
|------|----------|
| yah.mobile 系统故障导致 eSIM 未正常发出 | 上报运营团队个别处理 |
| 确认存在重复扣款或支付错误 | 仅退还重复部分 |
| 确认为未成年人在无监护人同意下购买 | 上报运营团队个别处理 |
| 确认为信用卡被盗刷 | 上报运营团队个别处理 |

如遇上述情形，请通过实时聊天联系客服，并提供订单号及注册邮箱。

`
  );
  await db.update(ragDocuments).set({ content }).where(eq(ragDocuments.id, 30003));
  console.log('✅ 中国語（id:30003）更新完了');
}

// ─── 韓国語（id:30004）───────────────────────────────────────────────────────
const koDoc = await db.select({ content: ragDocuments.content })
  .from(ragDocuments).where(eq(ragDocuments.id, 30004));
if (koDoc.length > 0) {
  let content = koDoc[0].content || '';
  content = content.replace(
    /## 9\. 환불 정책[\s\S]*?(?=\n## |\n---|\n# |$)/,
    `## 9. 환불 및 취소 정책

### 원칙: 환불 불가, 취소 불가

eSIM은 디지털 상품입니다. **QR 코드가 발급된 이후에는 설치 여부와 관계없이 환불 및 취소가 불가합니다.**

이 정책은 일본 「특정상거래에 관한 법률」 제15조의 3（디지털 콘텐츠 특례）에 근거합니다.

### 구매 흐름 내 동의 확인

최종 구매 확인 화면에서 다음 체크박스에 동의하셨습니다:

> "eSIM은 디지털 상품입니다. QR 코드 발급 후에는 취소 및 환불 요청을 받지 않습니다."

### 예외적 대응 사례

아래의 경우에는 운영팀에 개별 에스컬레이션하여 처리합니다. 자체적으로 환불 처리하지 않습니다:

| 상황 | 처리 방식 |
|------|-----------|
| yah.mobile 시스템 장애로 eSIM이 정상 발급되지 않은 경우 | 운영팀에 개별 에스컬레이션 |
| 이중 청구 또는 결제 오류가 확인된 경우 | 중복 금액만 환불 |
| 미성년자가 보호자 동의 없이 구매한 것이 확인된 경우 | 운영팀에 개별 에스컬레이션 |
| 신용카드 부정 사용이 확인된 경우 | 운영팀에 개별 에스컬레이션 |

위 사항에 해당하는 경우, 라이브 채팅을 통해 주문 번호와 등록 이메일 주소를 알려주세요.

`
  );
  await db.update(ragDocuments).set({ content }).where(eq(ragDocuments.id, 30004));
  console.log('✅ 韓国語（id:30004）更新完了');
}

// ─── タイ語（id:90001）───────────────────────────────────────────────────────
const thDoc = await db.select({ content: ragDocuments.content })
  .from(ragDocuments).where(eq(ragDocuments.id, 90001));
if (thDoc.length > 0) {
  let content = thDoc[0].content || '';
  content = content.replace(
    /## 6\. การคืนเงินและการยกเลิก[\s\S]*?(?=\n## |\n---|\n# |$)/,
    `## 6. นโยบายการคืนเงินและการยกเลิก

### หลักการ: ไม่สามารถคืนเงินและยกเลิกได้

eSIM เป็นสินค้าดิจิทัล **เมื่อออก QR Code แล้ว ไม่สามารถยกเลิกหรือขอคืนเงินได้ ไม่ว่าจะติดตั้งแล้วหรือยังไม่ได้ติดตั้ง**

นโยบายนี้เป็นไปตามกฎหมายธุรกรรมพาณิชย์เฉพาะของญี่ปุ่น มาตรา 15-3 (ข้อยกเว้นเนื้อหาดิจิทัล)

### การยืนยันความยินยอมในขั้นตอนการซื้อ

ในหน้ายืนยันการซื้อขั้นสุดท้าย คุณได้ทำเครื่องหมายในช่องต่อไปนี้:

> "eSIM เป็นสินค้าดิจิทัล หลังจากออก QR Code แล้ว จะไม่รับคำขอยกเลิกหรือคืนเงิน"

### กรณีข้อยกเว้น

กรณีต่อไปนี้จะได้รับการพิจารณาเป็นรายกรณีโดยทีมงาน:

| สถานการณ์ | วิธีการจัดการ |
|-----------|---------------|
| eSIM ไม่ออกเนื่องจากความผิดพลาดของระบบ yah.mobile | ส่งต่อทีมงานเพื่อพิจารณาเป็นรายกรณี |
| มีการเรียกเก็บเงินซ้ำหรือข้อผิดพลาดในการชำระเงิน | คืนเงินเฉพาะส่วนที่ซ้ำ |
| ผู้เยาว์ซื้อโดยไม่ได้รับความยินยอมจากผู้ปกครอง | ส่งต่อทีมงานเพื่อพิจารณาเป็นรายกรณี |
| พบการใช้บัตรเครดิตโดยไม่ได้รับอนุญาต | ส่งต่อทีมงานเพื่อพิจารณาเป็นรายกรณี |

หากเข้าข่ายกรณีข้างต้น กรุณาติดต่อทีมสนับสนุนผ่านแชทสด พร้อมแจ้งหมายเลขคำสั่งซื้อและอีเมลที่ลงทะเบียน

`
  );
  await db.update(ragDocuments).set({ content }).where(eq(ragDocuments.id, 90001));
  console.log('✅ タイ語（id:90001）更新完了');
}

// ─── ベトナム語（id:90002）───────────────────────────────────────────────────
const viDoc = await db.select({ content: ragDocuments.content })
  .from(ragDocuments).where(eq(ragDocuments.id, 90002));
if (viDoc.length > 0) {
  let content = viDoc[0].content || '';
  content = content.replace(
    /## 6\. Hoàn tiền và hủy dịch vụ[\s\S]*?(?=\n## |\n---|\n# |$)/,
    `## 6. Chính sách hoàn tiền và hủy dịch vụ

### Nguyên tắc: Không hoàn tiền, không hủy

eSIM là sản phẩm kỹ thuật số. **Sau khi mã QR được phát hành, không thể hủy hoặc hoàn tiền dù đã cài đặt hay chưa.**

Chính sách này tuân theo Luật Giao dịch Thương mại Đặc biệt của Nhật Bản, Điều 15-3 (Ngoại lệ nội dung kỹ thuật số).

### Xác nhận đồng ý trong quy trình mua hàng

Tại trang xác nhận mua hàng cuối cùng, bạn đã đánh dấu vào ô sau:

> "eSIM là sản phẩm kỹ thuật số. Sau khi mã QR được phát hành, chúng tôi không chấp nhận yêu cầu hủy hoặc hoàn tiền."

### Các trường hợp ngoại lệ

Các trường hợp sau sẽ được xử lý riêng bởi đội ngũ vận hành:

| Tình huống | Cách xử lý |
|------------|------------|
| eSIM không được phát hành do lỗi hệ thống của yah.mobile | Chuyển lên đội ngũ vận hành xử lý riêng |
| Xác nhận có lỗi thanh toán trùng lặp | Hoàn tiền chỉ phần trùng lặp |
| Xác nhận người chưa thành niên mua mà không có sự đồng ý của phụ huynh | Chuyển lên đội ngũ vận hành xử lý riêng |
| Xác nhận thẻ tín dụng bị sử dụng trái phép | Chuyển lên đội ngũ vận hành xử lý riêng |

Nếu thuộc các trường hợp trên, vui lòng liên hệ bộ phận hỗ trợ qua live chat, cung cấp số đơn hàng và email đăng ký.

`
  );
  await db.update(ragDocuments).set({ content }).where(eq(ragDocuments.id, 90002));
  console.log('✅ ベトナム語（id:90002）更新完了');
}

console.log('全言語のRAGドキュメント更新完了');
process.exit(0);
