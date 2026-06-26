/**
 * Rebuild RAG Documents — Q&A Format with Small Chunks
 *
 * Strategy:
 * 1. Delete ALL existing RAG documents
 * 2. Insert new documents in Q&A format where:
 *    - Title = exact user question patterns (what users actually type)
 *    - Content = concise, targeted answer
 *    - Each document is ONE specific question/scenario (small chunk)
 * 3. This makes embeddings match user queries much more closely
 *
 * Target: Connection 0.8+, Pricing 0.9+, Refund 0.9+
 */

import "dotenv/config";
import { createPool } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!DATABASE_URL || !OPENAI_API_KEY) { console.error("Missing env"); process.exit(1); }

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

// ── Q&A Documents ─────────────────────────────────────────────────────────────
// Each doc: { title: "question patterns users type", content: "answer", language, category }
// Title is CRITICAL — it's what gets embedded and compared to user queries

const QA_DOCS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION - iPhone Post-Install (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "eSIMをインストールしたがインターネットに繋がらない iPhone 接続できない データ通信できない ネットに繋がらない",
    content: `【iPhone接続トラブルシューティング】
1. 設定 > モバイル通信 > yah.mobileのeSIM回線がオンになっていることを確認
2. 設定 > モバイル通信 > yah.mobile > データローミングをオンにする
3. 設定 > モバイル通信 > yah.mobile > モバイルデータ通信ネットワーク > APN: yah.mobile
4. yah.mobileをモバイルデータ通信の主回線に設定
5. 機内モードをオン→オフに切り替え
6. 設定 > 一般 > 情報 > キャリア設定アップデートを確認
7. デバイスを再起動
8. 最終手段：ネットワーク設定をリセット（設定 > 一般 > リセット > ネットワーク設定をリセット）`,
    language: "ja", category: "connection"
  },
  {
    title: "installed eSIM but can't connect to internet iPhone not working no data connection no internet",
    content: `【iPhone Connection Troubleshooting】
1. Settings > Cellular > Confirm yah.mobile eSIM line is ON
2. Settings > Cellular > yah.mobile > Turn on Data Roaming
3. Settings > Cellular > yah.mobile > Cellular Data Network > APN: yah.mobile
4. Set yah.mobile as Primary for Cellular Data
5. Toggle Airplane Mode ON then OFF
6. Settings > General > About > Check for Carrier Settings Update
7. Restart device
8. Last resort: Reset Network Settings (Settings > General > Reset > Reset Network Settings)`,
    language: "en", category: "connection"
  },
  {
    title: "eSIM을 설치했는데 인터넷이 안 됩니다 iPhone 연결 안됨 데이터 안됨 인터넷 연결 실패",
    content: `【iPhone 연결 문제 해결】
1. 설정 > 셀룰러 > yah.mobile eSIM 회선이 켜져 있는지 확인
2. 설정 > 셀룰러 > yah.mobile > 데이터 로밍 켜기
3. 설정 > 셀룰러 > yah.mobile > 셀룰러 데이터 네트워크 > APN: yah.mobile
4. yah.mobile을 셀룰러 데이터 기본 회선으로 설정
5. 비행기 모드 켜기 → 끄기
6. 설정 > 일반 > 정보 > 이동통신사 설정 업데이트 확인
7. 기기 재시작
8. 최후 수단: 네트워크 설정 재설정`,
    language: "ko", category: "connection"
  },
  {
    title: "安装了eSIM但无法连接网络 iPhone连不上 没有网络 数据连接失败 上不了网",
    content: `【iPhone连接故障排除】
1. 设置 > 蜂窝网络 > 确认yah.mobile eSIM线路已开启
2. 设置 > 蜂窝网络 > yah.mobile > 开启数据漫游
3. 设置 > 蜂窝网络 > yah.mobile > 蜂窝数据网络 > APN: yah.mobile
4. 将yah.mobile设为蜂窝数据主线路
5. 开启飞行模式后关闭
6. 设置 > 通用 > 关于本机 > 检查运营商设置更新
7. 重启设备
8. 最后手段：重置网络设置`,
    language: "zh", category: "connection"
  },
  {
    title: "ติดตั้ง eSIM แล้วแต่เชื่อมต่ออินเทอร์เน็ตไม่ได้ iPhone ใช้เน็ตไม่ได้ ไม่มีสัญญาณ",
    content: `【iPhone แก้ปัญหาการเชื่อมต่อ】
1. ตั้งค่า > เซลลูลาร์ > ตรวจสอบว่าสาย eSIM ของ yah.mobile เปิดอยู่
2. ตั้งค่า > เซลลูลาร์ > yah.mobile > เปิดการโรมมิ่งข้อมูล
3. ตั้งค่า > เซลลูลาร์ > yah.mobile > เครือข่ายข้อมูลเซลลูลาร์ > APN: yah.mobile
4. ตั้ง yah.mobile เป็นสายหลักสำหรับข้อมูลเซลลูลาร์
5. เปิดโหมดเครื่องบิน แล้วปิด
6. ตั้งค่า > ทั่วไป > เกี่ยวกับ > ตรวจสอบอัปเดตการตั้งค่าผู้ให้บริการ
7. รีสตาร์ทอุปกรณ์
8. วิธีสุดท้าย: รีเซ็ตการตั้งค่าเครือข่าย`,
    language: "th", category: "connection"
  },
  {
    title: "Đã cài đặt eSIM nhưng không kết nối được internet iPhone không có mạng không vào được mạng",
    content: `【iPhone Khắc phục sự cố kết nối】
1. Cài đặt > Di động > Xác nhận đường dây eSIM yah.mobile đã BẬT
2. Cài đặt > Di động > yah.mobile > Bật Chuyển vùng dữ liệu
3. Cài đặt > Di động > yah.mobile > Mạng dữ liệu di động > APN: yah.mobile
4. Đặt yah.mobile làm đường dây chính cho Dữ liệu di động
5. Bật Chế độ máy bay rồi TẮT
6. Cài đặt > Cài đặt chung > Giới thiệu > Kiểm tra Cập nhật cài đặt nhà mạng
7. Khởi động lại thiết bị
8. Biện pháp cuối: Đặt lại cài đặt mạng`,
    language: "vi", category: "connection"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION - "still not connecting" follow-up (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "まだ繋がらない それでも繋がらない 設定確認したが繋がらない データローミングオンにしても繋がらない",
    content: `【まだ繋がらない場合の追加手順】
前の手順を試しても繋がらない場合：
1. APN設定を再確認：設定 > モバイル通信 > yah.mobile > モバイルデータ通信ネットワーク > APN欄に「yah.mobile」と正確に入力
2. 他のeSIM/SIM回線を一時的にオフにする
3. 設定 > 一般 > 情報 で「キャリア設定アップデート」のポップアップが出たら更新
4. 機内モードを30秒間オンにしてからオフ
5. デバイスを完全に再起動（電源オフ→10秒待機→電源オン）
6. 最終手段：設定 > 一般 > リセット > ネットワーク設定をリセット（Wi-Fiパスワードも消えます）
7. それでも解決しない場合はyah.mobi/appのお問い合わせフォームからご連絡ください`,
    language: "ja", category: "connection"
  },
  {
    title: "still not working still not connecting checked settings still no connection data roaming is on but still nothing",
    content: `【Still Not Connecting - Additional Steps】
If previous steps didn't work:
1. Re-check APN: Settings > Cellular > yah.mobile > Cellular Data Network > Type "yah.mobile" exactly
2. Temporarily disable other eSIM/SIM lines
3. Check Settings > General > About for Carrier Settings Update popup
4. Keep Airplane Mode ON for 30 seconds, then turn OFF
5. Full restart: Power off → wait 10 seconds → Power on
6. Last resort: Reset Network Settings (Settings > General > Reset > Reset Network Settings - this erases Wi-Fi passwords)
7. If still unresolved, contact us via the form at yah.mobi/app`,
    language: "en", category: "connection"
  },
  {
    title: "여전히 안 됩니다 아직도 연결 안됨 설정 확인했는데 안됨 데이터 로밍 켰는데도 안됨",
    content: `【여전히 연결 안 될 때 추가 단계】
1. APN 재확인: 설정 > 셀룰러 > yah.mobile > 셀룰러 데이터 네트워크 > "yah.mobile" 정확히 입력
2. 다른 eSIM/SIM 회선 일시적으로 끄기
3. 설정 > 일반 > 정보에서 이동통신사 설정 업데이트 팝업 확인
4. 비행기 모드 30초간 켜두었다가 끄기
5. 완전 재시작: 전원 끄기 → 10초 대기 → 전원 켜기
6. 최후 수단: 네트워크 설정 재설정
7. 그래도 해결 안 되면 yah.mobi/app 문의 양식으로 연락`,
    language: "ko", category: "connection"
  },
  {
    title: "还是连不上 检查了设置还是不行 数据漫游开了还是没网 依然无法连接",
    content: `【仍然无法连接的额外步骤】
1. 重新检查APN：设置 > 蜂窝网络 > yah.mobile > 蜂窝数据网络 > 准确输入"yah.mobile"
2. 暂时关闭其他eSIM/SIM线路
3. 检查设置 > 通用 > 关于本机是否有运营商设置更新弹窗
4. 飞行模式保持开启30秒后关闭
5. 完全重启：关机 → 等待10秒 → 开机
6. 最后手段：重置网络设置
7. 仍未解决请通过yah.mobi/app联系我们`,
    language: "zh", category: "connection"
  },
  {
    title: "ยังไม่ได้ ตรวจสอบแล้วยังเชื่อมต่อไม่ได้ เปิดโรมมิ่งแล้วยังไม่มีเน็ต",
    content: `【ยังเชื่อมต่อไม่ได้ - ขั้นตอนเพิ่มเติม】
1. ตรวจ APN อีกครั้ง: ตั้งค่า > เซลลูลาร์ > yah.mobile > เครือข่ายข้อมูล > พิมพ์ "yah.mobile" ให้ถูกต้อง
2. ปิดสาย eSIM/SIM อื่นชั่วคราว
3. ตรวจสอบการอัปเดตการตั้งค่าผู้ให้บริการ
4. เปิดโหมดเครื่องบิน 30 วินาที แล้วปิด
5. รีสตาร์ทเต็มรูปแบบ: ปิดเครื่อง → รอ 10 วินาที → เปิดเครื่อง
6. วิธีสุดท้าย: รีเซ็ตการตั้งค่าเครือข่าย
7. ยังไม่ได้ผล ติดต่อเราผ่านแบบฟอร์มที่ yah.mobi/app`,
    language: "th", category: "connection"
  },
  {
    title: "Vẫn không được vẫn không kết nối được đã kiểm tra cài đặt vẫn không có mạng",
    content: `【Vẫn không kết nối - Các bước bổ sung】
1. Kiểm tra lại APN: Cài đặt > Di động > yah.mobile > Mạng dữ liệu > Nhập chính xác "yah.mobile"
2. Tạm tắt các đường dây eSIM/SIM khác
3. Kiểm tra cập nhật cài đặt nhà mạng
4. Bật Chế độ máy bay 30 giây rồi tắt
5. Khởi động lại hoàn toàn: Tắt nguồn → đợi 10 giây → Bật nguồn
6. Biện pháp cuối: Đặt lại cài đặt mạng
7. Nếu vẫn không được, liên hệ qua biểu mẫu tại yah.mobi/app`,
    language: "vi", category: "connection"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION - Android Post-Install (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "AndroidにeSIMをインストールしたが繋がらない Android接続できない Androidデータ通信できない",
    content: `【Android接続トラブルシューティング】
1. 設定 > ネットワークとインターネット > SIM > yah.mobileを有効にする
2. yah.mobileのデータローミングをオンにする
3. アクセスポイント名 > 追加：名前=yah.mobile、APN=yah.mobile
4. yah.mobileをモバイルデータのデフォルトに設定
5. 機内モードをオン→オフに切り替え
6. デバイスを再起動
7. 最終手段：Wi-Fi、モバイル、Bluetoothをリセット`,
    language: "ja", category: "connection"
  },
  {
    title: "Android phone eSIM installed but no data connection Android not connecting can't get internet on Android",
    content: `【Android Connection Troubleshooting】
1. Settings > Network & Internet > SIMs > Enable yah.mobile
2. Enable Data Roaming for yah.mobile SIM
3. Access Point Names > Add: Name=yah.mobile, APN=yah.mobile
4. Set yah.mobile as default for Mobile Data
5. Toggle Airplane Mode ON then OFF
6. Restart device
7. Last resort: Reset Wi-Fi, mobile & Bluetooth`,
    language: "en", category: "connection"
  },
  {
    title: "Android eSIM 설치했는데 데이터 안됨 안드로이드 연결 안됨 인터넷 안됨",
    content: `【Android 연결 문제 해결】
1. 설정 > 네트워크 및 인터넷 > SIM > yah.mobile 활성화
2. yah.mobile SIM의 데이터 로밍 켜기
3. 액세스 포인트 이름 > 추가: 이름=yah.mobile, APN=yah.mobile
4. yah.mobile을 모바일 데이터 기본값으로 설정
5. 비행기 모드 켜기 → 끄기
6. 기기 재시작
7. 최후 수단: Wi-Fi, 모바일, 블루투스 재설정`,
    language: "ko", category: "connection"
  },
  {
    title: "Android安装了eSIM但没有数据连接 安卓连不上网 安卓没有网络",
    content: `【Android连接故障排除】
1. 设置 > 网络和互联网 > SIM卡 > 启用yah.mobile
2. 开启yah.mobile SIM的数据漫游
3. 接入点名称 > 添加：名称=yah.mobile，APN=yah.mobile
4. 将yah.mobile设为移动数据默认值
5. 开启飞行模式后关闭
6. 重启设备
7. 最后手段：重置Wi-Fi、移动网络和蓝牙`,
    language: "zh", category: "connection"
  },
  {
    title: "Android ติดตั้ง eSIM แล้วแต่ไม่มีเน็ต แอนดรอยด์เชื่อมต่อไม่ได้",
    content: `【Android แก้ปัญหาการเชื่อมต่อ】
1. ตั้งค่า > เครือข่ายและอินเทอร์เน็ต > SIM > เปิด yah.mobile
2. เปิดการโรมมิ่งข้อมูลสำหรับ SIM yah.mobile
3. ชื่อจุดเข้าใช้งาน > เพิ่ม: ชื่อ=yah.mobile, APN=yah.mobile
4. ตั้ง yah.mobile เป็นค่าเริ่มต้นสำหรับข้อมูลมือถือ
5. เปิดโหมดเครื่องบิน แล้วปิด
6. รีสตาร์ทอุปกรณ์
7. วิธีสุดท้าย: รีเซ็ต Wi-Fi มือถือ และบลูทูธ`,
    language: "th", category: "connection"
  },
  {
    title: "Android đã cài eSIM nhưng không có kết nối dữ liệu Android không vào được mạng",
    content: `【Android Khắc phục sự cố kết nối】
1. Cài đặt > Mạng & Internet > SIM > Bật yah.mobile
2. Bật Chuyển vùng dữ liệu cho SIM yah.mobile
3. Tên điểm truy cập > Thêm: Tên=yah.mobile, APN=yah.mobile
4. Đặt yah.mobile làm mặc định cho Dữ liệu di động
5. Bật Chế độ máy bay rồi tắt
6. Khởi động lại thiết bị
7. Biện pháp cuối: Đặt lại Wi-Fi, di động & Bluetooth`,
    language: "vi", category: "connection"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION - Pre-Install / QR Code Issues (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "QRコードを読み取ったがeSIMが追加されない インストールできない eSIMが表示されない SIMロック",
    content: `【eSIMインストールトラブルシューティング】
iPhone: 設定 > モバイル通信 > eSIMを追加 > QRコードを使用
Android: 設定 > ネットワークとインターネット > SIM > eSIMを追加

インストールできない場合：
1. 安定したWi-Fi接続を確認（モバイルデータではなくWi-Fi必須）
2. QRコードが鮮明に表示されていることを確認
3. 「eSIMがサポートされていません」→ デバイスがSIMロック解除済みか確認
4. iPhone XS以降、iOS 14以上が必要
5. QR失敗時：SM-DP+アドレスで手動入力を試す
6. 既にeSIMが最大数に達している場合は不要なeSIMを削除`,
    language: "ja", category: "connection"
  },
  {
    title: "scanned QR code but eSIM won't install can't add eSIM eSIM not supported SIM locked phone",
    content: `【eSIM Installation Troubleshooting】
iPhone: Settings > Cellular > Add eSIM > Use QR Code
Android: Settings > Network & Internet > SIMs > Add eSIM

If installation fails:
1. Ensure stable Wi-Fi connection (Wi-Fi required, not mobile data)
2. Make sure QR code is displayed clearly
3. "eSIM not supported" → Verify device is carrier-unlocked
4. iPhone XS or later, iOS 14+ required
5. If QR fails: Try manual entry with SM-DP+ address
6. If max eSIMs reached, delete unused eSIMs first`,
    language: "en", category: "connection"
  },
  {
    title: "QR코드를 스캔했는데 eSIM이 설치 안됨 추가 안됨 eSIM 지원 안됨",
    content: `【eSIM 설치 문제 해결】
1. 안정적인 Wi-Fi 연결 확인 (Wi-Fi 필수)
2. QR 코드가 선명하게 표시되는지 확인
3. "eSIM 지원 안됨" → 기기 잠금 해제 여부 확인
4. iPhone XS 이후, iOS 14 이상 필요
5. QR 실패 시: SM-DP+ 주소로 수동 입력
6. 최대 eSIM 수에 도달한 경우 불필요한 eSIM 삭제`,
    language: "ko", category: "connection"
  },
  {
    title: "扫描了QR码但eSIM没有安装 无法添加eSIM 不支持eSIM",
    content: `【eSIM安装故障排除】
1. 确保稳定的Wi-Fi连接（必须用Wi-Fi）
2. 确认QR码显示清晰
3. "不支持eSIM" → 确认设备已解锁
4. 需要iPhone XS或更新，iOS 14以上
5. QR失败时：尝试用SM-DP+地址手动输入
6. 如果已达最大eSIM数量，先删除不用的eSIM`,
    language: "zh", category: "connection"
  },
  {
    title: "สแกน QR แล้วแต่ eSIM ไม่ติดตั้ง เพิ่ม eSIM ไม่ได้ ไม่รองรับ eSIM",
    content: `【แก้ปัญหาการติดตั้ง eSIM】
1. ตรวจสอบการเชื่อมต่อ Wi-Fi ที่เสถียร (ต้องใช้ Wi-Fi)
2. ตรวจสอบว่า QR โค้ดแสดงชัดเจน
3. "ไม่รองรับ eSIM" → ตรวจสอบว่าอุปกรณ์ปลดล็อคแล้ว
4. ต้องใช้ iPhone XS ขึ้นไป, iOS 14+
5. QR ล้มเหลว: ลองป้อนด้วยตนเองด้วยที่อยู่ SM-DP+
6. ถ้าถึงจำนวน eSIM สูงสุด ให้ลบ eSIM ที่ไม่ใช้`,
    language: "th", category: "connection"
  },
  {
    title: "Quét QR nhưng eSIM không cài được không thêm được eSIM không hỗ trợ eSIM",
    content: `【Khắc phục sự cố cài đặt eSIM】
1. Đảm bảo kết nối Wi-Fi ổn định (bắt buộc dùng Wi-Fi)
2. Đảm bảo mã QR hiển thị rõ ràng
3. "Không hỗ trợ eSIM" → Xác nhận thiết bị đã mở khóa nhà mạng
4. Cần iPhone XS trở lên, iOS 14+
5. QR thất bại: Thử nhập thủ công bằng địa chỉ SM-DP+
6. Nếu đã đạt số eSIM tối đa, xóa eSIM không dùng`,
    language: "vi", category: "connection"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING - Plans & Recommendations (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "料金プラン 値段 価格 いくら プラン一覧 おすすめプラン どのプランがいい 1週間 2週間 旅行",
    content: `【yah.mobile料金プラン一覧】
• Light: 3GB / 7日間 ¥1,078（税込）— 短期旅行・軽い利用向け
• Standard: 5GB / 15日間 ¥1,848（税込）— 1〜2週間の旅行に最適
• Value: 10GB / 30日間 ¥3,278（税込）— 動画視聴もする方向け
• Premium: 20GB / 30日間 ¥5,478（税込）— ヘビーユーザー向け
• Ultra: 50GB / 30日間 ¥11,000（税込）— 長期滞在・テレワーク向け
• Unlimited: 無制限 / 30日間 ¥16,500（税込）— データ量を気にしたくない方

おすすめ：
- 3〜5日の旅行 → Light (3GB)
- 1週間の旅行 → Light (3GB) または Standard (5GB)
- 2週間の旅行 → Standard (5GB)
- 1ヶ月の滞在 → Value (10GB) 以上

追加データ：1GBあたり¥550でいつでも追加購入可能`,
    language: "ja", category: "pricing"
  },
  {
    title: "pricing plans how much cost price list which plan recommend for 1 week 2 weeks trip to Japan",
    content: `【yah.mobile Pricing Plans】
• Light: 3GB / 7 days ¥1,078 (tax incl.) — Short trips, light usage
• Standard: 5GB / 15 days ¥1,848 (tax incl.) — Best for 1-2 week trips
• Value: 10GB / 30 days ¥3,278 (tax incl.) — For video streaming
• Premium: 20GB / 30 days ¥5,478 (tax incl.) — Heavy users
• Ultra: 50GB / 30 days ¥11,000 (tax incl.) — Long stays, remote work
• Unlimited: Unlimited / 30 days ¥16,500 (tax incl.) — No data worries

Recommendations:
- 3-5 day trip → Light (3GB)
- 1 week trip → Light (3GB) or Standard (5GB)
- 2 week trip → Standard (5GB)
- 1 month stay → Value (10GB) or higher

Additional data: ¥550 per 1GB, purchasable anytime`,
    language: "en", category: "pricing"
  },
  {
    title: "요금제 가격 얼마 플랜 목록 추천 플랜 1주일 2주일 여행",
    content: `【yah.mobile 요금제】
• Light: 3GB / 7일 ¥1,078 — 단기 여행, 가벼운 사용
• Standard: 5GB / 15일 ¥1,848 — 1~2주 여행에 최적
• Value: 10GB / 30일 ¥3,278 — 동영상 시청용
• Premium: 20GB / 30일 ¥5,478 — 헤비 유저용
• Ultra: 50GB / 30일 ¥11,000 — 장기 체류, 원격 근무
• Unlimited: 무제한 / 30일 ¥16,500 — 데이터 걱정 없이

추천:
- 3~5일 여행 → Light (3GB)
- 1주일 여행 → Light 또는 Standard
- 2주일 여행 → Standard (5GB)
- 1개월 체류 → Value (10GB) 이상

추가 데이터: 1GB당 ¥550, 언제든 구매 가능`,
    language: "ko", category: "pricing"
  },
  {
    title: "套餐价格 多少钱 价格表 推荐套餐 哪个套餐好 一周 两周 旅行",
    content: `【yah.mobile套餐价格】
• Light: 3GB / 7天 ¥1,078 — 短期旅行、轻度使用
• Standard: 5GB / 15天 ¥1,848 — 1-2周旅行最佳
• Value: 10GB / 30天 ¥3,278 — 看视频用
• Premium: 20GB / 30天 ¥5,478 — 重度用户
• Ultra: 50GB / 30天 ¥11,000 — 长期居住、远程办公
• Unlimited: 无限 / 30天 ¥16,500 — 不用担心流量

推荐：
- 3-5天旅行 → Light (3GB)
- 1周旅行 → Light 或 Standard
- 2周旅行 → Standard (5GB)
- 1个月 → Value (10GB) 以上

追加流量：每1GB ¥550，随时可购买`,
    language: "zh", category: "pricing"
  },
  {
    title: "แพ็กเกจ ราคา เท่าไหร่ แนะนำแพ็กเกจ ไป 1 สัปดาห์ 2 สัปดาห์",
    content: `【yah.mobile แพ็กเกจ】
• Light: 3GB / 7 วัน ¥1,078 — ทริปสั้น ใช้เบาๆ
• Standard: 5GB / 15 วัน ¥1,848 — เหมาะสำหรับ 1-2 สัปดาห์
• Value: 10GB / 30 วัน ¥3,278 — ดูวิดีโอได้
• Premium: 20GB / 30 วัน ¥5,478 — ใช้เยอะ
• Ultra: 50GB / 30 วัน ¥11,000 — อยู่นาน ทำงานทางไกล
• Unlimited: ไม่จำกัด / 30 วัน ¥16,500 — ไม่ต้องกังวลเรื่องดาต้า

แนะนำ：
- 3-5 วัน → Light (3GB)
- 1 สัปดาห์ → Light หรือ Standard
- 2 สัปดาห์ → Standard (5GB)
- 1 เดือน → Value (10GB) ขึ้นไป

ดาต้าเพิ่ม: 1GB ¥550 ซื้อได้ตลอดเวลา`,
    language: "th", category: "pricing"
  },
  {
    title: "gói cước giá bao nhiêu danh sách gói đề xuất gói nào đi 1 tuần 2 tuần",
    content: `【yah.mobile Gói cước】
• Light: 3GB / 7 ngày ¥1,078 — Chuyến ngắn, dùng nhẹ
• Standard: 5GB / 15 ngày ¥1,848 — Tốt nhất cho 1-2 tuần
• Value: 10GB / 30 ngày ¥3,278 — Xem video
• Premium: 20GB / 30 ngày ¥5,478 — Người dùng nhiều
• Ultra: 50GB / 30 ngày ¥11,000 — Ở lâu, làm việc từ xa
• Unlimited: Không giới hạn / 30 ngày ¥16,500 — Không lo dữ liệu

Đề xuất:
- 3-5 ngày → Light (3GB)
- 1 tuần → Light hoặc Standard
- 2 tuần → Standard (5GB)
- 1 tháng → Value (10GB) trở lên

Dữ liệu bổ sung: ¥550/1GB, mua bất cứ lúc nào`,
    language: "vi", category: "pricing"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING - Additional Data & Payment Methods (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "追加データ購入 データ使い切った 容量追加 1GB追加 データチャージ 支払い方法 決済方法 クレジットカード",
    content: `【追加データ購入・支払い方法】
追加データ：
• 1GBあたり¥550（税込）
• マイページまたはyah.mobileアプリからいつでも購入可能
• 購入後すぐに利用開始
• 有効期限は現在のプランの残り期間と同じ

支払い方法：
• クレジットカード：Visa、Mastercard、American Express、JCB
• モバイル決済：Apple Pay、Google Pay
• ※PayPal、銀行振込、コンビニ払いは非対応`,
    language: "ja", category: "pricing"
  },
  {
    title: "add more data ran out of data top up data additional data purchase payment methods credit card Apple Pay",
    content: `【Additional Data & Payment Methods】
Additional Data:
• ¥550 per 1GB (tax included)
• Purchase anytime from My Page or yah.mobile app
• Immediately available after purchase
• Valid for remaining duration of current plan

Payment Methods:
• Credit cards: Visa, Mastercard, American Express, JCB
• Mobile payments: Apple Pay, Google Pay
• NOT supported: PayPal, bank transfer, convenience store payment`,
    language: "en", category: "pricing"
  },
  {
    title: "데이터 추가 구매 데이터 다 썼어요 충전 결제 방법 신용카드",
    content: `【추가 데이터 & 결제 방법】
추가 데이터: 1GB당 ¥550, 마이페이지에서 언제든 구매 가능, 즉시 사용 가능
결제 방법: Visa, Mastercard, AMEX, JCB, Apple Pay, Google Pay
미지원: PayPal, 은행 이체, 편의점 결제`,
    language: "ko", category: "pricing"
  },
  {
    title: "追加流量 数据用完了 充值 支付方式 信用卡",
    content: `【追加流量 & 支付方式】
追加流量：每1GB ¥550，随时可在个人页面购买，购买后立即可用
支付方式：Visa、Mastercard、AMEX、JCB、Apple Pay、Google Pay
不支持：PayPal、银行转账、便利店支付`,
    language: "zh", category: "pricing"
  },
  {
    title: "เติมดาต้า ดาต้าหมด ซื้อเพิ่ม วิธีชำระเงิน บัตรเครดิต",
    content: `【ดาต้าเพิ่ม & วิธีชำระเงิน】
ดาต้าเพิ่ม: 1GB ¥550 ซื้อได้ตลอดจากหน้า My Page ใช้ได้ทันที
วิธีชำระ: Visa, Mastercard, AMEX, JCB, Apple Pay, Google Pay
ไม่รองรับ: PayPal, โอนเงิน, ชำระที่ร้านสะดวกซื้อ`,
    language: "th", category: "pricing"
  },
  {
    title: "mua thêm dữ liệu hết data nạp thêm phương thức thanh toán thẻ tín dụng",
    content: `【Dữ liệu bổ sung & Thanh toán】
Dữ liệu bổ sung: ¥550/1GB, mua bất cứ lúc nào từ My Page, dùng ngay
Thanh toán: Visa, Mastercard, AMEX, JCB, Apple Pay, Google Pay
Không hỗ trợ: PayPal, chuyển khoản, thanh toán tại cửa hàng tiện lợi`,
    language: "vi", category: "pricing"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND - No Refund Policy (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "返金してほしい キャンセルしたい 返金ポリシー 返金できますか 使っていないのに返金できない おかしい 消費者センター",
    content: `【返金ポリシー】
yah.mobileのeSIMはデジタル商品のため、決済完了後の返金は原則としてお受けできません。
（特定商取引法第15条の3に基づく）

QRコードが発行された時点で、そのeSIMはお客様専用に割り当てられます。
未使用であっても返金対象外となります。

例外的に返金が認められるケース：
1. システム障害によりeSIMが発行されなかった場合
2. 二重課金が発生した場合
3. 不正利用が確認された場合

上記に該当する場合は、yah.mobi/appのお問い合わせフォームよりご連絡ください。
消費者センターへのご相談はお客様の権利です。`,
    language: "ja", category: "refund"
  },
  {
    title: "I want a refund cancel order refund policy can I get refund haven't used it unacceptable dispute charge bank",
    content: `【Refund Policy】
yah.mobile eSIM is a digital product. Refunds are NOT available after payment is completed.
(Based on Japan's Act on Specified Commercial Transactions, Article 15-3)

Once the QR code is issued, the eSIM is exclusively assigned to you.
Even if unused, it is not eligible for a refund.

Exceptions where refund IS possible:
1. System failure — eSIM was not issued despite payment
2. Duplicate charge — charged twice for same purchase
3. Unauthorized use — fraudulent transaction confirmed

If you believe you qualify for an exception, please contact us via the form at yah.mobi/app.
You have the right to consult consumer protection agencies.`,
    language: "en", category: "refund"
  },
  {
    title: "환불 원합니다 취소하고 싶어요 환불 정책 환불 가능한가요 사용 안 했는데 환불 안 된다고요",
    content: `【환불 정책】
yah.mobile eSIM은 디지털 상품으로 결제 완료 후 환불이 불가합니다.
QR 코드 발급 시점에 해당 eSIM은 고객님 전용으로 할당됩니다.
미사용이어도 환불 대상이 아닙니다.

환불 가능한 예외:
1. 시스템 장애로 eSIM 미발급
2. 이중 결제
3. 부정 사용 확인

해당하는 경우 yah.mobi/app 문의 양식으로 연락해 주세요.`,
    language: "ko", category: "refund"
  },
  {
    title: "我想退款 取消订单 退款政策 能退款吗 没用过为什么不能退 投诉",
    content: `【退款政策】
yah.mobile eSIM是数字商品，付款完成后不予退款。
QR码发出后，该eSIM即专属分配给您。即使未使用也不可退款。

可退款的例外情况：
1. 系统故障导致eSIM未发放
2. 重复扣款
3. 确认为未授权使用

如符合以上情况，请通过yah.mobi/app联系我们。`,
    language: "zh", category: "refund"
  },
  {
    title: "ขอคืนเงิน ยกเลิก นโยบายคืนเงิน คืนเงินได้ไหม ยังไม่ได้ใช้ ทำไมคืนไม่ได้",
    content: `【นโยบายคืนเงิน】
eSIM ของ yah.mobile เป็นสินค้าดิจิทัล ไม่สามารถคืนเงินได้หลังชำระเงินแล้ว
เมื่อ QR โค้ดออกแล้ว eSIM จะถูกกำหนดให้คุณโดยเฉพาะ แม้ไม่ได้ใช้ก็ไม่สามารถคืนเงินได้

ข้อยกเว้นที่คืนเงินได้:
1. ระบบขัดข้อง - eSIM ไม่ออก
2. เรียกเก็บเงินซ้ำ
3. การใช้งานที่ไม่ได้รับอนุญาต

หากเข้าข่าย กรุณาติดต่อผ่านแบบฟอร์มที่ yah.mobi/app`,
    language: "th", category: "refund"
  },
  {
    title: "Tôi muốn hoàn tiền hủy đơn chính sách hoàn tiền có được hoàn tiền không chưa dùng tại sao không hoàn",
    content: `【Chính sách hoàn tiền】
eSIM yah.mobile là sản phẩm kỹ thuật số, không hoàn tiền sau khi thanh toán.
Khi mã QR được cấp, eSIM được gán riêng cho bạn. Dù chưa sử dụng cũng không được hoàn tiền.

Ngoại lệ được hoàn tiền:
1. Lỗi hệ thống - eSIM không được cấp
2. Tính phí trùng
3. Sử dụng trái phép được xác nhận

Nếu thuộc trường hợp trên, liên hệ qua biểu mẫu tại yah.mobi/app`,
    language: "vi", category: "refund"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND - Duplicate Charge & eSIM Not Issued (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "二重課金 二重に請求された 同じ金額が2回引かれた 重複課金 eSIMが届かない QRコードが届かない 支払ったのに届かない",
    content: `【二重課金・eSIM未発行の対応】
■ 二重課金の場合：
これは返金対象の例外ケースです。
クレジットカード明細で2件の同一金額の請求を確認してください。
yah.mobi/appのお問い合わせフォームから以下の情報をお送りください：
- 注文番号（メールに記載）
- 請求日と金額
- カード明細のスクリーンショット

■ eSIM/QRコードが届かない場合：
1. 迷惑メールフォルダを確認
2. 登録メールアドレスが正しいか確認
3. 支払い完了から30分以上経過している場合はシステム障害の可能性
→ yah.mobi/appのお問い合わせフォームからご連絡ください（返金対象）`,
    language: "ja", category: "refund"
  },
  {
    title: "charged twice duplicate charge two identical charges eSIM not received QR code not delivered paid but nothing received",
    content: `【Duplicate Charge & eSIM Not Received】
■ Duplicate Charge:
This qualifies for a refund exception.
Check your credit card statement for two identical charges.
Contact us via yah.mobi/app form with:
- Order number (in your email)
- Charge date and amount
- Screenshot of card statement

■ eSIM/QR Code Not Received:
1. Check spam/junk folder
2. Verify registered email is correct
3. If 30+ minutes since payment, possible system issue
→ Contact via yah.mobi/app form (eligible for refund)`,
    language: "en", category: "refund"
  },
  {
    title: "이중 결제 두 번 청구됨 같은 금액 두 번 eSIM 안 옴 QR코드 안 옴",
    content: `【이중 결제 & eSIM 미수신】
■ 이중 결제: 환불 예외 대상입니다. 카드 명세서 확인 후 yah.mobi/app으로 연락 (주문번호, 청구일, 스크린샷 첨부)
■ eSIM 미수신: 스팸 폴더 확인 → 이메일 주소 확인 → 30분 이상 경과 시 yah.mobi/app으로 연락 (환불 대상)`,
    language: "ko", category: "refund"
  },
  {
    title: "重复扣款 扣了两次 eSIM没收到 QR码没收到 付了钱但没收到",
    content: `【重复扣款 & eSIM未收到】
■ 重复扣款：属于退款例外。查看信用卡账单后通过yah.mobi/app联系（附订单号、扣款日期、截图）
■ eSIM未收到：检查垃圾邮件 → 确认邮箱地址 → 超过30分钟通过yah.mobi/app联系（可退款）`,
    language: "zh", category: "refund"
  },
  {
    title: "เรียกเก็บเงินซ้ำ โดนชาร์จสองครั้ง eSIM ไม่ได้รับ QR ไม่มา จ่ายแล้วไม่ได้รับ",
    content: `【เรียกเก็บซ้ำ & eSIM ไม่ได้รับ】
■ เรียกเก็บซ้ำ: เข้าข่ายคืนเงินได้ ตรวจสอบใบแจ้งหนี้แล้วติดต่อ yah.mobi/app (แนบหมายเลขคำสั่งซื้อ วันที่ สกรีนช็อต)
■ eSIM ไม่ได้รับ: ตรวจโฟลเดอร์สแปม → ตรวจอีเมล → เกิน 30 นาที ติดต่อ yah.mobi/app (คืนเงินได้)`,
    language: "th", category: "refund"
  },
  {
    title: "bị tính phí hai lần trùng phí eSIM không nhận được QR không đến đã trả tiền nhưng không nhận được",
    content: `【Tính phí trùng & eSIM không nhận được】
■ Tính phí trùng: Đủ điều kiện hoàn tiền. Kiểm tra sao kê thẻ rồi liên hệ yah.mobi/app (đính kèm mã đơn, ngày, ảnh chụp)
■ eSIM không nhận: Kiểm tra thư rác → Xác nhận email → Quá 30 phút liên hệ yah.mobi/app (được hoàn tiền)`,
    language: "vi", category: "refund"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL - About yah.mobile (6 languages)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    title: "yah.mobileとは何ですか サービス概要 対応端末 対応機種 いつまで使える 有効期限",
    content: `【yah.mobileサービス概要】
yah.mobileは日本国内専用のeSIMサービスです。日本を訪れる海外旅行者向けに設計されています。

特徴：
• 業界最安水準の1GBあたり料金
• 6言語対応の24時間サポート（日本語・英語・中国語・韓国語・タイ語・ベトナム語）
• 購入後すぐに利用開始可能
• SIMカードの差し替え不要

対応端末：
• iPhone: XS以降（iOS 14以上）
• Android: Pixel 3以降、Galaxy S20以降、その他eSIM対応端末
• ※SIMロック解除済みであること

有効期限：プランにより7日〜30日（購入時に選択）`,
    language: "ja", category: "general"
  },
  {
    title: "what is yah.mobile service overview supported devices compatible phones how long does eSIM last expiry",
    content: `【yah.mobile Service Overview】
yah.mobile is a Japan-only eSIM service designed for international travelers visiting Japan.

Features:
• Industry-lowest price per GB
• 24/7 support in 6 languages (JA/EN/ZH/KO/TH/VI)
• Instant activation after purchase
• No physical SIM swap needed

Compatible devices:
• iPhone: XS or later (iOS 14+)
• Android: Pixel 3+, Galaxy S20+, other eSIM-capable devices
• Device must be carrier-unlocked

Validity: 7 to 30 days depending on plan chosen`,
    language: "en", category: "general"
  },
];

// ── Main Execution ────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  RAG Document Rebuild — Q&A Format");
  console.log("=".repeat(60));
  
  // Step 1: Delete all existing RAG documents
  console.log("\n🗑️  Deleting all existing RAG documents...");
  const [delResult] = await pool.query("DELETE FROM rag_documents");
  console.log(`  Deleted ${delResult.affectedRows} documents`);

  // Step 2: Insert new Q&A documents with embeddings
  console.log(`\n📝 Inserting ${QA_DOCS.length} new Q&A documents...`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < QA_DOCS.length; i++) {
    const doc = QA_DOCS[i];
    const embeddingText = `${doc.title}\n${doc.content}`;
    
    try {
      const embedding = await getEmbedding(embeddingText);
      
      await pool.query(
        `INSERT INTO rag_documents (title, content, embedding, createdAt)
         VALUES (?, ?, ?, NOW())`,
        [doc.title, doc.content, JSON.stringify(embedding)]
      );
      
      success++;
      console.log(`  [${i + 1}/${QA_DOCS.length}] ✅ ${doc.language}/${doc.category}: ${doc.title.substring(0, 50)}...`);
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}/${QA_DOCS.length}] ❌ ${doc.language}/${doc.category}: ${err.message}`);
    }
    
    // Rate limit: 50ms between embedding calls
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n✅ Complete: ${success} inserted, ${failed} failed`);
  console.log("=".repeat(60));
  
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
