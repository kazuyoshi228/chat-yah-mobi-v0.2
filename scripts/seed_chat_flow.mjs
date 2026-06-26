/**
 * seed_chat_flow.mjs
 * Inserts the decision tree nodes for the yah.mobile chat widget.
 * Run: node scripts/seed_chat_flow.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const L = (ja, en, ko, zh, th, vi) => JSON.stringify({ ja, en, ko, zh, th, vi });

const nodes = [
  // ─── ROOT ───────────────────────────────────────────────────────────────────
  {
    id: "root",
    parentId: null,
    type: "question",
    label: L(
      "どのようなことでお困りですか？",
      "How can we help you today?",
      "무엇을 도와드릴까요?",
      "请问您需要什么帮助？",
      "เราสามารถช่วยอะไรคุณได้บ้าง?",
      "Chúng tôi có thể giúp gì cho bạn?"
    ),
    content: null,
    options: JSON.stringify(["connection", "purchase", "refund", "other"]),
    icon: "💬",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },

  // ─── CATEGORY: 接続トラブル ───────────────────────────────────────────────
  {
    id: "connection",
    parentId: "root",
    type: "question",
    label: L(
      "🔌 接続・設定トラブル",
      "🔌 Connection Issues",
      "🔌 연결 문제",
      "🔌 连接问题",
      "🔌 ปัญหาการเชื่อมต่อ",
      "🔌 Vấn đề kết nối"
    ),
    content: null,
    options: JSON.stringify(["conn_not_installed", "conn_installed"]),
    icon: "🔌",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // まだインストールしていない
  {
    id: "conn_not_installed",
    parentId: "connection",
    type: "question",
    label: L(
      "まだeSIMをインストールしていない",
      "I haven't installed the eSIM yet",
      "아직 eSIM을 설치하지 않았습니다",
      "还没有安装eSIM",
      "ยังไม่ได้ติดตั้ง eSIM",
      "Tôi chưa cài đặt eSIM"
    ),
    content: null,
    options: JSON.stringify(["conn_install_iphone", "conn_install_android"]),
    icon: "📦",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // iPhone インストール手順
  {
    id: "conn_install_iphone",
    parentId: "conn_not_installed",
    type: "answer",
    label: L("iPhone", "iPhone", "iPhone", "iPhone", "iPhone", "iPhone"),
    content: L(
      `【iPhoneへのeSIMインストール手順】\n\n1. 設定 → 一般 → VPNとデバイス管理 → eSIMを追加\n2. 「QRコードを使用」をタップ\n3. yah.mobileから届いたQRコードをスキャン\n4. 「モバイル通信プランを追加」をタップ\n5. eSIMのラベルを「yah.mobile」に設定\n\n✅ インストール後は「データローミング」をONにしてください\n\n❓ 解決しましたか？`,
      `【iPhone eSIM Installation Steps】\n\n1. Settings → General → VPN & Device Management → Add eSIM\n2. Tap "Use QR Code"\n3. Scan the QR code from yah.mobile\n4. Tap "Add Mobile Plan"\n5. Label the eSIM as "yah.mobile"\n\n✅ After installation, enable "Data Roaming"\n\n❓ Did this solve your issue?`,
      `【iPhone eSIM 설치 방법】\n\n1. 설정 → 일반 → VPN 및 기기 관리 → eSIM 추가\n2. "QR 코드 사용" 탭\n3. yah.mobile QR 코드 스캔\n4. "모바일 요금제 추가" 탭\n5. eSIM 이름을 "yah.mobile"로 설정\n\n✅ 설치 후 "데이터 로밍"을 켜주세요\n\n❓ 해결되었나요?`,
      `【iPhone eSIM安装步骤】\n\n1. 设置 → 通用 → VPN与设备管理 → 添加eSIM\n2. 点击"使用二维码"\n3. 扫描yah.mobile的二维码\n4. 点击"添加移动套餐"\n5. 将eSIM标签设置为"yah.mobile"\n\n✅ 安装后请开启"数据漫游"\n\n❓ 问题解决了吗？`,
      `【ขั้นตอนการติดตั้ง eSIM บน iPhone】\n\n1. การตั้งค่า → ทั่วไป → VPN และการจัดการอุปกรณ์ → เพิ่ม eSIM\n2. แตะ "ใช้ QR Code"\n3. สแกน QR Code จาก yah.mobile\n4. แตะ "เพิ่มแผนมือถือ"\n5. ตั้งชื่อ eSIM ว่า "yah.mobile"\n\n✅ หลังติดตั้ง เปิด "Data Roaming"\n\n❓ แก้ไขได้แล้วหรือยัง?`,
      `【Hướng dẫn cài đặt eSIM trên iPhone】\n\n1. Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị → Thêm eSIM\n2. Nhấn "Dùng mã QR"\n3. Quét mã QR từ yah.mobile\n4. Nhấn "Thêm gói di động"\n5. Đặt tên eSIM là "yah.mobile"\n\n✅ Sau khi cài, bật "Chuyển vùng dữ liệu"\n\n❓ Vấn đề đã được giải quyết chưa?`
    ),
    options: JSON.stringify(["conn_resolved", "conn_step1"]),
    icon: "📱",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // Android インストール手順
  {
    id: "conn_install_android",
    parentId: "conn_not_installed",
    type: "answer",
    label: L("Android", "Android", "Android", "Android", "Android", "Android"),
    content: L(
      `【AndroidへのeSIMインストール手順】\n\n1. 設定 → ネットワークとインターネット → SIM → SIMを追加\n2. 「QRコードをスキャン」を選択\n3. yah.mobileから届いたQRコードをスキャン\n4. 「アクティベート」をタップ\n5. データ通信にyah.mobileを選択\n\n✅ インストール後は「データローミング」をONにしてください\n\n❓ 解決しましたか？`,
      `【Android eSIM Installation Steps】\n\n1. Settings → Network & Internet → SIM → Add SIM\n2. Select "Scan QR Code"\n3. Scan the QR code from yah.mobile\n4. Tap "Activate"\n5. Select yah.mobile for data\n\n✅ After installation, enable "Data Roaming"\n\n❓ Did this solve your issue?`,
      `【Android eSIM 설치 방법】\n\n1. 설정 → 네트워크 및 인터넷 → SIM → SIM 추가\n2. "QR 코드 스캔" 선택\n3. yah.mobile QR 코드 스캔\n4. "활성화" 탭\n5. 데이터에 yah.mobile 선택\n\n✅ 설치 후 "데이터 로밍"을 켜주세요\n\n❓ 해결되었나요?`,
      `【Android eSIM安装步骤】\n\n1. 设置 → 网络和互联网 → SIM卡 → 添加SIM卡\n2. 选择"扫描二维码"\n3. 扫描yah.mobile的二维码\n4. 点击"激活"\n5. 选择yah.mobile作为数据连接\n\n✅ 安装后请开启"数据漫游"\n\n❓ 问题解决了吗？`,
      `【ขั้นตอนการติดตั้ง eSIM บน Android】\n\n1. การตั้งค่า → เครือข่ายและอินเทอร์เน็ต → ซิม → เพิ่มซิม\n2. เลือก "สแกน QR Code"\n3. สแกน QR Code จาก yah.mobile\n4. แตะ "เปิดใช้งาน"\n5. เลือก yah.mobile สำหรับข้อมูล\n\n✅ หลังติดตั้ง เปิด "Data Roaming"\n\n❓ แก้ไขได้แล้วหรือยัง?`,
      `【Hướng dẫn cài đặt eSIM trên Android】\n\n1. Cài đặt → Mạng & Internet → SIM → Thêm SIM\n2. Chọn "Quét mã QR"\n3. Quét mã QR từ yah.mobile\n4. Nhấn "Kích hoạt"\n5. Chọn yah.mobile cho dữ liệu\n\n✅ Sau khi cài, bật "Chuyển vùng dữ liệu"\n\n❓ Vấn đề đã được giải quyết chưa?`
    ),
    options: JSON.stringify(["conn_resolved", "conn_step1"]),
    icon: "📱",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // インストール済みだが繋がらない
  {
    id: "conn_installed",
    parentId: "connection",
    type: "question",
    label: L(
      "インストール済みだが繋がらない",
      "Installed but can't connect",
      "설치했지만 연결이 안 됩니다",
      "已安装但无法连接",
      "ติดตั้งแล้วแต่เชื่อมต่อไม่ได้",
      "Đã cài nhưng không kết nối được"
    ),
    content: null,
    options: JSON.stringify(["conn_step1"]),
    icon: "⚠️",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // Step 1: データローミング
  {
    id: "conn_step1",
    parentId: "conn_installed",
    type: "answer",
    label: L(
      "STEP 1: データローミングをONにする",
      "STEP 1: Enable Data Roaming",
      "STEP 1: 데이터 로밍 켜기",
      "STEP 1: 开启数据漫游",
      "STEP 1: เปิด Data Roaming",
      "STEP 1: Bật Chuyển vùng dữ liệu"
    ),
    content: L(
      `【データローミングの確認】\n\niPhone: 設定 → モバイル通信 → yah.mobile → データローミングをON\nAndroid: 設定 → ネットワーク → SIM → データローミングをON\n\n機内モードをON→OFFして再起動もお試しください。\n\n❓ 解決しましたか？`,
      `【Check Data Roaming】\n\niPhone: Settings → Mobile Data → yah.mobile → Data Roaming ON\nAndroid: Settings → Network → SIM → Data Roaming ON\n\nAlso try toggling Airplane Mode ON→OFF and restart.\n\n❓ Did this solve your issue?`,
      `【데이터 로밍 확인】\n\niPhone: 설정 → 모바일 데이터 → yah.mobile → 데이터 로밍 켜기\nAndroid: 설정 → 네트워크 → SIM → 데이터 로밍 켜기\n\n비행기 모드 ON→OFF 후 재시작도 해보세요.\n\n❓ 해결되었나요?`,
      `【检查数据漫游】\n\niPhone: 设置 → 移动数据 → yah.mobile → 数据漫游开启\nAndroid: 设置 → 网络 → SIM卡 → 数据漫游开启\n\n也请尝试开关飞行模式并重启。\n\n❓ 问题解决了吗？`,
      `【ตรวจสอบ Data Roaming】\n\niPhone: การตั้งค่า → ข้อมูลมือถือ → yah.mobile → เปิด Data Roaming\nAndroid: การตั้งค่า → เครือข่าย → ซิม → เปิด Data Roaming\n\nลองเปิด-ปิดโหมดเครื่องบินและรีสตาร์ทด้วย\n\n❓ แก้ไขได้แล้วหรือยัง?`,
      `【Kiểm tra Chuyển vùng dữ liệu】\n\niPhone: Cài đặt → Dữ liệu di động → yah.mobile → Bật Chuyển vùng dữ liệu\nAndroid: Cài đặt → Mạng → SIM → Bật Chuyển vùng dữ liệu\n\nHãy thử bật/tắt Chế độ máy bay và khởi động lại.\n\n❓ Vấn đề đã được giải quyết chưa?`
    ),
    options: JSON.stringify(["conn_resolved", "conn_step2"]),
    icon: "📡",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // Step 2: APN設定
  {
    id: "conn_step2",
    parentId: "conn_step1",
    type: "answer",
    label: L(
      "STEP 2: APN設定を確認する",
      "STEP 2: Check APN Settings",
      "STEP 2: APN 설정 확인",
      "STEP 2: 检查APN设置",
      "STEP 2: ตรวจสอบการตั้งค่า APN",
      "STEP 2: Kiểm tra cài đặt APN"
    ),
    content: L(
      `【APN設定の確認】\n\niPhone: 設定 → モバイル通信 → yah.mobile → APNを確認\nAndroid: 設定 → ネットワーク → SIM → アクセスポイント名\n\nAPN: mobiledata\nユーザー名: (空欄)\nパスワード: (空欄)\n\nキャリア設定のアップデートも確認してください。\n設定 → 一般 → 情報 → キャリア設定アップデート\n\n❓ 解決しましたか？`,
      `【APN Settings Check】\n\niPhone: Settings → Mobile Data → yah.mobile → APN\nAndroid: Settings → Network → SIM → Access Point Names\n\nAPN: mobiledata\nUsername: (leave blank)\nPassword: (leave blank)\n\nAlso check for carrier settings update:\nSettings → General → About → Carrier Update\n\n❓ Did this solve your issue?`,
      `【APN 설정 확인】\n\niPhone: 설정 → 모바일 데이터 → yah.mobile → APN\nAndroid: 설정 → 네트워크 → SIM → 액세스 포인트 이름\n\nAPN: mobiledata\n사용자 이름: (비워두기)\n비밀번호: (비워두기)\n\n통신사 설정 업데이트도 확인하세요.\n\n❓ 해결되었나요?`,
      `【APN设置检查】\n\niPhone: 设置 → 移动数据 → yah.mobile → APN\nAndroid: 设置 → 网络 → SIM卡 → 接入点名称\n\nAPN: mobiledata\n用户名: (留空)\n密码: (留空)\n\n也请检查运营商设置更新。\n\n❓ 问题解决了吗？`,
      `【ตรวจสอบการตั้งค่า APN】\n\niPhone: การตั้งค่า → ข้อมูลมือถือ → yah.mobile → APN\nAndroid: การตั้งค่า → เครือข่าย → ซิม → ชื่อจุดเข้าถึง\n\nAPN: mobiledata\nชื่อผู้ใช้: (เว้นว่าง)\nรหัสผ่าน: (เว้นว่าง)\n\nตรวจสอบการอัปเดตการตั้งค่าผู้ให้บริการด้วย\n\n❓ แก้ไขได้แล้วหรือยัง?`,
      `【Kiểm tra cài đặt APN】\n\niPhone: Cài đặt → Dữ liệu di động → yah.mobile → APN\nAndroid: Cài đặt → Mạng → SIM → Tên điểm truy cập\n\nAPN: mobiledata\nTên người dùng: (để trống)\nMật khẩu: (để trống)\n\nKiểm tra cập nhật cài đặt nhà mạng.\n\n❓ Vấn đề đã được giải quyết chưa?`
    ),
    options: JSON.stringify(["conn_resolved", "conn_escalate"]),
    icon: "⚙️",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // 解決した
  {
    id: "conn_resolved",
    parentId: null,
    type: "answer",
    label: L(
      "✅ 解決した",
      "✅ Issue resolved",
      "✅ 해결되었습니다",
      "✅ 问题已解决",
      "✅ แก้ไขได้แล้ว",
      "✅ Đã giải quyết"
    ),
    content: L(
      "ご解決できて嬉しいです！他にご不明な点はございますか？",
      "We're glad the issue is resolved! Is there anything else we can help you with?",
      "해결되어 다행입니다! 다른 도움이 필요하신가요?",
      "很高兴问题已解决！还有其他需要帮助的吗？",
      "ยินดีที่ปัญหาได้รับการแก้ไข! มีอะไรอื่นที่ต้องการความช่วยเหลืออีกไหม?",
      "Rất vui vì vấn đề đã được giải quyết! Bạn có cần thêm hỗ trợ không?"
    ),
    options: JSON.stringify(["root"]),
    icon: "✅",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // エスカレーション（フォーム誘導）
  {
    id: "conn_escalate",
    parentId: null,
    type: "redirect_form",
    label: L(
      "🔴 専門サポートに相談する",
      "🔴 Contact Support Team",
      "🔴 전문 지원팀에 문의",
      "🔴 联系专业支持团队",
      "🔴 ติดต่อทีมสนับสนุน",
      "🔴 Liên hệ đội hỗ trợ"
    ),
    content: L(
      "上記の手順を全てお試しいただきありがとうございます。お客様の状況を詳しく確認させていただくため、サポートフォームにご入力ください。担当者が個別に対応いたします。",
      "Thank you for trying all the steps. Please fill out our support form so our team can assist you personally.",
      "모든 단계를 시도해 주셔서 감사합니다. 지원 양식을 작성해 주시면 담당자가 개별적으로 도와드리겠습니다.",
      "感谢您尝试了所有步骤。请填写支持表单，我们的团队将为您提供个人化帮助。",
      "ขอบคุณที่ลองทุกขั้นตอนแล้ว กรุณากรอกแบบฟอร์มสนับสนุน ทีมงานจะช่วยเหลือคุณเป็นการส่วนตัว",
      "Cảm ơn bạn đã thử tất cả các bước. Vui lòng điền vào biểu mẫu hỗ trợ để nhóm của chúng tôi có thể hỗ trợ bạn."
    ),
    options: null,
    icon: "🔴",
    formTrigger: 1,
    aiTrigger: 0,
    sortOrder: 0,
  },

  // ─── CATEGORY: 購入・プラン ──────────────────────────────────────────────
  {
    id: "purchase",
    parentId: "root",
    type: "question",
    label: L(
      "🛒 購入・プラン確認",
      "🛒 Purchase & Plans",
      "🛒 구매 및 요금제",
      "🛒 购买和套餐",
      "🛒 ซื้อและแผน",
      "🛒 Mua và gói cước"
    ),
    content: null,
    options: JSON.stringify(["purchase_plan", "purchase_payment", "purchase_flow"]),
    icon: "🛒",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // プラン選び
  {
    id: "purchase_plan",
    parentId: "purchase",
    type: "answer",
    label: L(
      "プランを選びたい",
      "I want to choose a plan",
      "요금제를 선택하고 싶습니다",
      "我想选择套餐",
      "ฉันต้องการเลือกแผน",
      "Tôi muốn chọn gói cước"
    ),
    content: L(
      `【yah.mobile 料金プラン一覧】\n\n📦 ライト: 1GB / 7日間 ¥1,500\n📦 スタンダード: 3GB / 14日間 ¥2,500\n📦 プレミアム: 7GB / 30日間 ¥4,000\n📦 アンリミテッド: 無制限 / 30日間 ¥6,000\n📦 短期1日: 500MB / 24時間 ¥800\n📦 追加データ: 1GB追加 ¥500\n\n💡 データを使い切っても追加購入可能です\n🌐 日本全国・3大キャリア対応`,
      `【yah.mobile Plan List】\n\n📦 Light: 1GB / 7 days ¥1,500\n📦 Standard: 3GB / 14 days ¥2,500\n📦 Premium: 7GB / 30 days ¥4,000\n📦 Unlimited: Unlimited / 30 days ¥6,000\n📦 Day Pass: 500MB / 24 hours ¥800\n📦 Add-on Data: +1GB ¥500\n\n💡 You can purchase add-on data anytime\n🌐 Nationwide Japan, 3 major carriers`,
      `【yah.mobile 요금제 목록】\n\n📦 라이트: 1GB / 7일 ¥1,500\n📦 스탠다드: 3GB / 14일 ¥2,500\n📦 프리미엄: 7GB / 30일 ¥4,000\n📦 무제한: 무제한 / 30일 ¥6,000\n📦 1일권: 500MB / 24시간 ¥800\n📦 추가 데이터: +1GB ¥500\n\n💡 데이터 소진 후 추가 구매 가능\n🌐 일본 전국 3대 통신사 지원`,
      `【yah.mobile 套餐列表】\n\n📦 轻量版: 1GB / 7天 ¥1,500\n📦 标准版: 3GB / 14天 ¥2,500\n📦 高级版: 7GB / 30天 ¥4,000\n📦 无限版: 无限 / 30天 ¥6,000\n📦 日票: 500MB / 24小时 ¥800\n📦 追加数据: +1GB ¥500\n\n💡 用完后可随时追加购买\n🌐 覆盖日本全国三大运营商`,
      `【รายการแผน yah.mobile】\n\n📦 ไลท์: 1GB / 7 วัน ¥1,500\n📦 สแตนดาร์ด: 3GB / 14 วัน ¥2,500\n📦 พรีเมียม: 7GB / 30 วัน ¥4,000\n📦 ไม่จำกัด: ไม่จำกัด / 30 วัน ¥6,000\n📦 รายวัน: 500MB / 24 ชั่วโมง ¥800\n📦 ข้อมูลเพิ่ม: +1GB ¥500\n\n💡 ซื้อข้อมูลเพิ่มได้ตลอดเวลา\n🌐 ครอบคลุมทั่วญี่ปุ่น 3 ผู้ให้บริการหลัก`,
      `【Danh sách gói cước yah.mobile】\n\n📦 Nhẹ: 1GB / 7 ngày ¥1,500\n📦 Tiêu chuẩn: 3GB / 14 ngày ¥2,500\n📦 Cao cấp: 7GB / 30 ngày ¥4,000\n📦 Không giới hạn: Không giới hạn / 30 ngày ¥6,000\n📦 Ngày: 500MB / 24 giờ ¥800\n📦 Dữ liệu thêm: +1GB ¥500\n\n💡 Có thể mua thêm dữ liệu bất cứ lúc nào\n🌐 Toàn quốc Nhật Bản, 3 nhà mạng lớn`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "📋",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // 支払い方法
  {
    id: "purchase_payment",
    parentId: "purchase",
    type: "answer",
    label: L(
      "支払い方法を確認したい",
      "Check payment methods",
      "결제 방법 확인",
      "查看支付方式",
      "ตรวจสอบวิธีชำระเงิน",
      "Kiểm tra phương thức thanh toán"
    ),
    content: L(
      `【対応支払い方法】\n\n💳 クレジットカード（Visa / Mastercard / AMEX）\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ 支払いは購入時に一括払いです\n※ 領収書はメールにて送付いたします`,
      `【Accepted Payment Methods】\n\n💳 Credit Card (Visa / Mastercard / AMEX)\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ Full payment at time of purchase\n※ Receipt will be sent by email`,
      `【결제 방법】\n\n💳 신용카드 (Visa / Mastercard / AMEX)\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ 구매 시 일시불 결제\n※ 영수증은 이메일로 발송`,
      `【支付方式】\n\n💳 信用卡（Visa / Mastercard / AMEX）\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ 购买时一次性付款\n※ 收据将通过电子邮件发送`,
      `【วิธีชำระเงิน】\n\n💳 บัตรเครดิต (Visa / Mastercard / AMEX)\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ ชำระเต็มจำนวนเมื่อซื้อ\n※ ใบเสร็จจะส่งทางอีเมล`,
      `【Phương thức thanh toán】\n\n💳 Thẻ tín dụng (Visa / Mastercard / AMEX)\n📱 Apple Pay / Google Pay\n🌐 PayPal\n\n※ Thanh toán đầy đủ khi mua\n※ Biên lai sẽ được gửi qua email`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "💳",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // 購入後の流れ
  {
    id: "purchase_flow",
    parentId: "purchase",
    type: "answer",
    label: L(
      "購入後の流れを確認したい",
      "What happens after purchase?",
      "구매 후 절차 확인",
      "购买后的流程",
      "ขั้นตอนหลังซื้อ",
      "Quy trình sau khi mua"
    ),
    content: L(
      `【購入後の流れ】\n\n1️⃣ 購入完了 → メールでQRコードが届く（即時）\n2️⃣ QRコードをスキャンしてeSIMをインストール\n3️⃣ データローミングをONにする\n4️⃣ 日本到着後、自動的に接続されます\n\n⚠️ QRコードは1回のみ使用可能です\n⚠️ 有効期限はeSIMアクティベート後から起算`,
      `【After Purchase Flow】\n\n1️⃣ Purchase complete → QR code sent by email (instant)\n2️⃣ Scan QR code to install eSIM\n3️⃣ Enable Data Roaming\n4️⃣ Automatically connects upon arrival in Japan\n\n⚠️ QR code can only be used once\n⚠️ Validity starts from eSIM activation`,
      `【구매 후 절차】\n\n1️⃣ 구매 완료 → 이메일로 QR 코드 즉시 발송\n2️⃣ QR 코드 스캔하여 eSIM 설치\n3️⃣ 데이터 로밍 켜기\n4️⃣ 일본 도착 후 자동 연결\n\n⚠️ QR 코드는 1회만 사용 가능\n⚠️ 유효기간은 eSIM 활성화 후 시작`,
      `【购买后流程】\n\n1️⃣ 购买完成 → 立即通过邮件发送二维码\n2️⃣ 扫描二维码安装eSIM\n3️⃣ 开启数据漫游\n4️⃣ 抵达日本后自动连接\n\n⚠️ 二维码只能使用一次\n⚠️ 有效期从eSIM激活后开始计算`,
      `【ขั้นตอนหลังซื้อ】\n\n1️⃣ ซื้อเสร็จ → รับ QR Code ทางอีเมลทันที\n2️⃣ สแกน QR Code เพื่อติดตั้ง eSIM\n3️⃣ เปิด Data Roaming\n4️⃣ เชื่อมต่ออัตโนมัติเมื่อถึงญี่ปุ่น\n\n⚠️ QR Code ใช้ได้ครั้งเดียว\n⚠️ อายุการใช้งานเริ่มนับจากการเปิดใช้ eSIM`,
      `【Quy trình sau khi mua】\n\n1️⃣ Mua xong → Nhận mã QR qua email ngay lập tức\n2️⃣ Quét mã QR để cài đặt eSIM\n3️⃣ Bật Chuyển vùng dữ liệu\n4️⃣ Tự động kết nối khi đến Nhật Bản\n\n⚠️ Mã QR chỉ dùng được một lần\n⚠️ Thời hạn tính từ khi kích hoạt eSIM`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "📦",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 2,
  },

  // ─── CATEGORY: 返金・キャンセル ──────────────────────────────────────────
  {
    id: "refund",
    parentId: "root",
    type: "question",
    label: L(
      "💰 返金・キャンセル",
      "💰 Refund & Cancel",
      "💰 환불 및 취소",
      "💰 退款和取消",
      "💰 คืนเงินและยกเลิก",
      "💰 Hoàn tiền & Hủy"
    ),
    content: null,
    options: JSON.stringify(["refund_qr_check"]),
    icon: "💰",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 2,
  },
  // QRコード確認
  {
    id: "refund_qr_check",
    parentId: "refund",
    type: "question",
    label: L(
      "QRコードはすでに発行されましたか？",
      "Has the QR code already been issued?",
      "QR 코드가 이미 발급되었나요?",
      "二维码已经发放了吗？",
      "QR Code ถูกออกให้แล้วหรือยัง?",
      "Mã QR đã được cấp chưa?"
    ),
    content: null,
    options: JSON.stringify(["refund_no_qr", "refund_has_qr"]),
    icon: "❓",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // QRコード未発行 → キャンセル可能
  {
    id: "refund_no_qr",
    parentId: "refund_qr_check",
    type: "answer",
    label: L(
      "いいえ、まだ届いていない",
      "No, not yet received",
      "아니요, 아직 받지 못했습니다",
      "没有，还没收到",
      "ยัง ยังไม่ได้รับ",
      "Chưa, chưa nhận được"
    ),
    content: L(
      `【キャンセル手順】\n\nQRコード未発行の場合、購入から24時間以内であればキャンセルが可能です。\n\nキャンセルをご希望の場合は、下記のサポートフォームよりご連絡ください。\n\n⚠️ 購入から24時間を超えた場合はキャンセルできない場合があります`,
      `【Cancellation Process】\n\nIf the QR code has not been issued, cancellation is possible within 24 hours of purchase.\n\nPlease contact us via the support form below.\n\n⚠️ Cancellation may not be possible after 24 hours from purchase`,
      `【취소 절차】\n\nQR 코드가 발급되지 않은 경우 구매 후 24시간 이내에 취소 가능합니다.\n\n아래 지원 양식을 통해 연락해 주세요.\n\n⚠️ 구매 후 24시간이 지나면 취소가 불가능할 수 있습니다`,
      `【取消流程】\n\n如果二维码尚未发放，购买后24小时内可以取消。\n\n请通过下方支持表单联系我们。\n\n⚠️ 购买后超过24小时可能无法取消`,
      `【ขั้นตอนการยกเลิก】\n\nหาก QR Code ยังไม่ถูกออก สามารถยกเลิกได้ภายใน 24 ชั่วโมงหลังซื้อ\n\nกรุณาติดต่อผ่านแบบฟอร์มสนับสนุนด้านล่าง\n\n⚠️ อาจไม่สามารถยกเลิกได้หลังจาก 24 ชั่วโมง`,
      `【Quy trình hủy】\n\nNếu mã QR chưa được cấp, có thể hủy trong vòng 24 giờ sau khi mua.\n\nVui lòng liên hệ qua biểu mẫu hỗ trợ bên dưới.\n\n⚠️ Có thể không thể hủy sau 24 giờ kể từ khi mua`
    ),
    options: null,
    icon: "✅",
    formTrigger: 1,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // QRコード発行済み → 原則返金不可
  {
    id: "refund_has_qr",
    parentId: "refund_qr_check",
    type: "question",
    label: L(
      "はい、QRコードは受け取った",
      "Yes, I have received the QR code",
      "네, QR 코드를 받았습니다",
      "是的，已经收到了二维码",
      "ใช่ ได้รับ QR Code แล้ว",
      "Có, tôi đã nhận được mã QR"
    ),
    content: L(
      `⚠️【重要なご案内】\n\nQRコードが発行された後は、特定商取引法に基づき、原則として返金・キャンセルはお受けできません。\n\nただし、以下の場合は個別にご対応いたします：\n• eSIMが正常に動作しない（技術的な問題）\n• 購入内容に誤りがあった\n\nどちらの理由でご連絡ですか？`,
      `⚠️【Important Notice】\n\nAfter the QR code has been issued, refunds and cancellations are generally not accepted under Japanese consumer protection law.\n\nHowever, we will handle the following cases individually:\n• eSIM not working properly (technical issue)\n• Error in purchase content\n\nWhich reason applies to you?`,
      `⚠️【중요 안내】\n\nQR 코드가 발급된 후에는 일본 소비자 보호법에 따라 원칙적으로 환불 및 취소를 받지 않습니다.\n\n단, 다음의 경우에는 개별적으로 대응합니다：\n• eSIM이 정상적으로 작동하지 않는 경우 (기술적 문제)\n• 구매 내용에 오류가 있는 경우\n\n어떤 이유로 연락하셨나요?`,
      `⚠️【重要提示】\n\nQR码发放后，根据日本消费者保护法，原则上不接受退款和取消。\n\n但以下情况将个别处理：\n• eSIM无法正常工作（技术问题）\n• 购买内容有误\n\n您是因为哪种原因联系我们？`,
      `⚠️【ประกาศสำคัญ】\n\nหลังจากออก QR Code แล้ว โดยหลักการตามกฎหมายคุ้มครองผู้บริโภคญี่ปุ่น จะไม่รับการคืนเงินและยกเลิก\n\nอย่างไรก็ตาม กรณีต่อไปนี้จะได้รับการจัดการเป็นรายกรณี：\n• eSIM ไม่ทำงานอย่างถูกต้อง (ปัญหาทางเทคนิค)\n• มีข้อผิดพลาดในเนื้อหาการซื้อ\n\nคุณติดต่อมาด้วยเหตุผลใด?`,
      `⚠️【Thông báo quan trọng】\n\nSau khi mã QR được cấp, theo luật bảo vệ người tiêu dùng Nhật Bản, về nguyên tắc không chấp nhận hoàn tiền và hủy.\n\nTuy nhiên, các trường hợp sau sẽ được xử lý riêng：\n• eSIM không hoạt động bình thường (vấn đề kỹ thuật)\n• Có lỗi trong nội dung mua hàng\n\nBạn liên hệ vì lý do nào?`
    ),
    options: JSON.stringify(["refund_technical", "refund_request"]),
    icon: "⚠️",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // 技術的な問題 → 接続トラブルフローへ
  {
    id: "refund_technical",
    parentId: "refund_has_qr",
    type: "question",
    label: L(
      "eSIMが使えない・繋がらない",
      "eSIM not working / can't connect",
      "eSIM이 작동하지 않음 / 연결 안 됨",
      "eSIM无法使用/无法连接",
      "eSIM ใช้งานไม่ได้ / เชื่อมต่อไม่ได้",
      "eSIM không hoạt động / không kết nối được"
    ),
    content: L(
      "まずeSIMが正常に動作するようサポートいたします。接続トラブルの解決手順をご案内します。",
      "Let us first help you get the eSIM working. We'll guide you through the connection troubleshooting steps.",
      "먼저 eSIM이 정상적으로 작동하도록 도와드리겠습니다. 연결 문제 해결 단계를 안내해 드립니다.",
      "让我们先帮您让eSIM正常工作。我们将引导您完成连接故障排除步骤。",
      "ให้เราช่วยให้ eSIM ทำงานได้ก่อน เราจะแนะนำขั้นตอนการแก้ไขปัญหาการเชื่อมต่อ",
      "Hãy để chúng tôi giúp eSIM hoạt động trước. Chúng tôi sẽ hướng dẫn bạn qua các bước khắc phục sự cố kết nối."
    ),
    options: JSON.stringify(["conn_step1"]),
    icon: "🔧",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // 返金希望 → フォーム誘導
  {
    id: "refund_request",
    parentId: "refund_has_qr",
    type: "redirect_form",
    label: L(
      "それでも返金を希望する",
      "I still want a refund",
      "그래도 환불을 원합니다",
      "我仍然希望退款",
      "ฉันยังต้องการคืนเงิน",
      "Tôi vẫn muốn hoàn tiền"
    ),
    content: L(
      "お客様のご状況を確認の上、個別にご対応いたします。サポートフォームにご入力ください。担当者より3営業日以内にご連絡いたします。",
      "We will review your situation and respond individually. Please fill out the support form. Our team will contact you within 3 business days.",
      "고객님의 상황을 확인 후 개별적으로 대응하겠습니다. 지원 양식을 작성해 주세요. 담당자가 3영업일 이내에 연락드리겠습니다.",
      "我们将审查您的情况并单独回应。请填写支持表单。我们的团队将在3个工作日内与您联系。",
      "เราจะตรวจสอบสถานการณ์ของคุณและตอบสนองเป็นรายบุคคล กรุณากรอกแบบฟอร์มสนับสนุน ทีมงานจะติดต่อคุณภายใน 3 วันทำการ",
      "Chúng tôi sẽ xem xét tình huống của bạn và phản hồi riêng. Vui lòng điền vào biểu mẫu hỗ trợ. Nhóm của chúng tôi sẽ liên hệ trong vòng 3 ngày làm việc."
    ),
    options: null,
    icon: "📝",
    formTrigger: 1,
    aiTrigger: 0,
    sortOrder: 1,
  },

  // ─── CATEGORY: その他 ────────────────────────────────────────────────────
  {
    id: "other",
    parentId: "root",
    type: "question",
    label: L(
      "💬 その他の質問",
      "💬 Other Questions",
      "💬 기타 질문",
      "💬 其他问题",
      "💬 คำถามอื่นๆ",
      "💬 Câu hỏi khác"
    ),
    content: null,
    options: JSON.stringify(["other_coverage", "other_device", "other_expiry", "other_ai"]),
    icon: "💬",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 3,
  },
  // 対応エリア
  {
    id: "other_coverage",
    parentId: "other",
    type: "answer",
    label: L(
      "対応エリア・キャリアについて",
      "Coverage & Carriers",
      "커버리지 및 통신사",
      "覆盖范围和运营商",
      "พื้นที่ครอบคลุมและผู้ให้บริการ",
      "Vùng phủ sóng và nhà mạng"
    ),
    content: L(
      `【対応エリア・キャリア】\n\n🌐 日本全国対応\n📡 NTTドコモ / au / ソフトバンク（3大キャリア）\n\n✅ 主要都市・観光地・空港での接続を確認済み\n✅ 地下鉄・新幹線内でも利用可能\n\n⚠️ 山間部・離島など一部エリアでは電波が弱い場合があります`,
      `【Coverage & Carriers】\n\n🌐 Nationwide Japan\n📡 NTT Docomo / au / SoftBank (3 major carriers)\n\n✅ Verified connectivity in major cities, tourist spots, airports\n✅ Available on subways and Shinkansen\n\n⚠️ Signal may be weak in mountainous areas and remote islands`,
      `【커버리지 및 통신사】\n\n🌐 일본 전국\n📡 NTT 도코모 / au / 소프트뱅크 (3대 통신사)\n\n✅ 주요 도시, 관광지, 공항에서 연결 확인\n✅ 지하철, 신칸센에서도 이용 가능\n\n⚠️ 산간 지역, 외딴 섬에서는 신호가 약할 수 있습니다`,
      `【覆盖范围和运营商】\n\n🌐 日本全国\n📡 NTT Docomo / au / SoftBank（三大运营商）\n\n✅ 已确认主要城市、旅游景点、机场的连接\n✅ 地铁、新干线内可用\n\n⚠️ 山区和偏远岛屿信号可能较弱`,
      `【พื้นที่ครอบคลุมและผู้ให้บริการ】\n\n🌐 ทั่วประเทศญี่ปุ่น\n📡 NTT Docomo / au / SoftBank (3 ผู้ให้บริการหลัก)\n\n✅ ยืนยันการเชื่อมต่อในเมืองหลัก สถานที่ท่องเที่ยว สนามบิน\n✅ ใช้ได้บนรถไฟใต้ดินและชินคันเซน\n\n⚠️ สัญญาณอาจอ่อนในพื้นที่ภูเขาและเกาะห่างไกล`,
      `【Vùng phủ sóng và nhà mạng】\n\n🌐 Toàn quốc Nhật Bản\n📡 NTT Docomo / au / SoftBank (3 nhà mạng lớn)\n\n✅ Đã xác nhận kết nối tại các thành phố lớn, điểm du lịch, sân bay\n✅ Có thể dùng trên tàu điện ngầm và Shinkansen\n\n⚠️ Tín hiệu có thể yếu ở vùng núi và đảo xa`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "📡",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 0,
  },
  // 対応機種
  {
    id: "other_device",
    parentId: "other",
    type: "answer",
    label: L(
      "対応機種について",
      "Compatible Devices",
      "호환 기기",
      "兼容设备",
      "อุปกรณ์ที่รองรับ",
      "Thiết bị tương thích"
    ),
    content: L(
      `【eSIM対応機種】\n\n📱 iPhone: XS以降（iOS 12.1以上）\n📱 Android: eSIM対応機種（Android 9以上）\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ Samsung Galaxy S21以降\n✅ Google Pixel 3以降\n✅ その他eSIM対応端末\n\n⚠️ SIMロック解除が必要な場合があります\n⚠️ 格安SIM（MVNO）端末は対応していない場合があります`,
      `【Compatible Devices】\n\n📱 iPhone: XS and later (iOS 12.1+)\n📱 Android: eSIM-compatible devices (Android 9+)\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ Samsung Galaxy S21 and later\n✅ Google Pixel 3 and later\n✅ Other eSIM-compatible devices\n\n⚠️ SIM unlock may be required\n⚠️ Some MVNO devices may not be compatible`,
      `【호환 기기】\n\n📱 iPhone: XS 이상 (iOS 12.1+)\n📱 Android: eSIM 호환 기기 (Android 9+)\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ Samsung Galaxy S21 이상\n✅ Google Pixel 3 이상\n✅ 기타 eSIM 호환 기기\n\n⚠️ SIM 잠금 해제가 필요할 수 있습니다\n⚠️ 일부 MVNO 기기는 호환되지 않을 수 있습니다`,
      `【兼容设备】\n\n📱 iPhone: XS及以上（iOS 12.1+）\n📱 Android: eSIM兼容设备（Android 9+）\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ 三星Galaxy S21及以上\n✅ 谷歌Pixel 3及以上\n✅ 其他eSIM兼容设备\n\n⚠️ 可能需要解锁SIM\n⚠️ 部分MVNO设备可能不兼容`,
      `【อุปกรณ์ที่รองรับ】\n\n📱 iPhone: XS ขึ้นไป (iOS 12.1+)\n📱 Android: อุปกรณ์ที่รองรับ eSIM (Android 9+)\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ Samsung Galaxy S21 ขึ้นไป\n✅ Google Pixel 3 ขึ้นไป\n✅ อุปกรณ์อื่นๆ ที่รองรับ eSIM\n\n⚠️ อาจต้องปลดล็อค SIM\n⚠️ อุปกรณ์ MVNO บางรุ่นอาจไม่รองรับ`,
      `【Thiết bị tương thích】\n\n📱 iPhone: XS trở lên (iOS 12.1+)\n📱 Android: Thiết bị hỗ trợ eSIM (Android 9+)\n\n✅ iPhone 15 / 14 / 13 / 12 / 11 / XS\n✅ Samsung Galaxy S21 trở lên\n✅ Google Pixel 3 trở lên\n✅ Các thiết bị hỗ trợ eSIM khác\n\n⚠️ Có thể cần mở khóa SIM\n⚠️ Một số thiết bị MVNO có thể không tương thích`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "📱",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 1,
  },
  // 有効期限
  {
    id: "other_expiry",
    parentId: "other",
    type: "answer",
    label: L(
      "有効期限について",
      "About Validity Period",
      "유효 기간",
      "有效期",
      "อายุการใช้งาน",
      "Thời hạn hiệu lực"
    ),
    content: L(
      `【有効期限について】\n\n⏱️ 有効期限はeSIMをアクティベート（最初に接続）した時点から起算されます\n\n📦 ライト: 7日間\n📦 スタンダード: 14日間\n📦 プレミアム: 30日間\n📦 アンリミテッド: 30日間\n📦 1日券: 24時間\n\n⚠️ QRコードをスキャンしただけでは有効期限は始まりません\n⚠️ 日本到着前にインストールしておくことをおすすめします`,
      `【Validity Period】\n\n⏱️ Validity starts from when the eSIM is activated (first connection)\n\n📦 Light: 7 days\n📦 Standard: 14 days\n📦 Premium: 30 days\n📦 Unlimited: 30 days\n📦 Day Pass: 24 hours\n\n⚠️ Validity does NOT start just from scanning the QR code\n⚠️ We recommend installing before arriving in Japan`,
      `【유효 기간】\n\n⏱️ 유효 기간은 eSIM 활성화(첫 연결) 시점부터 시작됩니다\n\n📦 라이트: 7일\n📦 스탠다드: 14일\n📦 프리미엄: 30일\n📦 무제한: 30일\n📦 1일권: 24시간\n\n⚠️ QR 코드 스캔만으로는 유효 기간이 시작되지 않습니다\n⚠️ 일본 도착 전에 설치하는 것을 권장합니다`,
      `【有效期】\n\n⏱️ 有效期从eSIM激活（首次连接）时开始计算\n\n📦 轻量版: 7天\n📦 标准版: 14天\n📦 高级版: 30天\n📦 无限版: 30天\n📦 日票: 24小时\n\n⚠️ 仅扫描二维码不会开始有效期\n⚠️ 建议在抵达日本前安装`,
      `【อายุการใช้งาน】\n\n⏱️ อายุการใช้งานเริ่มนับจากการเปิดใช้งาน eSIM (การเชื่อมต่อครั้งแรก)\n\n📦 ไลท์: 7 วัน\n📦 สแตนดาร์ด: 14 วัน\n📦 พรีเมียม: 30 วัน\n📦 ไม่จำกัด: 30 วัน\n📦 รายวัน: 24 ชั่วโมง\n\n⚠️ การสแกน QR Code เพียงอย่างเดียวไม่ทำให้อายุการใช้งานเริ่มต้น\n⚠️ แนะนำให้ติดตั้งก่อนเดินทางถึงญี่ปุ่น`,
      `【Thời hạn hiệu lực】\n\n⏱️ Thời hạn bắt đầu từ khi kích hoạt eSIM (kết nối lần đầu)\n\n📦 Nhẹ: 7 ngày\n📦 Tiêu chuẩn: 14 ngày\n📦 Cao cấp: 30 ngày\n📦 Không giới hạn: 30 ngày\n📦 Ngày: 24 giờ\n\n⚠️ Thời hạn KHÔNG bắt đầu chỉ từ việc quét mã QR\n⚠️ Khuyến nghị cài đặt trước khi đến Nhật Bản`
    ),
    options: JSON.stringify(["conn_resolved", "other_ai"]),
    icon: "⏱️",
    formTrigger: 0,
    aiTrigger: 0,
    sortOrder: 2,
  },
  // AIチャットへ
  {
    id: "other_ai",
    parentId: "other",
    type: "redirect_ai",
    label: L(
      "💬 上記にない質問をする",
      "💬 Ask a different question",
      "💬 다른 질문하기",
      "💬 提问其他问题",
      "💬 ถามคำถามอื่น",
      "💬 Hỏi câu hỏi khác"
    ),
    content: L(
      "AIサポートに接続します。何でもお気軽にご質問ください。",
      "Connecting to AI support. Feel free to ask anything.",
      "AI 지원에 연결합니다. 무엇이든 편하게 질문하세요.",
      "连接到AI支持。请随时提问。",
      "เชื่อมต่อกับการสนับสนุน AI กรุณาถามได้เลย",
      "Kết nối với hỗ trợ AI. Hãy hỏi bất cứ điều gì."
    ),
    options: null,
    icon: "🤖",
    formTrigger: 0,
    aiTrigger: 1,
    sortOrder: 3,
  },
];

// Insert all nodes
let inserted = 0;
let skipped = 0;
for (const node of nodes) {
  try {
    await db.execute(
      `INSERT INTO chat_flow_nodes (id, parentId, type, label, content, options, icon, formTrigger, aiTrigger, sortOrder, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         content = VALUES(content),
         options = VALUES(options),
         icon = VALUES(icon),
         formTrigger = VALUES(formTrigger),
         aiTrigger = VALUES(aiTrigger),
         sortOrder = VALUES(sortOrder)`,
      [
        node.id,
        node.parentId,
        node.type,
        node.label,
        node.content,
        node.options,
        node.icon,
        node.formTrigger,
        node.aiTrigger,
        node.sortOrder,
      ]
    );
    inserted++;
    console.log(`✅ ${node.id}`);
  } catch (e) {
    console.error(`❌ ${node.id}: ${e.message}`);
    skipped++;
  }
}

console.log(`\n🎉 Done: ${inserted} inserted/updated, ${skipped} failed`);
await db.end();
