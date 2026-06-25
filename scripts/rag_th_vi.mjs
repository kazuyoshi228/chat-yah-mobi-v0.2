#!/usr/bin/env node
/**
 * RAG document script:
 * - Delete Spanish FAQ (id: 30005)
 * - Insert Thai FAQ
 * - Insert Vietnamese FAQ
 * - Generate embeddings for each
 */
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const THAI_FAQ = `# yah.mobile คำถามที่พบบ่อย (ภาษาไทย)

yah.mobile คือบริการ eSIM สำหรับนักเดินทางต่างชาติที่มาเยือนญี่ปุ่น เราเสนอราคาต่อ GB ที่ถูกที่สุดในอุตสาหกรรม พร้อมบริการสนับสนุน 24 ชั่วโมง 7 วัน ใน 6 ภาษา

---

## 1. เกี่ยวกับ yah.mobile และ eSIM

### yah.mobile คืออะไร?
yah.mobile คือบริการ eSIM ข้อมูลสำหรับญี่ปุ่นโดยเฉพาะ สำหรับนักเดินทางต่างชาติ ไม่ต้องใช้ซิมการ์ดจริง เพียงสแกน QR Code ก็เชื่อมต่อได้ทันที

### eSIM คืออะไร?
eSIM คือซิมดิจิทัลที่ฝังอยู่ในโทรศัพท์ของคุณ คุณติดตั้งแพ็กเกจโดยการสแกน QR Code โดยไม่ต้องใช้ซิมการ์ดจริง

### โทรศัพท์ของฉันรองรับ eSIM หรือไม่?
**iPhone:** ไปที่ การตั้งค่า → ทั่วไป → เกี่ยวกับ หากเห็นหมายเลข "EID" แสดงว่ารองรับ eSIM (iPhone XS ขึ้นไป)
**Android:** ไปที่ การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม หากเห็น "เพิ่ม eSIM" แสดงว่ารองรับ

### ต้องปลดล็อกโทรศัพท์ก่อนหรือไม่?
ใช่ หากโทรศัพท์ของคุณถูกล็อกซิม คุณต้องปลดล็อกผ่านผู้ให้บริการเดิมก่อน กรุณาติดต่อผู้ให้บริการของคุณ

---

## 2. การซื้อและติดตั้ง eSIM

### วิธีซื้อ eSIM
เข้าไปที่เว็บไซต์ yah.mobile เลือกแพ็กเกจ และชำระเงิน QR Code จะถูกส่งไปยังอีเมลที่ลงทะเบียนไว้

### วิธีติดตั้งบน iPhone
ใช้ **Wi-Fi ที่เสถียร** ตลอดกระบวนการนี้
1. การตั้งค่า → บริการมือถือ → เพิ่ม eSIM
2. สแกน QR Code จากอีเมล
3. แตะ "เพิ่มแพ็กเกจมือถือ" เพื่อยืนยัน
4. ตั้งชื่อแพ็กเกจ (เช่น "yah.mobile Japan")
5. เปิด **Data Roaming**

**สำคัญ:** QR Code ใช้ได้เพียงครั้งเดียว หากการติดตั้งถูกขัดจังหวะ กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอ QR Code ใหม่

### วิธีติดตั้งบน Android
1. การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → เพิ่มซิม
2. เลือก "สแกน QR Code" และสแกนรหัสจากอีเมล
3. ทำตามคำแนะนำบนหน้าจอ
4. เปิด **Data Roaming**

### แพ็กเกจเริ่มต้นเมื่อไหร่?
แพ็กเกจเริ่มต้น **เมื่อคุณใช้ข้อมูลครั้งแรก** ไม่ใช่เมื่อติดตั้ง eSIM แนะนำให้ติดตั้งก่อนเดินทางและเปิดใช้งานเมื่อมาถึงญี่ปุ่น

---

## 3. การตั้งค่า Data Roaming

### ทำไมต้องเปิด Data Roaming?
yah.mobile เป็น eSIM ภายในประเทศญี่ปุ่น โทรศัพท์ของคุณจะมองว่าเป็นเครือข่าย "โรมมิ่ง" ดังนั้นต้องเปิด Data Roaming

**iPhone:** การตั้งค่า → บริการมือถือ → yah.mobile Japan → Data Roaming → เปิด
**Android:** การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → yah.mobile → Data Roaming → เปิด

**เคล็ดลับ:** ปิด Data Roaming สำหรับซิมหลักของคุณเพื่อหลีกเลี่ยงค่าใช้จ่ายจากผู้ให้บริการเดิม

---

## 4. การแก้ไขปัญหาการเชื่อมต่อ

### ติดตั้ง eSIM แล้วแต่เชื่อมต่ออินเทอร์เน็ตไม่ได้

**ขั้นตอนที่ 1: เปิด/ปิด Airplane Mode**
เปิด Airplane Mode ค้างไว้ 10 วินาที แล้วปิด วิธีนี้แก้ปัญหาได้ในกรณีส่วนใหญ่

**ขั้นตอนที่ 2: ตรวจสอบ Data Roaming**
ตรวจสอบให้แน่ใจว่าเปิด Data Roaming สำหรับ yah.mobile แล้ว

**ขั้นตอนที่ 3: เลือกเครือข่ายด้วยตนเอง**
iPhone: การตั้งค่า → บริการมือถือ → yah.mobile → เครือข่าย → เลือกเครือข่ายด้วยตนเอง → เลือก NTT DOCOMO, SoftBank หรือ au
Android: การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → yah.mobile → ผู้ให้บริการ → ค้นหาและเลือกเครือข่าย

**ขั้นตอนที่ 4: รีสตาร์ทโทรศัพท์**
ปิดและเปิดโทรศัพท์ใหม่

### eSIM หายไปจากการตั้งค่า
อย่าลบ eSIM ออกจากโทรศัพท์ เพราะ QR Code ใช้ได้เพียงครั้งเดียว หากเกิดปัญหานี้ กรุณาติดต่อฝ่ายสนับสนุน

---

## 5. แพ็กเกจและราคา

### ดูราคาล่าสุดได้ที่ไหน?
กรุณาตรวจสอบราคาและแพ็กเกจล่าสุดได้ที่เว็บไซต์ yah.mobile เนื่องจากราคาอาจมีการเปลี่ยนแปลง

### ข้อมูลหมดแล้วทำอย่างไร?
เมื่อข้อมูลหมด คุณสามารถซื้อแพ็กเกจเพิ่มเติมได้ผ่านเว็บไซต์ yah.mobile

---

## 6. การคืนเงินและการยกเลิก

### นโยบายการคืนเงิน
กรุณาติดต่อฝ่ายสนับสนุนสำหรับคำถามเกี่ยวกับการคืนเงิน เจ้าหน้าที่จะช่วยเหลือคุณ

---

## 7. ติดต่อฝ่ายสนับสนุน

yah.mobile ให้บริการสนับสนุน 24 ชั่วโมง 7 วัน ผ่านระบบแชทนี้ใน 6 ภาษา
หากปัญหาของคุณต้องการความช่วยเหลือจากเจ้าหน้าที่ เราจะเชื่อมต่อคุณกับผู้เชี่ยวชาญทันที`;

const VIETNAMESE_FAQ = `# yah.mobile Câu hỏi thường gặp (Tiếng Việt)

yah.mobile là dịch vụ eSIM dành riêng cho Nhật Bản, phục vụ du khách quốc tế. Chúng tôi cung cấp giá mỗi GB thấp nhất trong ngành, với hỗ trợ 24/7 bằng 6 ngôn ngữ.

---

## 1. Về yah.mobile và eSIM

### yah.mobile là gì?
yah.mobile là dịch vụ eSIM dữ liệu dành riêng cho Nhật Bản, dành cho du khách quốc tế. Không cần SIM vật lý — chỉ cần quét mã QR là kết nối được ngay.

### eSIM là gì?
eSIM là SIM kỹ thuật số được tích hợp sẵn trong điện thoại của bạn. Bạn cài đặt gói cước bằng cách quét mã QR — không cần thẻ SIM vật lý.

### Điện thoại của tôi có hỗ trợ eSIM không?
**iPhone:** Vào Cài đặt → Cài đặt chung → Giới thiệu. Nếu thấy số "EID", điện thoại hỗ trợ eSIM (iPhone XS trở lên).
**Android:** Vào Cài đặt → Mạng và Internet → SIM. Nếu thấy "Thêm eSIM", điện thoại tương thích.

### Tôi có cần mở khóa điện thoại không?
Có. Nếu điện thoại bị khóa SIM, bạn phải mở khóa qua nhà mạng gốc trước khi sử dụng yah.mobile. Vui lòng liên hệ nhà mạng của bạn.

---

## 2. Mua và cài đặt eSIM

### Cách mua eSIM
Truy cập website yah.mobile, chọn gói cước và hoàn tất thanh toán. Mã QR sẽ được gửi đến địa chỉ email đã đăng ký.

### Cách cài đặt trên iPhone
Sử dụng **kết nối Wi-Fi ổn định** trong suốt quá trình này.
1. Cài đặt → Dịch vụ di động → Thêm eSIM
2. Quét mã QR từ email
3. Nhấn "Thêm gói di động" để xác nhận
4. Đặt tên gói (ví dụ: "yah.mobile Japan")
5. Bật **Data Roaming**

**Quan trọng:** Mã QR chỉ sử dụng được một lần. Nếu cài đặt bị gián đoạn, hãy liên hệ bộ phận hỗ trợ để nhận mã QR mới.

### Cách cài đặt trên Android
1. Cài đặt → Mạng và Internet → SIM → Thêm SIM
2. Chọn "Quét mã QR" và quét mã từ email
3. Làm theo hướng dẫn trên màn hình
4. Bật **Data Roaming**

### Gói cước bắt đầu khi nào?
Gói cước bắt đầu **khi bạn sử dụng dữ liệu lần đầu tiên** — không phải khi cài đặt eSIM. Chúng tôi khuyên bạn cài đặt trước chuyến đi và kích hoạt khi đến Nhật Bản.

---

## 3. Cài đặt Data Roaming

### Tại sao cần bật Data Roaming?
yah.mobile là eSIM nội địa Nhật Bản. Điện thoại của bạn xem đây là mạng "roaming", vì vậy phải bật Data Roaming.

**iPhone:** Cài đặt → Dịch vụ di động → yah.mobile Japan → Data Roaming → BẬT
**Android:** Cài đặt → Mạng và Internet → SIM → yah.mobile → Data Roaming → BẬT

**Mẹo:** Tắt Data Roaming cho SIM chính của bạn để tránh phí từ nhà mạng gốc.

---

## 4. Xử lý sự cố kết nối

### Đã cài eSIM nhưng không kết nối được internet

**Bước 1: Bật/tắt Chế độ máy bay**
Bật Chế độ máy bay trong 10 giây, sau đó tắt. Cách này giải quyết hầu hết các vấn đề kết nối.

**Bước 2: Kiểm tra Data Roaming**
Đảm bảo đã bật Data Roaming cho yah.mobile.

**Bước 3: Chọn mạng thủ công**
iPhone: Cài đặt → Dịch vụ di động → yah.mobile → Mạng → Chọn mạng thủ công → Chọn NTT DOCOMO, SoftBank hoặc au
Android: Cài đặt → Mạng và Internet → SIM → yah.mobile → Nhà mạng → Tìm kiếm và chọn mạng

**Bước 4: Khởi động lại điện thoại**
Tắt và bật lại điện thoại.

### eSIM biến mất khỏi cài đặt
Không xóa eSIM khỏi điện thoại vì mã QR chỉ dùng được một lần. Nếu gặp vấn đề này, vui lòng liên hệ bộ phận hỗ trợ.

---

## 5. Gói cước và giá

### Xem giá mới nhất ở đâu?
Vui lòng kiểm tra giá và gói cước mới nhất trên website yah.mobile vì giá có thể thay đổi.

### Hết dữ liệu thì làm gì?
Khi hết dữ liệu, bạn có thể mua thêm gói qua website yah.mobile.

---

## 6. Hoàn tiền và hủy dịch vụ

### Chính sách hoàn tiền
Vui lòng liên hệ bộ phận hỗ trợ cho các câu hỏi về hoàn tiền. Nhân viên sẽ hỗ trợ bạn.

---

## 7. Liên hệ hỗ trợ

yah.mobile cung cấp hỗ trợ 24/7 qua hệ thống chat này bằng 6 ngôn ngữ.
Nếu vấn đề của bạn cần sự hỗ trợ từ nhân viên, chúng tôi sẽ kết nối bạn với chuyên gia ngay lập tức.`;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // 1. Delete Spanish FAQ (already deleted, but run idempotently)
    console.log('Ensuring Spanish FAQ is deleted...');
    await conn.execute('DELETE FROM rag_documents WHERE id = 30005');
    console.log('✓ Spanish FAQ removed');

    // 2. Insert Thai FAQ (no embedding - uses fallback like existing docs)
    console.log('Inserting Thai FAQ...');
    await conn.execute(
      'INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, NULL, NOW())',
      ['yah.mobile คำถามที่พบบ่อย (ภาษาไทย)', THAI_FAQ]
    );
    console.log('✓ Inserted Thai FAQ');

    // 3. Insert Vietnamese FAQ (no embedding - uses fallback like existing docs)
    console.log('Inserting Vietnamese FAQ...');
    await conn.execute(
      'INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, NULL, NOW())',
      ['yah.mobile Câu hỏi thường gặp (Tiếng Việt)', VIETNAMESE_FAQ]
    );
    console.log('✓ Inserted Vietnamese FAQ');

    // Verify
    const [rows] = await conn.execute('SELECT id, title, CHAR_LENGTH(content) as chars FROM rag_documents ORDER BY id');
    console.log('\nCurrent RAG documents:');
    rows.forEach(r => console.log(`  [${r.id}] ${r.title} (${r.chars} chars)`));

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
