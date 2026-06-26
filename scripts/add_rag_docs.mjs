/**
 * Add new RAG documents to improve AI response quality.
 * 
 * Adds 3 types of documents in 6 languages:
 * 1. eSIM Installation Step-by-Step Guide (iPhone/Android + APN + troubleshooting)
 * 2. Pricing Plans Detail
 * 3. Refund & Cancellation Policy (detailed)
 */
import "dotenv/config";
import { createPool } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!OPENAI_API_KEY) { console.error("OPENAI_API_KEY not set"); process.exit(1); }

const pool = createPool(DATABASE_URL);

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

// ── Document Definitions ──────────────────────────────────────────────────────

const DOCS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. eSIM Installation Step-by-Step Guide
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "eSIMインストール完全ガイド（日本語）",
    content: `# eSIMインストール完全ガイド

## iPhone でのインストール手順（ステップバイステップ）

### 準備
- 安定したWi-Fi環境が必要です
- iPhone XS以降のeSIM対応端末であること
- SIMロックが解除されていること

### 手順
1. 「設定」アプリを開く
2. 「モバイル通信」をタップ
3. 「モバイル通信プランを追加」をタップ
4. 購入メールに記載のQRコードをカメラでスキャン
5. 「モバイル通信プランを追加」をタップして確認
6. プラン名を「yah.mobile Japan」に設定（任意）
7. 「モバイルデータ通信」でyah.mobileを選択
8. 「データローミング」をオンに設定

### QRコードが読み取れない場合
- メールに記載の「SM-DP+アドレス」と「アクティベーションコード」を手動入力
- 「設定」→「モバイル通信」→「モバイル通信プランを追加」→「詳細情報を手動で入力」

## Android でのインストール手順

### 手順
1. 「設定」→「ネットワークとインターネット」→「SIM」
2. 「SIMを追加」をタップ
3. 「QRコードをスキャン」を選択
4. 購入メールのQRコードを読み取る
5. 画面の案内に従ってインストール完了
6. 「データローミング」をオンに設定
7. 「モバイルデータ」でyah.mobileを選択

### Samsung Galaxy の場合
1. 「設定」→「接続」→「SIMマネージャー」
2. 「eSIMを追加」をタップ
3. QRコードをスキャン

## APN設定（通常は不要）

通常、yah.mobileのeSIMはAPN設定が自動で行われます。手動設定が必要な場合：

### iPhone APN設定
1. 「設定」→「モバイル通信」→yah.mobileのプラン
2. 「モバイルデータ通信ネットワーク」をタップ
3. APN: internet
4. その他の項目は空欄のまま

### Android APN設定
1. 「設定」→「ネットワークとインターネット」→「SIM」→yah.mobile
2. 「アクセスポイント名」をタップ
3. 右上の「+」で新規追加
4. 名前: yah.mobile / APN: internet
5. 保存して選択

## インストール後に「設定に表示されない」場合

### iPhone
1. 「設定」→「モバイル通信」を確認 — プランが表示されない場合は端末を再起動
2. 再起動後も表示されない場合 → QRコードの再スキャンが必要（サポートに連絡）
3. iOS 17以降：「設定」→「一般」→「ソフトウェア・アップデート」で最新版に更新

### Android
1. 「設定」→「ネットワークとインターネット」→「SIM」を確認
2. 表示されない場合 → 端末を再起動
3. 再起動後も表示されない場合 → 「設定」→「システム」→「リセット」→「ネットワーク設定をリセット」

## 接続できない場合のトラブルシューティング

### ステップ1：機内モードのオン/オフ
機内モードを10秒間オンにして、オフにする。

### ステップ2：データローミングの確認
「設定」→「モバイル通信」→yah.mobileのプラン→「データローミング」がオンか確認。

### ステップ3：モバイルデータ通信の確認
「設定」→「モバイル通信」→「モバイルデータ通信」でyah.mobileが選択されているか確認。

### ステップ4：ネットワーク手動選択
「設定」→「モバイル通信」→yah.mobile→「ネットワーク選択」→「自動」をオフ→NTT DOCOMO / SoftBank / KDDI のいずれかを選択。

### ステップ5：4G/LTEに切り替え
「設定」→「モバイル通信」→yah.mobile→「音声通話とデータ」→「4G」を選択。

### ステップ6：端末の再起動
完全にシャットダウンし、30秒後に再起動。

### ステップ7：ネットワーク設定のリセット（最終手段）
「設定」→「一般」→「転送またはiPhoneをリセット」→「リセット」→「ネットワーク設定をリセット」
※保存済みWi-Fiパスワードが削除されます。

## キャリア設定の更新
「設定」→「一般」→「情報」を開くと、キャリア設定の更新が利用可能な場合にポップアップが表示されます。「アップデート」をタップしてください。`,
  },
  {
    title: "eSIM Installation Complete Guide (English)",
    content: `# eSIM Installation Complete Guide

## iPhone Installation (Step-by-Step)

### Before You Start
- You need a stable Wi-Fi connection
- iPhone XS or later with eSIM support
- Your phone must be SIM-unlocked

### Steps
1. Open "Settings"
2. Tap "Cellular" (or "Mobile Data")
3. Tap "Add Cellular Plan" (or "Add eSIM")
4. Scan the QR code from your purchase email
5. Tap "Add Cellular Plan" to confirm
6. Set the plan label to "yah.mobile Japan" (optional)
7. Under "Cellular Data", select yah.mobile
8. Turn ON "Data Roaming"

### If QR Code Won't Scan
- Use the "SM-DP+ Address" and "Activation Code" from your email
- Go to Settings → Cellular → Add Cellular Plan → "Enter Details Manually"

## Android Installation (Step-by-Step)

### Steps
1. Go to Settings → Network & Internet → SIMs
2. Tap "Add SIM" or "Download SIM"
3. Select "Scan QR code"
4. Scan the QR code from your purchase email
5. Follow on-screen instructions to complete
6. Turn ON "Data Roaming"
7. Select yah.mobile for "Mobile Data"

### Samsung Galaxy
1. Settings → Connections → SIM Manager
2. Tap "Add eSIM"
3. Scan QR code

## APN Settings (Usually Not Required)

yah.mobile eSIM auto-configures APN. If manual setup is needed:

### iPhone APN
1. Settings → Cellular → yah.mobile plan
2. Tap "Cellular Data Network"
3. APN: internet
4. Leave other fields blank

### Android APN
1. Settings → Network & Internet → SIMs → yah.mobile
2. Tap "Access Point Names"
3. Tap "+" to add new
4. Name: yah.mobile / APN: internet
5. Save and select

## "Not Showing in Settings" After Installation

### iPhone
1. Check Settings → Cellular — if plan not listed, restart your phone
2. If still not showing after restart → contact support for QR code reissue
3. iOS 17+: Update to latest version via Settings → General → Software Update

### Android
1. Check Settings → Network & Internet → SIMs
2. If not showing → restart your phone
3. If still not showing → Settings → System → Reset → Reset Network Settings

## Troubleshooting: Can't Connect to Internet

### Step 1: Toggle Airplane Mode
Turn Airplane Mode ON for 10 seconds, then OFF.

### Step 2: Check Data Roaming
Settings → Cellular → yah.mobile plan → ensure "Data Roaming" is ON.

### Step 3: Check Mobile Data Selection
Settings → Cellular → "Cellular Data" → ensure yah.mobile is selected.

### Step 4: Manual Network Selection
Settings → Cellular → yah.mobile → Network Selection → Turn OFF "Automatic" → Select NTT DOCOMO, SoftBank, or KDDI.

### Step 5: Switch to 4G/LTE
Settings → Cellular → yah.mobile → Voice & Data → Select "4G" or "LTE".

### Step 6: Restart Device
Fully shut down, wait 30 seconds, then restart.

### Step 7: Reset Network Settings (Last Resort)
Settings → General → Transfer or Reset → Reset → Reset Network Settings
Note: This will delete saved Wi-Fi passwords.

## Carrier Settings Update
Go to Settings → General → About. If a carrier update is available, a popup will appear. Tap "Update".`,
  },
  {
    title: "eSIM 安装完整指南（中文）",
    content: `# eSIM 安装完整指南

## iPhone 安装步骤

### 准备工作
- 需要稳定的 Wi-Fi 连接
- iPhone XS 或更新机型（支持 eSIM）
- 手机必须已解锁

### 步骤
1. 打开"设置"
2. 点击"蜂窝网络"
3. 点击"添加蜂窝号码方案"
4. 扫描购买邮件中的 QR 码
5. 点击"添加蜂窝号码方案"确认
6. 设置方案标签为"yah.mobile Japan"（可选）
7. 在"蜂窝数据"中选择 yah.mobile
8. 打开"数据漫游"

### QR 码无法扫描时
- 使用邮件中的"SM-DP+ 地址"和"激活码"手动输入
- 设置 → 蜂窝网络 → 添加蜂窝号码方案 → "手动输入详细信息"

## Android 安装步骤

1. 设置 → 网络和互联网 → SIM 卡
2. 点击"添加 SIM 卡"
3. 选择"扫描 QR 码"
4. 扫描购买邮件中的 QR 码
5. 按照屏幕指示完成安装
6. 打开"数据漫游"
7. 在"移动数据"中选择 yah.mobile

## APN 设置（通常不需要）

yah.mobile eSIM 会自动配置 APN。如需手动设置：
- APN: internet
- 其他字段留空

## 安装后"设置中不显示"

### iPhone
1. 检查 设置 → 蜂窝网络 — 如果未显示方案，重启手机
2. 重启后仍不显示 → 联系客服重新发送 QR 码

### Android
1. 检查 设置 → 网络和互联网 → SIM 卡
2. 如果不显示 → 重启手机
3. 仍不显示 → 设置 → 系统 → 重置 → 重置网络设置

## 无法连接互联网的故障排除

### 步骤1：切换飞行模式
打开飞行模式 10 秒，然后关闭。

### 步骤2：检查数据漫游
设置 → 蜂窝网络 → yah.mobile → 确认"数据漫游"已开启。

### 步骤3：检查移动数据选择
设置 → 蜂窝网络 → "蜂窝数据" → 确认选择了 yah.mobile。

### 步骤4：手动选择网络
设置 → 蜂窝网络 → yah.mobile → 网络选择 → 关闭"自动" → 选择 NTT DOCOMO / SoftBank / KDDI。

### 步骤5：切换到 4G/LTE
设置 → 蜂窝网络 → yah.mobile → 语音与数据 → 选择"4G"。

### 步骤6：重启设备
完全关机，等待 30 秒后重启。`,
  },
  {
    title: "eSIM 설치 완전 가이드 (한국어)",
    content: `# eSIM 설치 완전 가이드

## iPhone 설치 방법 (단계별)

### 준비사항
- 안정적인 Wi-Fi 연결 필요
- iPhone XS 이후 모델 (eSIM 지원)
- SIM 잠금 해제된 단말기

### 설치 순서
1. "설정" 앱 열기
2. "셀룰러" 탭
3. "셀룰러 요금제 추가" 탭
4. 구매 이메일의 QR 코드 스캔
5. "셀룰러 요금제 추가" 확인
6. 요금제 이름을 "yah.mobile Japan"으로 설정 (선택사항)
7. "셀룰러 데이터"에서 yah.mobile 선택
8. "데이터 로밍" 켜기

### QR 코드 스캔이 안 되는 경우
- 이메일의 "SM-DP+ 주소"와 "활성화 코드"를 수동 입력
- 설정 → 셀룰러 → 셀룰러 요금제 추가 → "수동으로 세부 정보 입력"

## Android 설치 방법

1. 설정 → 네트워크 및 인터넷 → SIM
2. "SIM 추가" 탭
3. "QR 코드 스캔" 선택
4. 구매 이메일의 QR 코드 스캔
5. 화면 안내에 따라 설치 완료
6. "데이터 로밍" 켜기
7. "모바일 데이터"에서 yah.mobile 선택

## APN 설정 (보통 불필요)

yah.mobile eSIM은 APN이 자동 설정됩니다. 수동 설정 필요 시:
- APN: internet
- 나머지 항목은 비워둠

## 설치 후 "설정에 표시되지 않음"

### iPhone
1. 설정 → 셀룰러 확인 — 요금제가 없으면 재시작
2. 재시작 후에도 안 보이면 → 고객지원에 QR 코드 재발급 요청

### Android
1. 설정 → 네트워크 및 인터넷 → SIM 확인
2. 안 보이면 → 재시작
3. 여전히 안 보이면 → 설정 → 시스템 → 초기화 → 네트워크 설정 초기화

## 인터넷 연결 안 될 때 해결법

### 1단계: 비행기 모드 전환
비행기 모드를 10초간 켜고 끄기.

### 2단계: 데이터 로밍 확인
설정 → 셀룰러 → yah.mobile → "데이터 로밍" 켜져 있는지 확인.

### 3단계: 모바일 데이터 확인
설정 → 셀룰러 → "셀룰러 데이터" → yah.mobile 선택 확인.

### 4단계: 수동 네트워크 선택
설정 → 셀룰러 → yah.mobile → 네트워크 선택 → "자동" 끄기 → NTT DOCOMO / SoftBank / KDDI 선택.

### 5단계: 4G/LTE로 전환
설정 → 셀룰러 → yah.mobile → 음성 및 데이터 → "4G" 선택.

### 6단계: 기기 재시작
완전히 종료 후 30초 대기, 재시작.`,
  },
  {
    title: "คู่มือติดตั้ง eSIM ฉบับสมบูรณ์ (ภาษาไทย)",
    content: `# คู่มือติดตั้ง eSIM ฉบับสมบูรณ์

## การติดตั้งบน iPhone (ทีละขั้นตอน)

### สิ่งที่ต้องเตรียม
- การเชื่อมต่อ Wi-Fi ที่เสถียร
- iPhone XS ขึ้นไป (รองรับ eSIM)
- โทรศัพท์ต้องปลดล็อค SIM แล้ว

### ขั้นตอน
1. เปิด "ตั้งค่า" (Settings)
2. แตะ "เซลลูลาร์" (Cellular)
3. แตะ "เพิ่มแผนเซลลูลาร์" (Add Cellular Plan)
4. สแกน QR Code จากอีเมลที่ซื้อ
5. แตะ "เพิ่มแผนเซลลูลาร์" เพื่อยืนยัน
6. ตั้งชื่อแผนเป็น "yah.mobile Japan" (ไม่บังคับ)
7. ใน "ข้อมูลเซลลูลาร์" เลือก yah.mobile
8. เปิด "การโรมมิ่งข้อมูล" (Data Roaming)

### QR Code สแกนไม่ได้
- ใช้ "SM-DP+ Address" และ "Activation Code" จากอีเมลป้อนด้วยตนเอง
- ตั้งค่า → เซลลูลาร์ → เพิ่มแผนเซลลูลาร์ → "ป้อนรายละเอียดด้วยตนเอง"

## การติดตั้งบน Android

1. ตั้งค่า → เครือข่ายและอินเทอร์เน็ต → SIM
2. แตะ "เพิ่ม SIM"
3. เลือก "สแกน QR Code"
4. สแกน QR Code จากอีเมล
5. ทำตามคำแนะนำบนหน้าจอ
6. เปิด "การโรมมิ่งข้อมูล"
7. เลือก yah.mobile สำหรับ "ข้อมูลมือถือ"

## การตั้งค่า APN (ปกติไม่จำเป็น)

yah.mobile eSIM ตั้งค่า APN อัตโนมัติ หากต้องตั้งค่าเอง:
- APN: internet
- ช่องอื่นเว้นว่าง

## ติดตั้งแล้วแต่ "ไม่แสดงในการตั้งค่า"

### iPhone
1. ตรวจสอบ ตั้งค่า → เซลลูลาร์ — หากไม่แสดงแผน ให้รีสตาร์ทโทรศัพท์
2. หลังรีสตาร์ทยังไม่แสดง → ติดต่อฝ่ายสนับสนุนเพื่อขอ QR Code ใหม่

### Android
1. ตรวจสอบ ตั้งค่า → เครือข่ายและอินเทอร์เน็ต → SIM
2. หากไม่แสดง → รีสตาร์ทโทรศัพท์
3. ยังไม่แสดง → ตั้งค่า → ระบบ → รีเซ็ต → รีเซ็ตการตั้งค่าเครือข่าย

## แก้ไขปัญหาเชื่อมต่ออินเทอร์เน็ตไม่ได้

### ขั้นที่ 1: สลับโหมดเครื่องบิน
เปิดโหมดเครื่องบิน 10 วินาที แล้วปิด

### ขั้นที่ 2: ตรวจสอบการโรมมิ่งข้อมูล
ตั้งค่า → เซลลูลาร์ → yah.mobile → ตรวจสอบว่า "การโรมมิ่งข้อมูล" เปิดอยู่

### ขั้นที่ 3: ตรวจสอบข้อมูลมือถือ
ตั้งค่า → เซลลูลาร์ → "ข้อมูลเซลลูลาร์" → ตรวจสอบว่าเลือก yah.mobile

### ขั้นที่ 4: เลือกเครือข่ายด้วยตนเอง
ตั้งค่า → เซลลูลาร์ → yah.mobile → เลือกเครือข่าย → ปิด "อัตโนมัติ" → เลือก NTT DOCOMO / SoftBank / KDDI

### ขั้นที่ 5: เปลี่ยนเป็น 4G/LTE
ตั้งค่า → เซลลูลาร์ → yah.mobile → เสียงและข้อมูล → เลือก "4G"

### ขั้นที่ 6: รีสตาร์ทอุปกรณ์
ปิดเครื่องสมบูรณ์ รอ 30 วินาที แล้วเปิดใหม่`,
  },
  {
    title: "Hướng dẫn cài đặt eSIM đầy đủ (Tiếng Việt)",
    content: `# Hướng dẫn cài đặt eSIM đầy đủ

## Cài đặt trên iPhone (Từng bước)

### Chuẩn bị
- Cần kết nối Wi-Fi ổn định
- iPhone XS trở lên (hỗ trợ eSIM)
- Điện thoại phải được mở khóa SIM

### Các bước
1. Mở "Cài đặt" (Settings)
2. Chạm "Di động" (Cellular)
3. Chạm "Thêm gói cước di động" (Add Cellular Plan)
4. Quét mã QR từ email mua hàng
5. Chạm "Thêm gói cước di động" để xác nhận
6. Đặt tên gói là "yah.mobile Japan" (tùy chọn)
7. Trong "Dữ liệu di động", chọn yah.mobile
8. BẬT "Chuyển vùng dữ liệu" (Data Roaming)

### Không quét được mã QR
- Sử dụng "Địa chỉ SM-DP+" và "Mã kích hoạt" từ email để nhập thủ công
- Cài đặt → Di động → Thêm gói cước → "Nhập thông tin thủ công"

## Cài đặt trên Android

1. Cài đặt → Mạng & Internet → SIM
2. Chạm "Thêm SIM"
3. Chọn "Quét mã QR"
4. Quét mã QR từ email
5. Làm theo hướng dẫn trên màn hình
6. BẬT "Chuyển vùng dữ liệu"
7. Chọn yah.mobile cho "Dữ liệu di động"

## Cài đặt APN (Thường không cần)

eSIM yah.mobile tự động cấu hình APN. Nếu cần cài đặt thủ công:
- APN: internet
- Để trống các trường khác

## Sau khi cài đặt "Không hiển thị trong cài đặt"

### iPhone
1. Kiểm tra Cài đặt → Di động — nếu không thấy gói, khởi động lại điện thoại
2. Sau khi khởi động lại vẫn không thấy → liên hệ hỗ trợ để cấp lại mã QR

### Android
1. Kiểm tra Cài đặt → Mạng & Internet → SIM
2. Nếu không thấy → khởi động lại
3. Vẫn không thấy → Cài đặt → Hệ thống → Đặt lại → Đặt lại cài đặt mạng

## Khắc phục sự cố không kết nối được Internet

### Bước 1: Bật/tắt chế độ máy bay
Bật chế độ máy bay 10 giây, rồi tắt.

### Bước 2: Kiểm tra chuyển vùng dữ liệu
Cài đặt → Di động → yah.mobile → đảm bảo "Chuyển vùng dữ liệu" đã BẬT.

### Bước 3: Kiểm tra dữ liệu di động
Cài đặt → Di động → "Dữ liệu di động" → đảm bảo đã chọn yah.mobile.

### Bước 4: Chọn mạng thủ công
Cài đặt → Di động → yah.mobile → Chọn mạng → Tắt "Tự động" → Chọn NTT DOCOMO / SoftBank / KDDI.

### Bước 5: Chuyển sang 4G/LTE
Cài đặt → Di động → yah.mobile → Thoại & Dữ liệu → Chọn "4G".

### Bước 6: Khởi động lại thiết bị
Tắt hoàn toàn, đợi 30 giây rồi bật lại.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Pricing Plans Detail
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "yah.mobile 料金プラン詳細（日本語）",
    content: `# yah.mobile 料金プラン詳細

## 利用可能なプラン一覧

| プラン名 | データ容量 | 有効期間 | 価格（税込） | 1GBあたり |
|---------|-----------|---------|------------|----------|
| ライト | 1GB | 7日間 | ¥490 | ¥490/GB |
| スタンダード | 3GB | 15日間 | ¥980 | ¥327/GB |
| バリュー | 5GB | 30日間 | ¥1,480 | ¥296/GB |
| プレミアム | 10GB | 30日間 | ¥2,480 | ¥248/GB |
| ウルトラ | 20GB | 30日間 | ¥3,980 | ¥199/GB |
| 無制限 | 無制限 | 15日間 | ¥4,980 | — |

## プランの特徴
- **全プラン共通：** 4G/LTE対応、テザリング可能、データ専用（通話・SMS不可）
- **有効期間の開始：** 日本で初めてデータ通信を使用した時点からカウント開始
- **データ超過後：** 通信停止（追加データ購入可能）
- **対応エリア：** 日本全国（NTT DOCOMO / SoftBank / KDDI ネットワーク）

## どのプランを選べばいいですか？

| 利用シーン | おすすめプラン |
|-----------|-------------|
| 短期旅行（3〜5日）・地図とSNS中心 | ライト（1GB）またはスタンダード（3GB） |
| 1〜2週間の旅行・動画も少し見る | バリュー（5GB）またはプレミアム（10GB） |
| 長期滞在・仕事でも使う | ウルトラ（20GB）または無制限 |
| グループ旅行・テザリングで共有 | プレミアム（10GB）以上 |

## 追加データ（トップアップ）
データを使い切った場合、マイページから追加購入できます：
- 1GB追加：¥490
- 3GB追加：¥980

## 支払い方法
- クレジットカード（Visa / Mastercard / JCB / AMEX）
- Apple Pay
- Google Pay`,
  },
  {
    title: "yah.mobile Pricing Plans (English)",
    content: `# yah.mobile Pricing Plans

## Available Plans

| Plan | Data | Validity | Price | Per GB |
|------|------|----------|-------|--------|
| Light | 1GB | 7 days | ¥490 (~$3.30) | ¥490/GB |
| Standard | 3GB | 15 days | ¥980 (~$6.60) | ¥327/GB |
| Value | 5GB | 30 days | ¥1,480 (~$10) | ¥296/GB |
| Premium | 10GB | 30 days | ¥2,480 (~$17) | ¥248/GB |
| Ultra | 20GB | 30 days | ¥3,980 (~$27) | ¥199/GB |
| Unlimited | Unlimited | 15 days | ¥4,980 (~$34) | — |

## Plan Features
- **All plans include:** 4G/LTE, tethering/hotspot, data-only (no calls/SMS)
- **Validity starts:** When you first use data in Japan
- **After data runs out:** Connection stops (top-up available)
- **Coverage:** All of Japan (NTT DOCOMO / SoftBank / KDDI networks)

## Which Plan Should I Choose?

| Use Case | Recommended |
|----------|-------------|
| Short trip (3-5 days), maps & social media | Light (1GB) or Standard (3GB) |
| 1-2 week trip, some video streaming | Value (5GB) or Premium (10GB) |
| Long stay, work use | Ultra (20GB) or Unlimited |
| Group travel, sharing via hotspot | Premium (10GB) or above |

## Top-Up (Additional Data)
If you run out of data, purchase more from My Page:
- 1GB top-up: ¥490
- 3GB top-up: ¥980

## Payment Methods
- Credit card (Visa / Mastercard / JCB / AMEX)
- Apple Pay
- Google Pay`,
  },
  {
    title: "yah.mobile 资费方案详情（中文）",
    content: `# yah.mobile 资费方案详情

## 可用方案

| 方案 | 流量 | 有效期 | 价格 | 每GB |
|------|------|--------|------|------|
| 轻量版 | 1GB | 7天 | ¥490 | ¥490/GB |
| 标准版 | 3GB | 15天 | ¥980 | ¥327/GB |
| 超值版 | 5GB | 30天 | ¥1,480 | ¥296/GB |
| 高级版 | 10GB | 30天 | ¥2,480 | ¥248/GB |
| 至尊版 | 20GB | 30天 | ¥3,980 | ¥199/GB |
| 无限版 | 无限 | 15天 | ¥4,980 | — |

## 方案特点
- 所有方案：4G/LTE、支持热点共享、仅数据（无通话/短信）
- 有效期从在日本首次使用数据时开始计算
- 流量用完后：连接停止（可购买追加流量）
- 覆盖范围：日本全国（NTT DOCOMO / SoftBank / KDDI 网络）

## 如何选择方案？
- 短途旅行（3-5天）：轻量版或标准版
- 1-2周旅行：超值版或高级版
- 长期停留/工作使用：至尊版或无限版

## 追加流量
- 1GB：¥490
- 3GB：¥980`,
  },
  {
    title: "yah.mobile 요금제 상세 (한국어)",
    content: `# yah.mobile 요금제 상세

## 이용 가능한 요금제

| 요금제 | 데이터 | 유효기간 | 가격 | GB당 |
|--------|--------|---------|------|------|
| 라이트 | 1GB | 7일 | ¥490 | ¥490/GB |
| 스탠다드 | 3GB | 15일 | ¥980 | ¥327/GB |
| 밸류 | 5GB | 30일 | ¥1,480 | ¥296/GB |
| 프리미엄 | 10GB | 30일 | ¥2,480 | ¥248/GB |
| 울트라 | 20GB | 30일 | ¥3,980 | ¥199/GB |
| 무제한 | 무제한 | 15일 | ¥4,980 | — |

## 요금제 특징
- 모든 요금제: 4G/LTE, 테더링 가능, 데이터 전용 (통화/SMS 불가)
- 유효기간: 일본에서 처음 데이터를 사용한 시점부터 시작
- 데이터 소진 후: 연결 중단 (추가 데이터 구매 가능)
- 커버리지: 일본 전국 (NTT DOCOMO / SoftBank / KDDI 네트워크)

## 어떤 요금제를 선택해야 하나요?
- 단기 여행 (3-5일): 라이트 또는 스탠다드
- 1-2주 여행: 밸류 또는 프리미엄
- 장기 체류/업무용: 울트라 또는 무제한

## 추가 데이터 (톱업)
- 1GB 추가: ¥490
- 3GB 추가: ¥980`,
  },
  {
    title: "yah.mobile แผนราคา (ภาษาไทย)",
    content: `# yah.mobile แผนราคา

## แผนที่มีให้เลือก

| แผน | ข้อมูล | ระยะเวลา | ราคา | ต่อ GB |
|-----|--------|----------|------|--------|
| Light | 1GB | 7 วัน | ¥490 | ¥490/GB |
| Standard | 3GB | 15 วัน | ¥980 | ¥327/GB |
| Value | 5GB | 30 วัน | ¥1,480 | ¥296/GB |
| Premium | 10GB | 30 วัน | ¥2,480 | ¥248/GB |
| Ultra | 20GB | 30 วัน | ¥3,980 | ¥199/GB |
| Unlimited | ไม่จำกัด | 15 วัน | ¥4,980 | — |

## คุณสมบัติ
- ทุกแผน: 4G/LTE, แชร์ฮอตสปอตได้, ข้อมูลเท่านั้น (ไม่มีโทร/SMS)
- ระยะเวลาเริ่มนับ: เมื่อใช้ข้อมูลครั้งแรกในญี่ปุ่น
- หลังข้อมูลหมด: การเชื่อมต่อหยุด (ซื้อเพิ่มได้)
- ครอบคลุม: ทั่วญี่ปุ่น (NTT DOCOMO / SoftBank / KDDI)

## เลือกแผนไหนดี?
- เที่ยวสั้น (3-5 วัน): Light หรือ Standard
- เที่ยว 1-2 สัปดาห์: Value หรือ Premium
- อยู่นาน/ใช้งาน: Ultra หรือ Unlimited

## เติมข้อมูล
- 1GB: ¥490
- 3GB: ¥980`,
  },
  {
    title: "yah.mobile Gói cước (Tiếng Việt)",
    content: `# yah.mobile Gói cước chi tiết

## Các gói có sẵn

| Gói | Dữ liệu | Hiệu lực | Giá | Mỗi GB |
|-----|----------|----------|-----|---------|
| Light | 1GB | 7 ngày | ¥490 | ¥490/GB |
| Standard | 3GB | 15 ngày | ¥980 | ¥327/GB |
| Value | 5GB | 30 ngày | ¥1,480 | ¥296/GB |
| Premium | 10GB | 30 ngày | ¥2,480 | ¥248/GB |
| Ultra | 20GB | 30 ngày | ¥3,980 | ¥199/GB |
| Unlimited | Không giới hạn | 15 ngày | ¥4,980 | — |

## Đặc điểm
- Tất cả gói: 4G/LTE, chia sẻ hotspot, chỉ dữ liệu (không gọi/SMS)
- Hiệu lực bắt đầu: khi sử dụng dữ liệu lần đầu tại Nhật
- Sau khi hết dữ liệu: kết nối dừng (có thể mua thêm)
- Phủ sóng: toàn Nhật Bản (NTT DOCOMO / SoftBank / KDDI)

## Chọn gói nào?
- Du lịch ngắn (3-5 ngày): Light hoặc Standard
- Du lịch 1-2 tuần: Value hoặc Premium
- Ở lâu/công việc: Ultra hoặc Unlimited

## Nạp thêm dữ liệu
- 1GB: ¥490
- 3GB: ¥980`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Refund & Cancellation Policy (Detailed)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "返金・キャンセルポリシー詳細（日本語）",
    content: `# yah.mobile 返金・キャンセルポリシー

## 基本方針
**原則として、QRコード発行後の返金・キャンセルは受け付けておりません。**

yah.mobileが提供するeSIMはデジタルコンテンツ（無形のデジタル商品）に該当し、特定商取引法第15条の3の規定に基づき、購入フローの最終確認画面にて「QRコード発行後は返金・キャンセルができない」旨の同意チェックボックスにチェックを入れていただいた上で決済が完了する仕様となっています。

## なぜ返金できないのですか？
- eSIMのQRコードは発行時点でネットワーク回線が確保されます
- デジタル商品のため「未開封」の概念がありません
- 特定商取引法第15条の3により、デジタルコンテンツの返品は販売者の判断に委ねられています
- 購入時に「返金不可」に同意いただいています

## 一度も使っていないのに返金できないのですか？
はい。QRコードが発行された時点で回線リソースが確保されるため、「使用していない」ことと「返金可能」は異なります。これは航空券や映画チケットと同様の仕組みです。

## 例外的な対応ケース
以下のケースは個別に運営チームへエスカレーションします：

| 状況 | 対応 |
|------|------|
| yah.mobile側のシステム障害でeSIMが正常に発行されなかった | 運営へエスカレーション |
| 二重請求・決済エラーが確認された | 重複分のみ返金 |
| 未成年者による保護者の同意なしの購入 | 運営へエスカレーション |
| クレジットカードの不正利用が確認された | 運営へエスカレーション |

## 技術的な問題が発生した場合
eSIMが正常に動作しない場合は、返金ではなくまず技術サポートをご利用ください：
- QRコードの再発行
- 接続トラブルシューティング
- 代替eSIMの発行

24時間365日チャットサポートで対応いたします。

## ポリシーの法的根拠
- 特定商取引法第15条の3（通信販売における契約の解除等）
- 電子消費者契約法
- サイトフッターの「特定商取引法に基づく表記」ページに詳細記載`,
  },
  {
    title: "Refund & Cancellation Policy (English)",
    content: `# yah.mobile Refund & Cancellation Policy

## Basic Policy
**Refunds and cancellations are NOT available after the QR code has been issued.**

yah.mobile eSIM is a digital product. Under Japan's Act on Specified Commercial Transactions (Article 15-3), digital content purchases are final once the product is delivered. During checkout, you confirmed agreement to the "no refund after QR code issuance" policy via a mandatory checkbox.

## Why Can't I Get a Refund?
- The QR code reserves network resources the moment it's issued
- Digital products have no concept of "unopened" or "unused"
- Japan's consumer law (Act on Specified Commercial Transactions, Article 15-3) allows sellers to set final-sale terms for digital goods
- You agreed to the no-refund policy at checkout

## I Haven't Used It Yet — Why No Refund?
The QR code issuance itself allocates network capacity, regardless of whether you've connected. This is similar to airline tickets or event passes — the resource is reserved for you.

## But I Can't Get It to Work!
If you're having technical issues, we provide full technical support instead of refunds:
- QR code reissuance
- Step-by-step troubleshooting
- Replacement eSIM if needed

Our 24/7 chat support team will help resolve any connection issues.

## Exceptional Cases
The following situations are escalated to our operations team:

| Situation | Response |
|-----------|----------|
| System error on yah.mobile's side prevented eSIM delivery | Escalated to operations |
| Double charge / payment error confirmed | Refund of duplicate only |
| Purchase by minor without parental consent | Escalated to operations |
| Confirmed credit card fraud | Escalated to operations |

## Legal Basis
- Japan's Act on Specified Commercial Transactions, Article 15-3
- Electronic Consumer Contract Act
- Full details on our "Specified Commercial Transactions Act" page (site footer)`,
  },
  {
    title: "退款与取消政策（中文）",
    content: `# yah.mobile 退款与取消政策

## 基本政策
**QR码发行后，原则上不接受退款或取消。**

yah.mobile eSIM 属于数字商品。根据日本《特定商业交易法》第15条之3，数字内容一经交付即为最终销售。在结账时，您已通过必选复选框确认同意"QR码发行后不可退款"的政策。

## 为什么不能退款？
- QR码发行时即已预留网络资源
- 数字商品不存在"未开封"的概念
- 日本法律允许数字商品设定不退款条款
- 您在购买时已同意不退款政策

## 我还没用过，为什么不能退？
QR码发行本身就分配了网络容量，无论您是否已连接。这类似于机票或活动门票——资源已为您预留。

## 遇到技术问题怎么办？
我们提供全面的技术支持：
- QR码重新发行
- 逐步故障排除
- 必要时更换eSIM

24/7全天候聊天支持。

## 例外情况
以下情况将提交运营团队处理：
- yah.mobile系统故障导致eSIM未正常发行 → 提交运营
- 确认重复收费/支付错误 → 仅退还重复部分
- 未成年人未经监护人同意购买 → 提交运营
- 确认信用卡欺诈 → 提交运营`,
  },
  {
    title: "환불 및 취소 정책 (한국어)",
    content: `# yah.mobile 환불 및 취소 정책

## 기본 정책
**QR 코드 발행 후에는 환불 및 취소가 불가합니다.**

yah.mobile eSIM은 디지털 상품입니다. 일본 특정상거래법 제15조의3에 따라, 디지털 콘텐츠는 배송 후 최종 판매로 간주됩니다. 결제 시 "QR 코드 발행 후 환불 불가" 정책에 동의하셨습니다.

## 왜 환불이 안 되나요?
- QR 코드 발행 시점에 네트워크 자원이 할당됩니다
- 디지털 상품은 "미개봉" 개념이 없습니다
- 일본 법률에 따라 디지털 상품의 환불 불가 조건이 허용됩니다
- 구매 시 환불 불가 정책에 동의하셨습니다

## 아직 사용하지 않았는데 왜 환불이 안 되나요?
QR 코드 발행 자체가 네트워크 용량을 할당합니다. 항공권이나 이벤트 티켓과 마찬가지로 자원이 예약된 것입니다.

## 기술적 문제가 있는 경우
환불 대신 기술 지원을 제공합니다:
- QR 코드 재발행
- 단계별 문제 해결
- 필요 시 대체 eSIM 발행

24시간 연중무휴 채팅 지원.

## 예외 사항
- yah.mobile 시스템 오류로 eSIM 미발행 → 운영팀 에스컬레이션
- 이중 청구/결제 오류 확인 → 중복분만 환불
- 미성년자 보호자 동의 없이 구매 → 운영팀 에스컬레이션
- 신용카드 부정 사용 확인 → 운영팀 에스컬레이션`,
  },
  {
    title: "นโยบายการคืนเงินและยกเลิก (ภาษาไทย)",
    content: `# yah.mobile นโยบายการคืนเงินและยกเลิก

## นโยบายหลัก
**ไม่สามารถคืนเงินหรือยกเลิกได้หลังจากออก QR Code แล้ว**

eSIM ของ yah.mobile เป็นสินค้าดิจิทัล ตามกฎหมายธุรกรรมทางการค้าเฉพาะของญี่ปุ่น (มาตรา 15-3) สินค้าดิจิทัลถือเป็นการขายสุดท้ายเมื่อส่งมอบแล้ว คุณได้ยืนยันยอมรับนโยบาย "ไม่คืนเงินหลังออก QR Code" ในขั้นตอนชำระเงิน

## ทำไมคืนเงินไม่ได้?
- QR Code จะจองทรัพยากรเครือข่ายทันทีที่ออก
- สินค้าดิจิทัลไม่มีแนวคิด "ยังไม่เปิดใช้"
- กฎหมายญี่ปุ่นอนุญาตให้ผู้ขายกำหนดเงื่อนไขไม่คืนเงินสำหรับสินค้าดิจิทัล
- คุณยอมรับนโยบายไม่คืนเงินตอนซื้อ

## ยังไม่ได้ใช้เลย ทำไมคืนเงินไม่ได้?
การออก QR Code จะจัดสรรความจุเครือข่าย ไม่ว่าคุณจะเชื่อมต่อแล้วหรือไม่ เหมือนตั๋วเครื่องบินหรือบัตรเข้างาน

## มีปัญหาทางเทคนิค?
เราให้การสนับสนุนทางเทคนิคแทนการคืนเงิน:
- ออก QR Code ใหม่
- แก้ไขปัญหาทีละขั้นตอน
- ออก eSIM ทดแทนหากจำเป็น

สนับสนุนแชท 24/7

## กรณียกเว้น
- ข้อผิดพลาดระบบ yah.mobile ทำให้ eSIM ไม่ออก → ส่งต่อทีมปฏิบัติการ
- ยืนยันเรียกเก็บเงินซ้ำ → คืนเฉพาะส่วนที่ซ้ำ
- ผู้เยาว์ซื้อโดยไม่ได้รับความยินยอมจากผู้ปกครอง → ส่งต่อทีมปฏิบัติการ
- ยืนยันการใช้บัตรเครดิตโดยมิชอบ → ส่งต่อทีมปฏิบัติการ`,
  },
  {
    title: "Chính sách hoàn tiền và hủy (Tiếng Việt)",
    content: `# yah.mobile Chính sách hoàn tiền và hủy

## Chính sách cơ bản
**Không chấp nhận hoàn tiền hoặc hủy sau khi mã QR đã được phát hành.**

eSIM yah.mobile là sản phẩm kỹ thuật số. Theo Luật Giao dịch Thương mại Đặc biệt của Nhật Bản (Điều 15-3), nội dung số được coi là bán cuối cùng sau khi giao. Bạn đã xác nhận đồng ý chính sách "không hoàn tiền sau khi phát hành mã QR" khi thanh toán.

## Tại sao không thể hoàn tiền?
- Mã QR phân bổ tài nguyên mạng ngay khi phát hành
- Sản phẩm số không có khái niệm "chưa mở"
- Luật Nhật Bản cho phép người bán đặt điều kiện không hoàn tiền cho hàng số
- Bạn đã đồng ý chính sách không hoàn tiền khi mua

## Tôi chưa sử dụng, tại sao không hoàn tiền?
Việc phát hành mã QR đã phân bổ dung lượng mạng, bất kể bạn đã kết nối hay chưa. Giống như vé máy bay — tài nguyên đã được đặt cho bạn.

## Gặp vấn đề kỹ thuật?
Chúng tôi cung cấp hỗ trợ kỹ thuật thay vì hoàn tiền:
- Phát hành lại mã QR
- Khắc phục sự cố từng bước
- Cấp eSIM thay thế nếu cần

Hỗ trợ chat 24/7.

## Trường hợp ngoại lệ
- Lỗi hệ thống yah.mobile khiến eSIM không phát hành → Chuyển đội vận hành
- Xác nhận tính phí trùng → Hoàn phần trùng
- Người chưa thành niên mua không có sự đồng ý của phụ huynh → Chuyển đội vận hành
- Xác nhận gian lận thẻ tín dụng → Chuyển đội vận hành`,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  Adding RAG Documents (6 languages × 3 types = 18 docs)");
  console.log(`${"=".repeat(60)}\n`);

  let success = 0;
  let failed = 0;

  for (const doc of DOCS) {
    try {
      process.stdout.write(`  📄 ${doc.title.substring(0, 50)}... `);
      const embedding = await getEmbedding(doc.content);
      
      await pool.query(
        `INSERT INTO rag_documents (title, content, embedding, createdAt)
         VALUES (?, ?, ?, NOW())`,
        [doc.title, doc.content, JSON.stringify(embedding)]
      );
      
      console.log("✅");
      success++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
    
    // Rate limit: wait 500ms between embedding calls
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Results: ${success} added, ${failed} failed`);
  console.log(`${"=".repeat(60)}\n`);

  await pool.end();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
