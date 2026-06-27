#!/usr/bin/env node
/**
 * Add comprehensive Thai and Vietnamese RAG documents
 * Covers all categories that currently only have English/Chinese/Korean versions:
 * - APN Settings (iPhone + Android)
 * - Service Overview
 * - Purchase & Activation Guide
 * - Destination Connection Guide
 * - Device Installation Guide
 * - Top 10 FAQ
 * - Pre-Travel Checklist
 * - Departure Day Guide
 * - OONAS Hospitality Principles
 * - Refund Policy (detailed)
 * - Connection Troubleshooting (granular)
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

// ============================================================
// THAI DOCUMENTS
// ============================================================

const TH_APN_IPHONE = `# คู่มือตั้งค่า APN - iPhone | eSIM ไม่เชื่อมต่อ วิธีแก้ไข

## คำสำคัญ: APN, ตั้งค่า, ไม่เชื่อมต่อ, ไม่มีสัญญาณ, iPhone, iOS, yah.mobile

## ปัญหา: ติดตั้ง eSIM แล้วแต่อินเทอร์เน็ตไม่ทำงาน (iPhone)

### ขั้นตอนที่ 1: ตรวจสอบว่าเปิดใช้งาน eSIM แล้ว
การตั้งค่า → บริการมือถือ → ตรวจสอบว่าสวิตช์ yah.mobile เปิดอยู่ (สีเขียว)
หากเห็น "ไม่มีสัญญาณ" หรือ "SOS เท่านั้น" อาจเป็นเพราะสายถูกปิดใช้งาน

### ขั้นตอนที่ 2: เปิด Data Roaming
การตั้งค่า → บริการมือถือ → แตะ yah.mobile → เปิด "Data Roaming"
สำคัญ: ต้องเปิด Data Roaming เพื่อให้ eSIM ต่างประเทศทำงานในญี่ปุ่น

### ขั้นตอนที่ 3: ตั้งค่า APN
การตั้งค่า → บริการมือถือ → แตะ yah.mobile → เครือข่ายข้อมูลมือถือ
ตั้งค่า APN เป็น: yah.mobile
เว้นว่าง Username และ Password

### ขั้นตอนที่ 4: ตั้งเป็นสายข้อมูลหลัก
การตั้งค่า → บริการมือถือ → ข้อมูลมือถือ → เลือก yah.mobile
เพื่อให้อุปกรณ์ใช้ eSIM สำหรับอินเทอร์เน็ต ไม่ใช่ SIM หลัก

### ขั้นตอนที่ 5: สลับ Airplane Mode
เปิด Airplane Mode ค้างไว้ 10 วินาที แล้วปิด
วิธีนี้บังคับให้อุปกรณ์ลงทะเบียนกับเครือข่ายใหม่

### ขั้นตอนที่ 6: ตรวจสอบการตั้งค่าผู้ให้บริการ
การตั้งค่า → ทั่วไป → เกี่ยวกับ
หากมีการอัปเดตการตั้งค่าผู้ให้บริการ จะมีป๊อปอัปปรากฏขึ้น แตะ "อัปเดต"

### ขั้นตอนที่ 7: รีสตาร์ทอุปกรณ์
ปิดเครื่องสมบูรณ์ รอ 30 วินาที แล้วเปิดใหม่

### ขั้นตอนที่ 8: รีเซ็ตการตั้งค่าเครือข่าย (ทางเลือกสุดท้าย)
การตั้งค่า → ทั่วไป → ถ่ายโอนหรือรีเซ็ต iPhone → รีเซ็ต → รีเซ็ตการตั้งค่าเครือข่าย
คำเตือน: วิธีนี้จะลบรหัสผ่าน Wi-Fi ที่บันทึกไว้

### ยังไม่ทำงานหลังทำทุกขั้นตอน?
กรุณาติดต่อฝ่ายสนับสนุน yah.mobile ผ่านแชทนี้ พร้อมแจ้ง:
- รุ่น iPhone และเวอร์ชัน iOS
- ขั้นตอนที่ลองทำแล้ว
- ภาพหน้าจอการตั้งค่าบริการมือถือ`;

const TH_APN_ANDROID = `# คู่มือตั้งค่า APN - Android | eSIM ไม่เชื่อมต่อ วิธีแก้ไข

## คำสำคัญ: APN, ตั้งค่า, ไม่เชื่อมต่อ, Android, Samsung, Google Pixel, yah.mobile

## ปัญหา: ติดตั้ง eSIM แล้วแต่อินเทอร์เน็ตไม่ทำงาน (Android)

### ขั้นตอนที่ 1: ตรวจสอบว่าเปิดใช้งาน eSIM แล้ว
การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → ตรวจสอบว่า yah.mobile เปิดอยู่
หากปิดอยู่ ให้แตะเพื่อเปิดใช้งาน

### ขั้นตอนที่ 2: เปิด Data Roaming
การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → yah.mobile → เปิด "Data Roaming"
สำคัญ: ต้องเปิด Data Roaming เพื่อให้ eSIM ต่างประเทศทำงานในญี่ปุ่น

### ขั้นตอนที่ 3: ตั้งค่า APN
การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → yah.mobile → ชื่อจุดเชื่อมต่อ (APN)
แตะ "เพิ่ม APN" หรือแก้ไข APN ที่มีอยู่:
- ชื่อ: yah.mobile
- APN: yah.mobile
- เว้นว่างส่วนที่เหลือ
บันทึกและเลือก APN นี้

### ขั้นตอนที่ 4: ตั้งเป็นสายข้อมูลหลัก
การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → ซิมที่ต้องการสำหรับข้อมูล → เลือก yah.mobile

### ขั้นตอนที่ 5: สลับ Airplane Mode
เปิด Airplane Mode ค้างไว้ 10 วินาที แล้วปิด

### ขั้นตอนที่ 6: รีสตาร์ทอุปกรณ์
ปิดเครื่องสมบูรณ์ รอ 30 วินาที แล้วเปิดใหม่

### Samsung Galaxy - ขั้นตอนเพิ่มเติม
การตั้งค่า → การจัดการทั่วไป → รีเซ็ต → รีเซ็ตการตั้งค่าเครือข่าย
แล้วตั้งค่า APN ใหม่ตามขั้นตอนที่ 3

### ยังไม่ทำงานหลังทำทุกขั้นตอน?
กรุณาติดต่อฝ่ายสนับสนุน yah.mobile ผ่านแชทนี้ พร้อมแจ้ง:
- รุ่น Android และเวอร์ชัน OS
- ขั้นตอนที่ลองทำแล้ว`;

const TH_SERVICE_OVERVIEW = `# yah.mobile คืออะไร? - ภาพรวมบริการ (ภาษาไทย)

## คำสำคัญ: yah.mobile, eSIM, ญี่ปุ่น, บริการ, นักเดินทาง, ราคา, แพ็กเกจ

## yah.mobile คืออะไร?

yah.mobile คือบริการ eSIM ข้อมูลสำหรับญี่ปุ่นโดยเฉพาะ ออกแบบมาสำหรับนักเดินทางต่างชาติที่มาเยือนญี่ปุ่น

### จุดเด่นของ yah.mobile
- **ราคาต่อ GB ต่ำที่สุด** ในอุตสาหกรรม eSIM ญี่ปุ่น
- **ไม่มีค่าธรรมเนียมรายเดือน** — จ่ายเฉพาะที่ใช้
- **ติดตั้งง่าย** — เพียงสแกน QR Code ก็พร้อมใช้งาน
- **รองรับ 6 ภาษา** — ญี่ปุ่น อังกฤษ จีน เกาหลี ไทย เวียดนาม
- **บริการสนับสนุน 24/7** ผ่านแชทนี้

### eSIM คืออะไร?
eSIM คือซิมดิจิทัลที่ฝังอยู่ในโทรศัพท์ของคุณ ไม่ต้องใช้ซิมการ์ดจริง เพียงสแกน QR Code เพื่อติดตั้งแพ็กเกจ

### เครือข่ายที่ใช้ในญี่ปุ่น
yah.mobile ใช้เครือข่าย NTT DOCOMO, SoftBank และ au ซึ่งครอบคลุมทั่วญี่ปุ่น

### โทรศัพท์ที่รองรับ
- **iPhone:** XS ขึ้นไป (iOS 14+)
- **Android:** Samsung Galaxy S20+, Google Pixel 3+, และรุ่นอื่นๆ ที่รองรับ eSIM

### วิธีตรวจสอบว่าโทรศัพท์รองรับ eSIM
**iPhone:** การตั้งค่า → ทั่วไป → เกี่ยวกับ → ดูหมายเลข EID
**Android:** การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → ดูตัวเลือก "เพิ่ม eSIM"

### ต้องปลดล็อกโทรศัพท์ก่อนหรือไม่?
ใช่ หากโทรศัพท์ถูกล็อกกับผู้ให้บริการ ต้องปลดล็อกก่อน กรุณาติดต่อผู้ให้บริการเดิมของคุณ

### ซื้อได้ที่ไหน?
ซื้อได้ที่เว็บไซต์ yah.mobile (yah.mobi/app) ชำระเงินออนไลน์ได้ทันที`;

const TH_PURCHASE_GUIDE = `# คู่มือซื้อและเปิดใช้งาน eSIM - ขั้นตอนครบถ้วน (ภาษาไทย)

## คำสำคัญ: ซื้อ, ติดตั้ง, เปิดใช้งาน, QR Code, ขั้นตอน, วิธี

## ขั้นตอนที่ 1: ซื้อ eSIM

1. เข้าไปที่ yah.mobi/app
2. เลือกแพ็กเกจที่เหมาะกับการเดินทางของคุณ
3. กรอกอีเมลและชำระเงิน
4. รับ QR Code ทางอีเมลภายในไม่กี่นาที

**สำคัญ:** ตรวจสอบอีเมลรวมถึงโฟลเดอร์สแปม

## ขั้นตอนที่ 2: ติดตั้งบน iPhone

ใช้ **Wi-Fi ที่เสถียร** ตลอดกระบวนการ อย่าใช้ข้อมูลมือถือ

1. การตั้งค่า → บริการมือถือ → เพิ่ม eSIM
2. เลือก "ใช้ QR Code"
3. สแกน QR Code จากอีเมล
4. แตะ "เพิ่มแพ็กเกจมือถือ"
5. ตั้งชื่อ (เช่น "yah.mobile Japan")
6. เลือก "ค่าเริ่มต้น" สำหรับสาย
7. เปิด **Data Roaming**

**QR Code ใช้ได้เพียงครั้งเดียว** หากการติดตั้งถูกขัดจังหวะ ติดต่อฝ่ายสนับสนุนเพื่อขอ QR Code ใหม่

## ขั้นตอนที่ 3: ติดตั้งบน Android

1. การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → เพิ่มซิม
2. เลือก "สแกน QR Code"
3. สแกน QR Code จากอีเมล
4. ทำตามคำแนะนำบนหน้าจอ
5. เปิด **Data Roaming**

## ขั้นตอนที่ 4: เปิดใช้งาน

แพ็กเกจเริ่มต้น **เมื่อคุณใช้ข้อมูลครั้งแรก** ไม่ใช่เมื่อติดตั้ง
แนะนำ: ติดตั้งก่อนเดินทาง เปิดใช้งานเมื่อมาถึงญี่ปุ่น

## ขั้นตอนที่ 5: ตรวจสอบการเชื่อมต่อ

1. ปิด Wi-Fi
2. เปิดเบราว์เซอร์และเข้าเว็บไซต์ใดก็ได้
3. หากเชื่อมต่อได้ แสดงว่า eSIM ทำงานปกติ

## คำถามที่พบบ่อย

**ถาม: ไม่ได้รับอีเมล QR Code**
ตอบ: ตรวจสอบโฟลเดอร์สแปม หากยังไม่พบ ติดต่อฝ่ายสนับสนุน

**ถาม: QR Code สแกนไม่ได้**
ตอบ: ลองขยายภาพ QR Code หรือใช้อุปกรณ์อื่นแสดง QR Code

**ถาม: ติดตั้งแล้วแต่ไม่มีสัญญาณ**
ตอบ: ตรวจสอบว่าเปิด Data Roaming แล้ว และเลือก yah.mobile เป็นสายข้อมูลหลัก`;

const TH_FAQ_TOP10 = `# คำถามที่พบบ่อย Top 10 - yah.mobile (ภาษาไทย)

## คำสำคัญ: FAQ, คำถาม, ปัญหา, ช่วยเหลือ, สนับสนุน

### 1. eSIM คืออะไร และแตกต่างจาก SIM ปกติอย่างไร?
eSIM คือซิมดิจิทัลที่ฝังในโทรศัพท์ ไม่ต้องใช้การ์ดจริง ติดตั้งได้ทันทีด้วย QR Code ไม่ต้องรอรับซิมทางไปรษณีย์

### 2. โทรศัพท์ของฉันรองรับ eSIM หรือไม่?
**iPhone:** XS ขึ้นไป — ตรวจสอบที่ การตั้งค่า → ทั่วไป → เกี่ยวกับ → ดูหมายเลข EID
**Android:** Samsung S20+, Pixel 3+, และรุ่นอื่นๆ — ตรวจสอบที่ การตั้งค่า → เครือข่าย → ซิม

### 3. ต้องปลดล็อกโทรศัพท์ก่อนหรือไม่?
ใช่ หากโทรศัพท์ถูกล็อกกับผู้ให้บริการ ต้องปลดล็อกก่อน ติดต่อผู้ให้บริการเดิมของคุณ

### 4. แพ็กเกจเริ่มต้นเมื่อไหร่?
เริ่มต้นเมื่อคุณ **ใช้ข้อมูลครั้งแรก** ไม่ใช่เมื่อติดตั้ง eSIM

### 5. ทำไมต้องเปิด Data Roaming?
yah.mobile เป็น eSIM ภายในประเทศญี่ปุ่น โทรศัพท์จะมองว่าเป็นเครือข่าย "โรมมิ่ง" จึงต้องเปิด Data Roaming

### 6. ติดตั้ง eSIM แล้วแต่ไม่มีสัญญาณ ทำอย่างไร?
1. เปิด/ปิด Airplane Mode
2. ตรวจสอบ Data Roaming เปิดอยู่
3. ตั้งค่า APN เป็น "yah.mobile"
4. เลือก yah.mobile เป็นสายข้อมูลหลัก
5. รีสตาร์ทโทรศัพท์

### 7. QR Code ใช้ได้กี่ครั้ง?
**ครั้งเดียวเท่านั้น** หากการติดตั้งถูกขัดจังหวะ ติดต่อฝ่ายสนับสนุนเพื่อขอ QR Code ใหม่

### 8. ข้อมูลหมดแล้วทำอย่างไร?
ซื้อแพ็กเกจเพิ่มเติมได้ที่ yah.mobi/app ได้ทันที

### 9. นโยบายการคืนเงินเป็นอย่างไร?
yah.mobile ไม่สามารถคืนเงินได้หลังจากส่ง QR Code แล้ว เนื่องจากเป็นสินค้าดิจิทัลที่ใช้ได้ทันที ยกเว้นกรณีที่ระบบของ yah.mobile เกิดข้อผิดพลาด

### 10. ติดต่อฝ่ายสนับสนุนได้อย่างไร?
ผ่านแชทนี้ 24/7 ใน 6 ภาษา หรือส่งแบบฟอร์มที่ yah.mobi/app`;

const TH_PRETAVEL_CHECKLIST = `# รายการตรวจสอบ eSIM ก่อนเดินทาง - เตรียมพร้อมก่อนออกเดินทาง (ภาษาไทย)

## คำสำคัญ: ก่อนเดินทาง, เตรียมตัว, checklist, รายการตรวจสอบ, ญี่ปุ่น

## 1 สัปดาห์ก่อนเดินทาง

- [ ] ตรวจสอบว่าโทรศัพท์รองรับ eSIM (ดู EID ใน iPhone หรือตัวเลือก "เพิ่ม eSIM" ใน Android)
- [ ] ตรวจสอบว่าโทรศัพท์ปลดล็อกแล้ว (ไม่ถูกล็อกกับผู้ให้บริการ)
- [ ] ซื้อ eSIM ที่ yah.mobi/app
- [ ] รับ QR Code ทางอีเมล (ตรวจสอบโฟลเดอร์สแปมด้วย)

## 1-2 วันก่อนเดินทาง

- [ ] ติดตั้ง eSIM ขณะอยู่บ้าน (ใช้ Wi-Fi ที่เสถียร)
- [ ] ตั้งชื่อ eSIM ว่า "yah.mobile Japan"
- [ ] ตรวจสอบว่า eSIM ปรากฏในการตั้งค่าบริการมือถือ
- [ ] อัปเดต iOS/Android เป็นเวอร์ชันล่าสุด

## วันเดินทาง (ที่สนามบิน)

- [ ] เปิด Data Roaming สำหรับ yah.mobile
- [ ] ปิด Data Roaming สำหรับ SIM หลัก (เพื่อหลีกเลี่ยงค่าใช้จ่ายเพิ่มเติม)
- [ ] เลือก yah.mobile เป็นสายข้อมูลหลัก
- [ ] ทดสอบการเชื่อมต่อโดยปิด Wi-Fi แล้วเปิดเบราว์เซอร์

## เมื่อมาถึงญี่ปุ่น

- [ ] หากไม่มีสัญญาณ: เปิด/ปิด Airplane Mode
- [ ] ตรวจสอบ APN ตั้งค่าเป็น "yah.mobile"
- [ ] หากยังมีปัญหา: ติดต่อฝ่ายสนับสนุนผ่านแชทนี้

## เคล็ดลับสำคัญ

- ติดตั้ง eSIM ก่อนเดินทาง ไม่ใช่ที่สนามบิน (Wi-Fi ที่สนามบินอาจไม่เสถียร)
- QR Code ใช้ได้เพียงครั้งเดียว เก็บอีเมลไว้ในกรณีฉุกเฉิน
- แบตเตอรี่โทรศัพท์ควรมีอย่างน้อย 50% ระหว่างติดตั้ง`;

const TH_DESTINATION_GUIDE = `# คู่มือการเชื่อมต่อในญี่ปุ่น - สำหรับนักเดินทางไทย

## คำสำคัญ: ญี่ปุ่น, เชื่อมต่อ, เครือข่าย, สัญญาณ, โรมมิ่ง, ไทย

## เกี่ยวกับเครือข่ายในญี่ปุ่น

yah.mobile ใช้เครือข่าย NTT DOCOMO, SoftBank และ au ซึ่งครอบคลุมทั่วประเทศญี่ปุ่น รวมถึงโตเกียว โอซาก้า เกียวโต ฮอกไกโด และโอกินาวา

## ทำไมต้องเปิด Data Roaming?

โทรศัพท์ของคุณจดทะเบียนในประเทศไทย เมื่อใช้ eSIM ญี่ปุ่น อุปกรณ์จะมองว่าเป็นการ "โรมมิ่ง" จึงต้องเปิด Data Roaming

**iPhone:** การตั้งค่า → บริการมือถือ → yah.mobile → เปิด Data Roaming
**Android:** การตั้งค่า → เครือข่าย → ซิม → yah.mobile → เปิด Data Roaming

## เลือกเครือข่ายด้วยตนเอง (หากมีปัญหา)

**iPhone:**
การตั้งค่า → บริการมือถือ → yah.mobile → เครือข่าย → ปิด "อัตโนมัติ" → เลือก NTT DOCOMO, SoftBank หรือ au

**Android:**
การตั้งค่า → เครือข่าย → ซิม → yah.mobile → ผู้ให้บริการ → ค้นหาและเลือกเครือข่าย

## พื้นที่ที่อาจมีสัญญาณอ่อน

- ใต้ดิน (แต่ส่วนใหญ่ของรถไฟใต้ดินในโตเกียวมีสัญญาณ)
- พื้นที่ชนบทห่างไกล
- อาคารคอนกรีตหนา

## เคล็ดลับการประหยัดแบตเตอรี่

- ปิด Wi-Fi เมื่อไม่ใช้งาน
- ปิด Background App Refresh
- ลด Brightness หน้าจอ`;

const TH_DEVICE_INSTALL = `# คู่มือติดตั้ง eSIM - iPhone 15/16 และ Samsung Galaxy (ภาษาไทย)

## คำสำคัญ: ติดตั้ง, iPhone 15, iPhone 16, Samsung, Galaxy, ขั้นตอน

## iPhone 15 / iPhone 16 Series

### ก่อนติดตั้ง
- ใช้ Wi-Fi ที่เสถียร
- แบตเตอรี่อย่างน้อย 50%
- iOS 17 ขึ้นไป (แนะนำเวอร์ชันล่าสุด)

### ขั้นตอนติดตั้ง
1. การตั้งค่า → บริการมือถือ → เพิ่ม eSIM
2. เลือก "ใช้ QR Code"
3. สแกน QR Code จากอีเมล
4. แตะ "เพิ่มแพ็กเกจมือถือ"
5. ตั้งชื่อ: "yah.mobile Japan"
6. เลือกการตั้งค่าสาย: "ค่าเริ่มต้น"
7. เปิด Data Roaming

### iPhone 15 Pro / 15 Pro Max
- รองรับ eSIM Dual SIM (ใช้ได้ 2 eSIM พร้อมกัน)
- ไม่มีถาดซิมจริง (eSIM only ในบางรุ่น)

### iPhone 16 Series
- รองรับ eSIM เหมือน iPhone 15
- ขั้นตอนเหมือนกันทุกประการ

---

## Samsung Galaxy S24 / S25 Series

### ก่อนติดตั้ง
- ใช้ Wi-Fi ที่เสถียร
- One UI 6.0 ขึ้นไป

### ขั้นตอนติดตั้ง
1. การตั้งค่า → การเชื่อมต่อ → ตัวจัดการซิม
2. แตะ "เพิ่มซิมมือถือ"
3. เลือก "สแกน QR Code จากผู้ให้บริการ"
4. สแกน QR Code จากอีเมล
5. ทำตามคำแนะนำบนหน้าจอ
6. เปิด Data Roaming

### หลังติดตั้ง
- ตรวจสอบว่า yah.mobile เป็นสายข้อมูลหลัก
- การตั้งค่า → การเชื่อมต่อ → ตัวจัดการซิม → ข้อมูลมือถือ → เลือก yah.mobile`;

const TH_OONAS = `# หลักการ OONAS - การบริการด้วยใจ (ภาษาไทย)

## คำสำคัญ: OONAS, บริการ, ความพึงพอใจ, ลูกค้า, ประสบการณ์

yah.mobile ให้บริการตามหลักการ OONAS ซึ่งเป็นปรัชญาการบริการระดับโลก

## O - Only (เฉพาะคุณเท่านั้น)
เราปฏิบัติต่อลูกค้าแต่ละคนเป็นรายบุคคล ไม่ใช่ตอบแบบสำเร็จรูป
ตัวอย่าง: "คุณใช้ iPhone 15 Pro ที่ซื้อในไทย ขั้นตอนสำหรับคุณโดยเฉพาะคือ..."

## O - Option (ทางเลือกเพิ่มเติม)
เราไม่หยุดแค่ตอบคำถาม แต่เสนอทางเลือกที่ดีกว่า
ตัวอย่าง: "นอกจากวิธีนี้แล้ว คุณยังสามารถ..."

## N - Nature (เป็นธรรมชาติ)
การสื่อสารที่อบอุ่น เป็นมิตร ไม่เป็นทางการเกินไป
เราพูดเหมือนเพื่อนที่รู้เรื่องเทคโนโลยี ไม่ใช่คู่มือ

## A - Amazing (น่าประทับใจ)
ทำให้ดีกว่าที่คาดหวัง ใส่ใจในรายละเอียด
ตัวอย่าง: แจ้งเตือนล่วงหน้าเมื่อข้อมูลใกล้หมด

## S - Share (แบ่งปัน)
แบ่งปันข้อมูลที่เป็นประโยชน์แม้ลูกค้าไม่ได้ถาม
ตัวอย่าง: "อีกอย่างที่อาจเป็นประโยชน์สำหรับการเดินทางของคุณคือ..."`;

const TH_REFUND_DETAILED = `# นโยบายการคืนเงิน - รายละเอียดครบถ้วน (ภาษาไทย)

## คำสำคัญ: คืนเงิน, refund, ยกเลิก, นโยบาย, ไม่สามารถคืนได้

## นโยบายพื้นฐาน

yah.mobile **ไม่สามารถคืนเงินได้** หลังจากส่ง QR Code ให้ลูกค้าแล้ว

### เหตุผล
- eSIM เป็นสินค้าดิจิทัลที่ส่งมอบทันที
- QR Code ถูกสร้างขึ้นเฉพาะสำหรับอุปกรณ์ของคุณ
- ไม่สามารถ "คืน" ข้อมูลดิจิทัลได้เหมือนสินค้าจริง
- ระบุไว้ชัดเจนก่อนการซื้อ และลูกค้ายืนยันด้วยการคลิก checkbox

### ฐานทางกฎหมาย
ตามพระราชบัญญัติธุรกรรมทางการค้าเฉพาะของญี่ปุ่น มาตรา 15-3 สินค้าดิจิทัลที่ส่งมอบทันทีได้รับการยกเว้นจากสิทธิ์การยกเลิก 8 วัน

## กรณีที่อาจได้รับการพิจารณาคืนเงิน

### 1. ระบบของ yah.mobile เกิดข้อผิดพลาด
หาก QR Code ไม่ทำงานเนื่องจากปัญหาของ yah.mobile (ไม่ใช่ปัญหาของอุปกรณ์) เราจะแก้ไขหรือพิจารณาคืนเงิน

### 2. ชำระเงินซ้ำ
หากถูกเรียกเก็บเงินสองครั้งสำหรับคำสั่งซื้อเดียว กรุณาติดต่อฝ่ายสนับสนุนพร้อมหลักฐาน

## สิ่งที่ไม่สามารถคืนเงินได้

- ติดตั้ง eSIM สำเร็จแต่ไม่ได้ใช้งาน
- ลืมเปิด Data Roaming
- โทรศัพท์ไม่รองรับ eSIM (ควรตรวจสอบก่อนซื้อ)
- เปลี่ยนใจหลังซื้อ
- ต้องการเปลี่ยนแพ็กเกจ

## วิธีติดต่อสำหรับปัญหาการชำระเงิน

ส่งแบบฟอร์มที่ yah.mobi/app พร้อมแนบ:
- หมายเลขคำสั่งซื้อ
- หลักฐานการชำระเงิน
- คำอธิบายปัญหา`;

// ============================================================
// VIETNAMESE DOCUMENTS
// ============================================================

const VI_APN_IPHONE = `# Hướng dẫn cài đặt APN - iPhone | eSIM không kết nối được - Cách khắc phục

## Từ khóa: APN, cài đặt, không kết nối, không có tín hiệu, iPhone, iOS, yah.mobile

## Vấn đề: Đã cài eSIM nhưng internet không hoạt động (iPhone)

### Bước 1: Kiểm tra eSIM đã được bật
Cài đặt → Dịch vụ di động → Kiểm tra công tắc yah.mobile đang BẬT (màu xanh)
Nếu thấy "Không có dịch vụ" hoặc "Chỉ SOS", dòng có thể bị tắt

### Bước 2: Bật Data Roaming
Cài đặt → Dịch vụ di động → Nhấn vào yah.mobile → Bật "Data Roaming"
QUAN TRỌNG: Phải bật Data Roaming để eSIM quốc tế hoạt động tại Nhật Bản

### Bước 3: Cài đặt APN
Cài đặt → Dịch vụ di động → Nhấn vào yah.mobile → Mạng dữ liệu di động
Đặt APN là: yah.mobile
Để trống Tên người dùng và Mật khẩu

### Bước 4: Đặt làm dòng dữ liệu chính
Cài đặt → Dịch vụ di động → Dữ liệu di động → Chọn yah.mobile
Để đảm bảo thiết bị dùng eSIM cho internet, không phải SIM vật lý

### Bước 5: Bật/tắt Chế độ máy bay
Bật Chế độ máy bay trong 10 giây, sau đó tắt
Cách này buộc thiết bị đăng ký lại với mạng

### Bước 6: Kiểm tra cài đặt nhà mạng
Cài đặt → Cài đặt chung → Giới thiệu
Nếu có bản cập nhật cài đặt nhà mạng, sẽ có thông báo. Nhấn "Cập nhật"

### Bước 7: Khởi động lại thiết bị
Tắt hoàn toàn, chờ 30 giây, bật lại

### Bước 8: Đặt lại cài đặt mạng (Phương án cuối)
Cài đặt → Cài đặt chung → Chuyển hoặc đặt lại iPhone → Đặt lại → Đặt lại cài đặt mạng
CẢNH BÁO: Sẽ xóa mật khẩu Wi-Fi đã lưu

### Vẫn không hoạt động sau tất cả các bước?
Vui lòng liên hệ hỗ trợ yah.mobile qua chat này với thông tin:
- Model iPhone và phiên bản iOS
- Các bước đã thử
- Ảnh chụp màn hình cài đặt dịch vụ di động`;

const VI_APN_ANDROID = `# Hướng dẫn cài đặt APN - Android | eSIM không kết nối được - Cách khắc phục

## Từ khóa: APN, cài đặt, không kết nối, Android, Samsung, Google Pixel, yah.mobile

## Vấn đề: Đã cài eSIM nhưng internet không hoạt động (Android)

### Bước 1: Kiểm tra eSIM đã được bật
Cài đặt → Mạng và Internet → SIM → Kiểm tra yah.mobile đang BẬT
Nếu tắt, nhấn để bật

### Bước 2: Bật Data Roaming
Cài đặt → Mạng và Internet → SIM → yah.mobile → Bật "Data Roaming"
QUAN TRỌNG: Phải bật Data Roaming để eSIM quốc tế hoạt động tại Nhật Bản

### Bước 3: Cài đặt APN
Cài đặt → Mạng và Internet → SIM → yah.mobile → Tên điểm truy cập (APN)
Nhấn "Thêm APN" hoặc chỉnh sửa APN hiện có:
- Tên: yah.mobile
- APN: yah.mobile
- Để trống các trường còn lại
Lưu và chọn APN này

### Bước 4: Đặt làm dòng dữ liệu chính
Cài đặt → Mạng và Internet → SIM → SIM ưa thích cho dữ liệu → Chọn yah.mobile

### Bước 5: Bật/tắt Chế độ máy bay
Bật Chế độ máy bay trong 10 giây, sau đó tắt

### Bước 6: Khởi động lại thiết bị
Tắt hoàn toàn, chờ 30 giây, bật lại

### Samsung Galaxy - Bước bổ sung
Cài đặt → Quản lý chung → Đặt lại → Đặt lại cài đặt mạng
Sau đó cài đặt lại APN theo Bước 3

### Vẫn không hoạt động?
Vui lòng liên hệ hỗ trợ yah.mobile qua chat này với:
- Model Android và phiên bản OS
- Các bước đã thử`;

const VI_SERVICE_OVERVIEW = `# yah.mobile là gì? - Tổng quan dịch vụ (Tiếng Việt)

## Từ khóa: yah.mobile, eSIM, Nhật Bản, dịch vụ, du khách, giá, gói cước

## yah.mobile là gì?

yah.mobile là dịch vụ eSIM dữ liệu dành riêng cho Nhật Bản, được thiết kế cho du khách quốc tế đến thăm Nhật Bản.

### Điểm nổi bật của yah.mobile
- **Giá mỗi GB thấp nhất** trong ngành eSIM Nhật Bản
- **Không có phí hàng tháng** — chỉ trả cho những gì bạn dùng
- **Cài đặt dễ dàng** — chỉ cần quét mã QR là sẵn sàng sử dụng
- **Hỗ trợ 6 ngôn ngữ** — Nhật, Anh, Trung, Hàn, Thái, Việt
- **Hỗ trợ 24/7** qua chat này

### eSIM là gì?
eSIM là SIM kỹ thuật số được tích hợp trong điện thoại. Không cần thẻ SIM vật lý — chỉ cần quét mã QR để cài đặt gói cước.

### Mạng sử dụng tại Nhật Bản
yah.mobile sử dụng mạng NTT DOCOMO, SoftBank và au — phủ sóng toàn quốc Nhật Bản.

### Điện thoại tương thích
- **iPhone:** XS trở lên (iOS 14+)
- **Android:** Samsung Galaxy S20+, Google Pixel 3+, và các dòng khác hỗ trợ eSIM

### Cách kiểm tra điện thoại có hỗ trợ eSIM không
**iPhone:** Cài đặt → Cài đặt chung → Giới thiệu → Tìm số EID
**Android:** Cài đặt → Mạng và Internet → SIM → Tìm tùy chọn "Thêm eSIM"

### Có cần mở khóa điện thoại không?
Có. Nếu điện thoại bị khóa nhà mạng, cần mở khóa trước. Liên hệ nhà mạng gốc của bạn.

### Mua ở đâu?
Mua tại website yah.mobile (yah.mobi/app) — thanh toán trực tuyến ngay lập tức.`;

const VI_PURCHASE_GUIDE = `# Hướng dẫn mua và kích hoạt eSIM - Các bước đầy đủ (Tiếng Việt)

## Từ khóa: mua, cài đặt, kích hoạt, mã QR, các bước, cách thực hiện

## Bước 1: Mua eSIM

1. Truy cập yah.mobi/app
2. Chọn gói cước phù hợp với chuyến đi
3. Nhập email và hoàn tất thanh toán
4. Nhận mã QR qua email trong vài phút

**Quan trọng:** Kiểm tra cả thư mục spam

## Bước 2: Cài đặt trên iPhone

Sử dụng **kết nối Wi-Fi ổn định** trong suốt quá trình. Không dùng dữ liệu di động.

1. Cài đặt → Dịch vụ di động → Thêm eSIM
2. Chọn "Sử dụng mã QR"
3. Quét mã QR từ email
4. Nhấn "Thêm gói di động"
5. Đặt tên (ví dụ: "yah.mobile Japan")
6. Chọn "Mặc định" cho cài đặt dòng
7. Bật **Data Roaming**

**Mã QR chỉ dùng được một lần.** Nếu cài đặt bị gián đoạn, liên hệ hỗ trợ để nhận mã QR mới.

## Bước 3: Cài đặt trên Android

1. Cài đặt → Mạng và Internet → SIM → Thêm SIM
2. Chọn "Quét mã QR"
3. Quét mã QR từ email
4. Làm theo hướng dẫn trên màn hình
5. Bật **Data Roaming**

## Bước 4: Kích hoạt

Gói cước bắt đầu **khi bạn sử dụng dữ liệu lần đầu** — không phải khi cài đặt eSIM.
Khuyến nghị: Cài đặt trước chuyến đi, kích hoạt khi đến Nhật Bản.

## Bước 5: Kiểm tra kết nối

1. Tắt Wi-Fi
2. Mở trình duyệt và truy cập bất kỳ website nào
3. Nếu kết nối được, eSIM đang hoạt động bình thường

## Câu hỏi thường gặp

**Hỏi: Không nhận được email mã QR**
Đáp: Kiểm tra thư mục spam. Nếu vẫn không thấy, liên hệ hỗ trợ.

**Hỏi: Không quét được mã QR**
Đáp: Thử phóng to ảnh mã QR hoặc hiển thị trên thiết bị khác.

**Hỏi: Đã cài nhưng không có tín hiệu**
Đáp: Kiểm tra Data Roaming đã bật và chọn yah.mobile làm dòng dữ liệu chính.`;

const VI_FAQ_TOP10 = `# Câu hỏi thường gặp Top 10 - yah.mobile (Tiếng Việt)

## Từ khóa: FAQ, câu hỏi, vấn đề, hỗ trợ, giúp đỡ

### 1. eSIM là gì và khác SIM thường như thế nào?
eSIM là SIM kỹ thuật số tích hợp trong điện thoại. Không cần thẻ vật lý — cài đặt ngay bằng mã QR, không cần chờ nhận SIM qua bưu điện.

### 2. Điện thoại tôi có hỗ trợ eSIM không?
**iPhone:** XS trở lên — kiểm tra tại Cài đặt → Cài đặt chung → Giới thiệu → tìm số EID
**Android:** Samsung S20+, Pixel 3+, và các dòng khác — kiểm tra tại Cài đặt → Mạng → SIM

### 3. Có cần mở khóa điện thoại không?
Có. Nếu điện thoại bị khóa nhà mạng, cần mở khóa trước. Liên hệ nhà mạng gốc của bạn.

### 4. Gói cước bắt đầu khi nào?
Bắt đầu khi bạn **sử dụng dữ liệu lần đầu** — không phải khi cài đặt eSIM.

### 5. Tại sao phải bật Data Roaming?
yah.mobile là eSIM nội địa Nhật Bản. Điện thoại xem đây là mạng "roaming" nên phải bật Data Roaming.

### 6. Đã cài eSIM nhưng không có tín hiệu, làm gì?
1. Bật/tắt Chế độ máy bay
2. Kiểm tra Data Roaming đã bật
3. Cài đặt APN là "yah.mobile"
4. Chọn yah.mobile làm dòng dữ liệu chính
5. Khởi động lại điện thoại

### 7. Mã QR dùng được mấy lần?
**Chỉ một lần.** Nếu cài đặt bị gián đoạn, liên hệ hỗ trợ để nhận mã QR mới.

### 8. Hết dữ liệu thì làm gì?
Mua thêm gói tại yah.mobi/app ngay lập tức.

### 9. Chính sách hoàn tiền như thế nào?
yah.mobile không hoàn tiền sau khi gửi mã QR vì đây là sản phẩm kỹ thuật số giao ngay. Ngoại lệ: lỗi hệ thống của yah.mobile hoặc thanh toán trùng lặp.

### 10. Liên hệ hỗ trợ bằng cách nào?
Qua chat này 24/7 bằng 6 ngôn ngữ, hoặc gửi form tại yah.mobi/app.`;

const VI_PRETAVEL_CHECKLIST = `# Danh sách kiểm tra eSIM trước chuyến đi - Chuẩn bị trước khi khởi hành (Tiếng Việt)

## Từ khóa: trước chuyến đi, chuẩn bị, checklist, danh sách, Nhật Bản

## 1 tuần trước chuyến đi

- [ ] Kiểm tra điện thoại hỗ trợ eSIM (tìm EID trên iPhone hoặc tùy chọn "Thêm eSIM" trên Android)
- [ ] Kiểm tra điện thoại đã mở khóa (không bị khóa nhà mạng)
- [ ] Mua eSIM tại yah.mobi/app
- [ ] Nhận mã QR qua email (kiểm tra cả thư mục spam)

## 1-2 ngày trước chuyến đi

- [ ] Cài đặt eSIM khi ở nhà (dùng Wi-Fi ổn định)
- [ ] Đặt tên eSIM là "yah.mobile Japan"
- [ ] Kiểm tra eSIM xuất hiện trong cài đặt dịch vụ di động
- [ ] Cập nhật iOS/Android lên phiên bản mới nhất

## Ngày khởi hành (tại sân bay)

- [ ] Bật Data Roaming cho yah.mobile
- [ ] Tắt Data Roaming cho SIM chính (tránh phí từ nhà mạng gốc)
- [ ] Chọn yah.mobile làm dòng dữ liệu chính
- [ ] Kiểm tra kết nối bằng cách tắt Wi-Fi và mở trình duyệt

## Khi đến Nhật Bản

- [ ] Nếu không có tín hiệu: bật/tắt Chế độ máy bay
- [ ] Kiểm tra APN cài đặt là "yah.mobile"
- [ ] Nếu vẫn có vấn đề: liên hệ hỗ trợ qua chat này

## Mẹo quan trọng

- Cài đặt eSIM trước khi đi, không phải tại sân bay (Wi-Fi sân bay có thể không ổn định)
- Mã QR chỉ dùng được một lần — giữ email phòng trường hợp khẩn cấp
- Pin điện thoại nên ít nhất 50% khi cài đặt`;

const VI_DESTINATION_GUIDE = `# Hướng dẫn kết nối tại Nhật Bản - Dành cho du khách Việt Nam

## Từ khóa: Nhật Bản, kết nối, mạng, tín hiệu, roaming, Việt Nam

## Về mạng di động tại Nhật Bản

yah.mobile sử dụng mạng NTT DOCOMO, SoftBank và au — phủ sóng toàn quốc Nhật Bản, bao gồm Tokyo, Osaka, Kyoto, Hokkaido và Okinawa.

## Tại sao phải bật Data Roaming?

Điện thoại của bạn đăng ký tại Việt Nam. Khi dùng eSIM Nhật Bản, thiết bị xem đây là "roaming" nên phải bật Data Roaming.

**iPhone:** Cài đặt → Dịch vụ di động → yah.mobile → Bật Data Roaming
**Android:** Cài đặt → Mạng → SIM → yah.mobile → Bật Data Roaming

## Chọn mạng thủ công (nếu có vấn đề)

**iPhone:**
Cài đặt → Dịch vụ di động → yah.mobile → Mạng → Tắt "Tự động" → Chọn NTT DOCOMO, SoftBank hoặc au

**Android:**
Cài đặt → Mạng → SIM → yah.mobile → Nhà mạng → Tìm kiếm và chọn mạng

## Khu vực có thể có tín hiệu yếu

- Dưới lòng đất (nhưng hầu hết tàu điện ngầm Tokyo có tín hiệu)
- Vùng nông thôn xa xôi
- Tòa nhà bê tông dày

## Mẹo tiết kiệm pin

- Tắt Wi-Fi khi không dùng
- Tắt Background App Refresh
- Giảm độ sáng màn hình`;

const VI_DEVICE_INSTALL = `# Hướng dẫn cài đặt eSIM - iPhone 15/16 và Samsung Galaxy (Tiếng Việt)

## Từ khóa: cài đặt, iPhone 15, iPhone 16, Samsung, Galaxy, các bước

## iPhone 15 / iPhone 16 Series

### Trước khi cài đặt
- Dùng Wi-Fi ổn định
- Pin ít nhất 50%
- iOS 17 trở lên (khuyến nghị phiên bản mới nhất)

### Các bước cài đặt
1. Cài đặt → Dịch vụ di động → Thêm eSIM
2. Chọn "Sử dụng mã QR"
3. Quét mã QR từ email
4. Nhấn "Thêm gói di động"
5. Đặt tên: "yah.mobile Japan"
6. Chọn cài đặt dòng: "Mặc định"
7. Bật Data Roaming

### iPhone 15 Pro / 15 Pro Max
- Hỗ trợ Dual SIM eSIM (dùng 2 eSIM cùng lúc)
- Không có khay SIM vật lý (một số model chỉ dùng eSIM)

### iPhone 16 Series
- Hỗ trợ eSIM giống iPhone 15
- Các bước hoàn toàn giống nhau

---

## Samsung Galaxy S24 / S25 Series

### Trước khi cài đặt
- Dùng Wi-Fi ổn định
- One UI 6.0 trở lên

### Các bước cài đặt
1. Cài đặt → Kết nối → Trình quản lý SIM
2. Nhấn "Thêm SIM di động"
3. Chọn "Quét mã QR từ nhà cung cấp"
4. Quét mã QR từ email
5. Làm theo hướng dẫn trên màn hình
6. Bật Data Roaming

### Sau khi cài đặt
- Kiểm tra yah.mobile là dòng dữ liệu chính
- Cài đặt → Kết nối → Trình quản lý SIM → Dữ liệu di động → Chọn yah.mobile`;

const VI_OONAS = `# Nguyên tắc OONAS - Dịch vụ tận tâm (Tiếng Việt)

## Từ khóa: OONAS, dịch vụ, hài lòng, khách hàng, trải nghiệm

yah.mobile phục vụ theo nguyên tắc OONAS — triết lý dịch vụ đẳng cấp thế giới.

## O - Only (Chỉ dành cho bạn)
Chúng tôi đối xử với từng khách hàng như một cá nhân, không trả lời theo khuôn mẫu.
Ví dụ: "Bạn đang dùng iPhone 15 Pro mua tại Việt Nam, các bước dành riêng cho bạn là..."

## O - Option (Lựa chọn thêm)
Chúng tôi không chỉ trả lời câu hỏi mà còn đề xuất giải pháp tốt hơn.
Ví dụ: "Ngoài cách này, bạn cũng có thể..."

## N - Nature (Tự nhiên)
Giao tiếp ấm áp, thân thiện, không quá trang trọng.
Chúng tôi nói chuyện như người bạn am hiểu công nghệ, không phải sách hướng dẫn.

## A - Amazing (Ấn tượng)
Làm tốt hơn kỳ vọng, chú ý đến từng chi tiết.
Ví dụ: Thông báo trước khi dữ liệu sắp hết.

## S - Share (Chia sẻ)
Chia sẻ thông tin hữu ích ngay cả khi khách hàng không hỏi.
Ví dụ: "Thêm một điều có thể hữu ích cho chuyến đi của bạn là..."`;

const VI_REFUND_DETAILED = `# Chính sách hoàn tiền - Chi tiết đầy đủ (Tiếng Việt)

## Từ khóa: hoàn tiền, refund, hủy, chính sách, không thể hoàn tiền

## Chính sách cơ bản

yah.mobile **không thể hoàn tiền** sau khi đã gửi mã QR cho khách hàng.

### Lý do
- eSIM là sản phẩm kỹ thuật số được giao ngay lập tức
- Mã QR được tạo riêng cho thiết bị của bạn
- Không thể "trả lại" dữ liệu kỹ thuật số như hàng hóa vật lý
- Được nêu rõ trước khi mua, khách hàng xác nhận bằng cách tích vào ô checkbox

### Cơ sở pháp lý
Theo Luật Giao dịch Thương mại Đặc biệt của Nhật Bản, Điều 15-3, sản phẩm kỹ thuật số giao ngay được miễn quyền hủy 8 ngày.

## Trường hợp có thể được xem xét hoàn tiền

### 1. Lỗi hệ thống của yah.mobile
Nếu mã QR không hoạt động do lỗi của yah.mobile (không phải lỗi thiết bị), chúng tôi sẽ khắc phục hoặc xem xét hoàn tiền.

### 2. Thanh toán trùng lặp
Nếu bị tính tiền hai lần cho một đơn hàng, vui lòng liên hệ hỗ trợ kèm bằng chứng.

## Những gì không thể hoàn tiền

- Đã cài eSIM thành công nhưng không sử dụng
- Quên bật Data Roaming
- Điện thoại không hỗ trợ eSIM (nên kiểm tra trước khi mua)
- Đổi ý sau khi mua
- Muốn đổi gói cước

## Cách liên hệ cho vấn đề thanh toán

Gửi form tại yah.mobi/app kèm theo:
- Mã đơn hàng
- Bằng chứng thanh toán
- Mô tả vấn đề`;

// ============================================================
// MAIN
// ============================================================

const NEW_DOCS = [
  // Thai documents
  { title: 'คู่มือตั้งค่า APN - iPhone (ภาษาไทย) | eSIM ไม่เชื่อมต่อ วิธีแก้ไข', content: TH_APN_IPHONE },
  { title: 'คู่มือตั้งค่า APN - Android (ภาษาไทย) | eSIM ไม่เชื่อมต่อ วิธีแก้ไข', content: TH_APN_ANDROID },
  { title: 'yah.mobile คืออะไร? - ภาพรวมบริการ (ภาษาไทย)', content: TH_SERVICE_OVERVIEW },
  { title: 'คู่มือซื้อและเปิดใช้งาน eSIM - ขั้นตอนครบถ้วน (ภาษาไทย)', content: TH_PURCHASE_GUIDE },
  { title: 'คำถามที่พบบ่อย Top 10 - yah.mobile (ภาษาไทย)', content: TH_FAQ_TOP10 },
  { title: 'รายการตรวจสอบ eSIM ก่อนเดินทาง (ภาษาไทย)', content: TH_PRETAVEL_CHECKLIST },
  { title: 'คู่มือการเชื่อมต่อในญี่ปุ่น - สำหรับนักเดินทางไทย', content: TH_DESTINATION_GUIDE },
  { title: 'คู่มือติดตั้ง eSIM - iPhone 15/16 และ Samsung Galaxy (ภาษาไทย)', content: TH_DEVICE_INSTALL },
  { title: 'หลักการ OONAS - การบริการด้วยใจ (ภาษาไทย)', content: TH_OONAS },
  { title: 'นโยบายการคืนเงิน - รายละเอียดครบถ้วน (ภาษาไทย)', content: TH_REFUND_DETAILED },
  // Vietnamese documents
  { title: 'Hướng dẫn cài đặt APN - iPhone (Tiếng Việt) | eSIM không kết nối - Cách khắc phục', content: VI_APN_IPHONE },
  { title: 'Hướng dẫn cài đặt APN - Android (Tiếng Việt) | eSIM không kết nối - Cách khắc phục', content: VI_APN_ANDROID },
  { title: 'yah.mobile là gì? - Tổng quan dịch vụ (Tiếng Việt)', content: VI_SERVICE_OVERVIEW },
  { title: 'Hướng dẫn mua và kích hoạt eSIM - Các bước đầy đủ (Tiếng Việt)', content: VI_PURCHASE_GUIDE },
  { title: 'Câu hỏi thường gặp Top 10 - yah.mobile (Tiếng Việt)', content: VI_FAQ_TOP10 },
  { title: 'Danh sách kiểm tra eSIM trước chuyến đi (Tiếng Việt)', content: VI_PRETAVEL_CHECKLIST },
  { title: 'Hướng dẫn kết nối tại Nhật Bản - Dành cho du khách Việt Nam', content: VI_DESTINATION_GUIDE },
  { title: 'Hướng dẫn cài đặt eSIM - iPhone 15/16 và Samsung Galaxy (Tiếng Việt)', content: VI_DEVICE_INSTALL },
  { title: 'Nguyên tắc OONAS - Dịch vụ tận tâm (Tiếng Việt)', content: VI_OONAS },
  { title: 'Chính sách hoàn tiền - Chi tiết đầy đủ (Tiếng Việt)', content: VI_REFUND_DETAILED },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log(`Inserting ${NEW_DOCS.length} new Thai/Vietnamese RAG documents...`);
    
    for (const doc of NEW_DOCS) {
      await conn.execute(
        'INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, NULL, NOW())',
        [doc.title, doc.content]
      );
      console.log(`✓ Inserted: ${doc.title.substring(0, 60)}...`);
    }
    
    // Verify
    const [rows] = await conn.execute(
      `SELECT COUNT(*) as total FROM rag_documents`
    );
    console.log(`\n✅ Done! Total RAG documents: ${rows[0].total}`);
    
    // Show Thai/Vietnamese count
    const [thRows] = await conn.execute(
      `SELECT COUNT(*) as count FROM rag_documents WHERE title LIKE '%ภาษาไทย%' OR title LIKE '%ไทย%' OR title LIKE '%Thai%'`
    );
    const [viRows] = await conn.execute(
      `SELECT COUNT(*) as count FROM rag_documents WHERE title LIKE '%Tiếng Việt%' OR title LIKE '%Việt%' OR title LIKE '%Vietnamese%'`
    );
    console.log(`Thai documents: ${thRows[0].count}`);
    console.log(`Vietnamese documents: ${viRows[0].count}`);
    
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
