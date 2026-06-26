import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

const docs = [
  // ===== DESTINATION GUIDES - ENGLISH =====
  {
    title: "Destination Connection Guide - South Korea (English)",
    content: `yah.mobile eSIM Connection Guide for South Korea:

Coverage & Networks:
- Excellent 4G/LTE and 5G coverage nationwide
- Connected via SK Telecom, KT, or LG U+ networks
- Coverage extends to subway systems, rural areas, and islands (Jeju included)

Setup Tips for Korea:
- eSIM works immediately upon landing at Incheon (ICN) or Gimpo (GMP) airport
- No special APN settings needed in most cases — default "internet" APN works
- If no connection after 2 minutes: toggle Airplane Mode ON/OFF
- 5G available in Seoul, Busan, and major cities

Korea-Specific Notes:
- Some apps (KakaoTalk, Naver Map) work best with local data — yah.mobile provides this
- T-money transit card is separate from your eSIM (physical card or Samsung Pay)
- Free Wi-Fi available at most cafes and subway stations as backup
- Speed typically 50-150 Mbps on LTE, faster on 5G

Recommended Data Usage:
- Light use (maps, messaging): 1-2 GB for 7 days
- Moderate (social media, photos): 3-5 GB for 7 days
- Heavy (video calls, streaming): 7-10 GB for 7 days`
  },
  {
    title: "Destination Connection Guide - Taiwan & Hong Kong (English)",
    content: `yah.mobile eSIM Connection Guide for Taiwan & Hong Kong:

TAIWAN:
- Coverage: Excellent 4G/LTE coverage island-wide via Chunghwa Telecom or Taiwan Mobile
- Airport: Works at Taoyuan (TPE) and Songshan (TSA) immediately
- Setup: Default APN "internet" works. Enable Data Roaming.
- Notes: Coverage good even in mountain areas (Alishan, Taroko Gorge)
- Speed: Typically 30-100 Mbps LTE
- Tips: Google Maps works well; LINE is the dominant messaging app locally

HONG KONG:
- Coverage: Excellent 4G/5G coverage via CSL, 3HK, or SmarTone
- Airport: Works immediately at HKIA
- Setup: Default APN works. Enable Data Roaming.
- Notes: Coverage in MTR subway, tunnels, and outlying islands
- Speed: Typically 50-200 Mbps, very fast
- Tips: Google services all work normally (unlike mainland China); Octopus card is separate from eSIM

Common for both:
- No VPN needed (unlike mainland China)
- All major apps work without restriction
- Recommended: 2-3 GB for 5-7 day trip with moderate use`
  },
  {
    title: "Destination Connection Guide - Thailand & Vietnam (English)",
    content: `yah.mobile eSIM Connection Guide for Thailand & Vietnam:

THAILAND:
- Coverage: Good 4G/LTE coverage in cities and tourist areas via AIS, DTAC, or TrueMove
- Airport: Works at Suvarnabhumi (BKK) and Don Mueang (DMK) immediately
- Setup: Default APN "internet" works. Enable Data Roaming.
- Notes: Coverage may be weaker on islands (Koh Phi Phi, Koh Lipe) — still works but slower
- Speed: Typically 20-80 Mbps in Bangkok, 10-40 Mbps in tourist areas
- Tips: Grab app works with data; Google Maps excellent for navigation

VIETNAM:
- Coverage: Good 4G coverage in cities via Viettel, Mobifone, or Vinaphone
- Airport: Works at Tan Son Nhat (SGN) and Noi Bai (HAN) immediately
- Setup: Default APN "internet" works. Enable Data Roaming.
- Special note: If connection fails, try manual network selection — choose Viettel or Mobifone
- Speed: Typically 15-50 Mbps in cities, slower in rural/mountain areas (Sa Pa, Ha Giang)
- Tips: Grab is essential for transport; Google Maps works well in cities

Common tips:
- Download offline maps before arrival as backup
- Recommended data: 3-5 GB for 7 days with moderate use
- Video calling (Zoom/FaceTime) works well in cities`
  },
  {
    title: "Destination Connection Guide - Europe (English)",
    content: `yah.mobile eSIM Connection Guide for Europe:

Coverage:
- Excellent 4G/LTE and growing 5G coverage across EU countries
- Single eSIM works across multiple European countries (EU roaming)
- Connected via major carriers in each country

Countries with best coverage:
- UK, France, Germany, Spain, Italy, Netherlands, Switzerland
- Scandinavia (excellent even in rural areas)
- Eastern Europe (good in cities, variable in rural)

Setup Tips:
- Default APN "internet" works in all European countries
- Enable Data Roaming (required as you're using a Japanese eSIM abroad)
- When crossing borders, connection switches automatically (may take 1-2 minutes)
- If no connection after border crossing: toggle Airplane Mode ON/OFF

Europe-Specific Notes:
- One yah.mobile plan covers multiple EU countries — no extra charge for crossing borders
- Speed varies: 30-150 Mbps typical in Western Europe
- Underground metro: coverage available in London, Paris, Madrid (varies by city)
- Switzerland is NOT in EU but is typically included in European plans

Recommended Data Usage for Europe:
- City trip (maps, restaurants, tickets): 2-3 GB for 7 days
- Multi-country tour: 5-7 GB for 14 days
- Remote work + travel: 10+ GB for 14 days

Tips:
- Download Google Translate offline language packs before departure
- Google Maps offline maps save data significantly
- WhatsApp is dominant messaging app in Europe`
  },
  // ===== DESTINATION GUIDES - CHINESE =====
  {
    title: "目的地连接指南 - 韩国、台湾、香港（中文）",
    content: `yah.mobile eSIM 目的地连接指南：韩国、台湾、香港

【韩国】
- 覆盖：全国优秀的4G/LTE和5G覆盖，通过SK电讯、KT或LG U+网络
- 机场：在仁川(ICN)或金浦(GMP)机场落地后立即可用
- 设置：大多数情况无需特殊APN设置，默认"internet"即可
- 如果2分钟后无连接：开关飞行模式
- 速度：LTE通常50-150 Mbps
- 提示：KakaoTalk、Naver地图使用本地数据效果最佳

【台湾】
- 覆盖：全岛优秀4G/LTE覆盖，通过中华电信或台湾大哥大
- 机场：桃园(TPE)和松山(TSA)立即可用
- 设置：默认APN"internet"可用，开启数据漫游
- 速度：LTE通常30-100 Mbps
- 提示：Google地图好用；LINE是当地主要通讯应用

【香港】
- 覆盖：优秀4G/5G覆盖，通过CSL、3HK或SmarTone
- 机场：香港国际机场立即可用
- 设置：默认APN可用，开启数据漫游
- 覆盖范围包括地铁、隧道和离岛
- 速度：通常50-200 Mbps，非常快
- 提示：Google服务正常使用（与中国大陆不同）；无需VPN

建议数据用量：
- 轻度使用（地图、消息）：7天1-2 GB
- 中度使用（社交媒体、照片）：7天3-5 GB
- 重度使用（视频通话、流媒体）：7天7-10 GB`
  },
  {
    title: "目的地连接指南 - 泰国、越南、欧洲（中文）",
    content: `yah.mobile eSIM 目的地连接指南：泰国、越南、欧洲

【泰国】
- 覆盖：城市和旅游区良好的4G/LTE覆盖，通过AIS、DTAC或TrueMove
- 机场：素万那普(BKK)和廊曼(DMK)立即可用
- 设置：默认APN"internet"可用，开启数据漫游
- 注意：岛屿地区（皮皮岛、丽贝岛）信号可能较弱但仍可用
- 速度：曼谷通常20-80 Mbps
- 提示：Grab打车应用需要数据；Google地图导航很好用

【越南】
- 覆盖：城市良好4G覆盖，通过Viettel、Mobifone或Vinaphone
- 机场：新山一(SGN)和内排(HAN)立即可用
- 设置：默认APN"internet"可用，开启数据漫游
- 特别提示：如果连接失败，尝试手动选择网络 — 选择Viettel或Mobifone
- 速度：城市通常15-50 Mbps，山区较慢
- 提示：Grab是必备交通应用

【欧洲】
- 覆盖：EU国家优秀4G/LTE和5G覆盖
- 一个eSIM可跨多个欧洲国家使用（EU漫游）
- 设置：默认APN"internet"适用所有欧洲国家，开启数据漫游
- 跨境时连接自动切换（可能需要1-2分钟）
- 如果跨境后无连接：开关飞行模式
- 瑞士不在EU但通常包含在欧洲套餐中
- 速度：西欧通常30-150 Mbps

建议数据用量：
- 城市旅行：7天2-3 GB
- 多国游：14天5-7 GB
- 远程办公+旅行：14天10+ GB`
  },
  // ===== DESTINATION GUIDES - KOREAN =====
  {
    title: "목적지 연결 가이드 - 대만, 홍콩, 태국 (한국어)",
    content: `yah.mobile eSIM 목적지 연결 가이드: 대만, 홍콩, 태국

【대만】
- 커버리지: 중화전신 또는 대만모바일을 통한 전국 우수한 4G/LTE 커버리지
- 공항: 타오위안(TPE)과 쑹산(TSA)에서 즉시 사용 가능
- 설정: 기본 APN "internet" 사용 가능. 데이터 로밍 켜기.
- 속도: LTE 보통 30-100 Mbps
- 팁: Google 지도 잘 작동; LINE이 현지 주요 메신저

【홍콩】
- 커버리지: CSL, 3HK 또는 SmarTone을 통한 우수한 4G/5G 커버리지
- 공항: 홍콩국제공항에서 즉시 사용 가능
- 설정: 기본 APN 사용 가능. 데이터 로밍 켜기.
- MTR 지하철, 터널, 외곽 섬에서도 커버리지 가능
- 속도: 보통 50-200 Mbps, 매우 빠름
- 팁: Google 서비스 정상 작동 (중국 본토와 다름); VPN 불필요

【태국】
- 커버리지: AIS, DTAC 또는 TrueMove를 통한 도시 및 관광지 양호한 4G/LTE 커버리지
- 공항: 수완나품(BKK)과 돈무앙(DMK)에서 즉시 사용 가능
- 설정: 기본 APN "internet" 사용 가능. 데이터 로밍 켜기.
- 참고: 섬 지역(피피섬, 리페섬)은 신호가 약할 수 있지만 사용 가능
- 속도: 방콕 보통 20-80 Mbps
- 팁: Grab 앱 필수; Google 지도 내비게이션 우수

권장 데이터 사용량:
- 가벼운 사용 (지도, 메시지): 7일 1-2 GB
- 보통 사용 (SNS, 사진): 7일 3-5 GB
- 많은 사용 (영상통화, 스트리밍): 7일 7-10 GB`
  },
  {
    title: "목적지 연결 가이드 - 베트남, 유럽 (한국어)",
    content: `yah.mobile eSIM 목적지 연결 가이드: 베트남, 유럽

【베트남】
- 커버리지: Viettel, Mobifone 또는 Vinaphone을 통한 도시 양호한 4G 커버리지
- 공항: 떤선녓(SGN)과 노이바이(HAN)에서 즉시 사용 가능
- 설정: 기본 APN "internet" 사용 가능. 데이터 로밍 켜기.
- 특별 참고: 연결 실패 시 수동 네트워크 선택 시도 — Viettel 또는 Mobifone 선택
- 속도: 도시 보통 15-50 Mbps, 산간 지역(사파, 하장) 느림
- 팁: Grab 필수 교통 앱; Google 지도 도시에서 잘 작동

【유럽】
- 커버리지: EU 국가 전역 우수한 4G/LTE 및 5G 커버리지
- 하나의 eSIM으로 여러 유럽 국가에서 사용 가능 (EU 로밍)
- 설정: 기본 APN "internet" 모든 유럽 국가에서 사용 가능. 데이터 로밍 켜기.
- 국경 이동 시 연결 자동 전환 (1-2분 소요될 수 있음)
- 국경 이동 후 연결 안 되면: 비행기 모드 켜기/끄기
- 스위스는 EU가 아니지만 보통 유럽 요금제에 포함
- 속도: 서유럽 보통 30-150 Mbps

커버리지 우수 국가:
- 영국, 프랑스, 독일, 스페인, 이탈리아, 네덜란드, 스위스
- 북유럽 (시골 지역에서도 우수)
- 동유럽 (도시 양호, 시골 변동적)

권장 데이터 사용량:
- 도시 여행 (지도, 맛집, 티켓): 7일 2-3 GB
- 다국가 투어: 14일 5-7 GB
- 원격 근무 + 여행: 14일 10+ GB

팁:
- 출발 전 Google 번역 오프라인 언어팩 다운로드
- Google 지도 오프라인 지도로 데이터 절약
- WhatsApp이 유럽 주요 메신저`
  },
  // ===== DEVICE-SPECIFIC GUIDES - ENGLISH =====
  {
    title: "Device Installation Guide - iPhone 15/16 Series (English)",
    content: `eSIM Installation Guide for iPhone 15 & iPhone 16 Series:

Compatible models: iPhone 15, 15 Plus, 15 Pro, 15 Pro Max, iPhone 16, 16 Plus, 16 Pro, 16 Pro Max

Note: iPhone 15/16 (US models) are eSIM-ONLY (no physical SIM tray). International models support 1 nano-SIM + 1 eSIM, or dual eSIM.

Installation Steps:
1. Connect to Wi-Fi (required for eSIM download)
2. Open Settings → Cellular
3. Tap "Add eSIM" (or "Set Up Cellular" if first time)
4. Choose "Use QR Code"
5. Point camera at the QR code from your yah.mobile email
6. Wait for "Cellular Plan Detected" message
7. Tap "Continue"
8. Label your plan: choose "Travel" or type "yah.mobile"
9. Choose settings:
   - Default Line: Keep your original for calls
   - iMessage & FaceTime: Keep your original
   - Cellular Data: Select "yah.mobile" (or switch later)
10. Tap "Done"

Post-Installation:
- Go to Settings → Cellular → yah.mobile
- Turn ON "Data Roaming"
- When ready to use: Set as Cellular Data line

iPhone 15/16 Specific Tips:
- Supports eSIM Quick Transfer (if upgrading from another iPhone)
- Can store up to 8 eSIMs (but only 2 active simultaneously)
- iOS 17/18: Can convert physical SIM to eSIM directly
- If "Add eSIM" doesn't appear: restart phone, ensure iOS is updated

Troubleshooting:
- "Cannot Add eSIM" error: Check if phone is SIM-locked (contact original carrier)
- "eSIM already installed" error: Each QR code can only be used ONCE
- Camera won't scan: Try in well-lit area, or use "Enter Details Manually" option`
  },
  {
    title: "Device Installation Guide - Samsung Galaxy S24/S25 Series (English)",
    content: `eSIM Installation Guide for Samsung Galaxy S24 & S25 Series:

Compatible models: Galaxy S24, S24+, S24 Ultra, S25, S25+, S25 Ultra

Note: All S24/S25 models support eSIM + nano-SIM (dual SIM). Some regions may have eSIM-only models.

Installation Steps:
1. Connect to Wi-Fi (required for eSIM download)
2. Open Settings → Connections → SIM Manager (or SIM card manager)
3. Tap "Add eSIM"
4. Tap "Scan QR code from service provider"
5. Point camera at the QR code from your yah.mobile email
6. Wait for download to complete
7. Tap "Confirm" to add the plan
8. Name your plan: type "yah.mobile"
9. Choose whether to enable it now or later

Post-Installation:
- Settings → Connections → SIM Manager
- Tap yah.mobile eSIM → Enable
- Set as "Mobile data" SIM
- Settings → Connections → Mobile Networks → Data Roaming → ON

Samsung-Specific Tips:
- One UI 6/7: SIM Manager is the central hub for all SIM operations
- Can store multiple eSIMs but only 1 eSIM + 1 physical SIM active at once
- Samsung account NOT required for eSIM installation
- If "Add eSIM" is grayed out: check if phone is carrier-locked

Troubleshooting:
- "Network not available" after install: Enable Data Roaming (most common fix!)
- "Invalid QR code": Make sure you're scanning the eSIM QR, not a tracking QR from the email
- Slow download: Switch to a different Wi-Fi network
- "SIM Manager" not found: Try Settings → Connections → SIM card manager (varies by One UI version)`
  },
  // ===== DEVICE GUIDES - CHINESE =====
  {
    title: "设备安装指南 - iPhone 15/16系列 & Samsung Galaxy S24/S25系列（中文）",
    content: `eSIM安装指南 - iPhone 15/16系列 & Samsung Galaxy S24/S25系列

【iPhone 15/16系列安装步骤】
兼容机型：iPhone 15/15 Plus/15 Pro/15 Pro Max, iPhone 16/16 Plus/16 Pro/16 Pro Max

1. 连接Wi-Fi（下载eSIM必需）
2. 打开 设置 → 蜂窝网络
3. 点击"添加eSIM"
4. 选择"使用QR码"
5. 将相机对准yah.mobile邮件中的QR码
6. 等待"检测到蜂窝方案"消息
7. 点击"继续"
8. 标记方案：选择"旅行"或输入"yah.mobile"
9. 设置：默认线路保持原SIM用于通话，蜂窝数据选择yah.mobile
10. 点击"完成"

iPhone提示：
- 最多可存储8个eSIM（同时激活2个）
- 如果看不到"添加eSIM"：重启手机，确保iOS已更新
- "无法添加eSIM"错误：检查手机是否有SIM锁

【Samsung Galaxy S24/S25系列安装步骤】
兼容机型：Galaxy S24/S24+/S24 Ultra, S25/S25+/S25 Ultra

1. 连接Wi-Fi
2. 打开 设置 → 连接 → SIM管理器
3. 点击"添加eSIM"
4. 点击"扫描服务商QR码"
5. 将相机对准QR码
6. 等待下载完成
7. 点击"确认"添加方案
8. 命名：输入"yah.mobile"
9. 选择现在启用或稍后启用

Samsung提示：
- One UI 6/7：SIM管理器是所有SIM操作的中心
- 不需要Samsung账户即可安装eSIM
- "添加eSIM"灰色不可点击：检查手机是否有运营商锁

安装后设置：
- 启用yah.mobile eSIM
- 设为"移动数据"SIM
- 开启数据漫游`
  },
  // ===== DEVICE GUIDES - KOREAN =====
  {
    title: "기기 설치 가이드 - iPhone 15/16 & Samsung Galaxy S24/S25 (한국어)",
    content: `eSIM 설치 가이드 - iPhone 15/16시리즈 & Samsung Galaxy S24/S25시리즈

【iPhone 15/16시리즈 설치 단계】
호환 기종: iPhone 15/15 Plus/15 Pro/15 Pro Max, iPhone 16/16 Plus/16 Pro/16 Pro Max

1. Wi-Fi 연결 (eSIM 다운로드에 필요)
2. 설정 → 셀룰러 열기
3. "eSIM 추가" 탭
4. "QR 코드 사용" 선택
5. yah.mobile 이메일의 QR코드에 카메라 맞추기
6. "셀룰러 요금제 감지됨" 메시지 대기
7. "계속" 탭
8. 요금제 라벨: "여행" 선택 또는 "yah.mobile" 입력
9. 설정: 기본 회선은 원래 SIM(통화용), 셀룰러 데이터는 yah.mobile 선택
10. "완료" 탭

iPhone 팁:
- 최대 8개 eSIM 저장 가능 (동시 활성화 2개)
- "eSIM 추가"가 안 보이면: 재시작, iOS 업데이트 확인
- "eSIM 추가 불가" 오류: SIM 잠금 확인

【Samsung Galaxy S24/S25시리즈 설치 단계】
호환 기종: Galaxy S24/S24+/S24 Ultra, S25/S25+/S25 Ultra

1. Wi-Fi 연결
2. 설정 → 연결 → SIM 관리자 열기
3. "eSIM 추가" 탭
4. "서비스 제공업체 QR코드 스캔" 탭
5. QR코드에 카메라 맞추기
6. 다운로드 완료 대기
7. "확인" 탭하여 요금제 추가
8. 이름 지정: "yah.mobile" 입력
9. 지금 활성화 또는 나중에 활성화 선택

Samsung 팁:
- One UI 6/7: SIM 관리자가 모든 SIM 작업의 중심
- Samsung 계정 없이도 eSIM 설치 가능
- "eSIM 추가" 회색으로 비활성화: 통신사 잠금 확인

설치 후 설정:
- yah.mobile eSIM 활성화
- "모바일 데이터" SIM으로 설정
- 데이터 로밍 켜기`
  },
  // ===== FAQ TOP 10 - ENGLISH =====
  {
    title: "Top 10 FAQ - Frequently Asked Questions (English)",
    content: `yah.mobile Top 10 Frequently Asked Questions:

Q1: Can I use my phone number for calls while using yah.mobile for data?
A: Yes! yah.mobile is data-only. Your original SIM stays active for calls and SMS. Just set yah.mobile as your "data" line.

Q2: When does my plan start? From purchase or arrival?
A: Your plan starts when you FIRST CONNECT to a mobile network at your destination (not from purchase date). You can install the eSIM before departure.

Q3: Can I share my data as a hotspot/tethering?
A: Yes, hotspot/tethering is supported on all plans. Go to Settings → Personal Hotspot and turn it on.

Q4: What happens when my data runs out?
A: Your connection will stop. You can purchase an additional data pack through yah.mobi. Your eSIM remains installed — just add more data.

Q5: Can I use the same eSIM for multiple trips?
A: No. Each eSIM is for one-time use. For your next trip, purchase a new plan and install a new eSIM.

Q6: Do I need to remove my eSIM after my trip?
A: It's optional but recommended to keep your phone organized. Go to Settings → Cellular → yah.mobile → Remove Cellular Plan.

Q7: Is my phone compatible with eSIM?
A: Most phones from 2020 onwards support eSIM. Check at yah.mobi/compatibility. Your phone must also be SIM-unlocked.

Q8: Can I install the eSIM before my trip?
A: Yes! We recommend installing 1-2 days before departure while you have Wi-Fi. Just don't enable it until you arrive (to avoid starting your plan early).

Q9: Why is my connection slow?
A: Try: 1) Toggle Airplane Mode, 2) Switch between 4G/5G in settings, 3) Move to a different location. Speed depends on local network congestion.

Q10: Can I get a refund if the eSIM doesn't work?
A: eSIM is a digital product. Per Japanese law (Act on Specified Commercial Transactions), refunds are not available once delivered. However, our 24/7 support team will help resolve any connection issues.`
  },
  // ===== FAQ TOP 10 - CHINESE =====
  {
    title: "常见问题 Top 10 - FAQ（中文）",
    content: `yah.mobile 十大常见问题：

Q1: 使用yah.mobile上网时，还能用原来的手机号打电话吗？
A: 可以！yah.mobile仅提供数据服务。您的原SIM卡仍可正常通话和收发短信。只需将yah.mobile设为"数据"线路即可。

Q2: 套餐从什么时候开始计算？购买日还是到达日？
A: 套餐从您在目的地首次连接移动网络时开始计算（非购买日期）。您可以在出发前安装eSIM。

Q3: 可以开热点/共享网络吗？
A: 可以，所有套餐都支持热点共享。前往 设置 → 个人热点 开启即可。

Q4: 数据用完了怎么办？
A: 连接会停止。您可以通过 yah.mobi 购买额外数据包。eSIM保持安装状态——只需添加更多数据。

Q5: 同一个eSIM可以多次旅行使用吗？
A: 不可以。每个eSIM为一次性使用。下次旅行请购买新套餐并安装新eSIM。

Q6: 旅行结束后需要删除eSIM吗？
A: 可选但建议删除以保持手机整洁。前往 设置 → 蜂窝网络 → yah.mobile → 移除蜂窝方案。

Q7: 我的手机支持eSIM吗？
A: 2020年后的大多数手机都支持eSIM。在 yah.mobi/compatibility 查看。手机还必须已解锁。

Q8: 可以在出发前安装eSIM吗？
A: 可以！建议在有Wi-Fi时出发前1-2天安装。到达前不要启用（避免提前开始计算套餐）。

Q9: 为什么连接速度慢？
A: 尝试：1) 开关飞行模式，2) 在设置中切换4G/5G，3) 换个位置。速度取决于当地网络拥堵情况。

Q10: eSIM不能用可以退款吗？
A: eSIM是数字产品。根据日本法律（特定商业交易法），一旦交付不可退款。但我们24/7客服团队会帮助解决任何连接问题。`
  },
  // ===== FAQ TOP 10 - KOREAN =====
  {
    title: "자주 묻는 질문 Top 10 - FAQ (한국어)",
    content: `yah.mobile 자주 묻는 질문 Top 10:

Q1: yah.mobile로 데이터를 사용하면서 원래 전화번호로 통화할 수 있나요?
A: 네! yah.mobile은 데이터 전용입니다. 기존 SIM은 통화와 문자에 정상 사용됩니다. yah.mobile을 "데이터" 회선으로만 설정하면 됩니다.

Q2: 요금제는 언제부터 시작되나요? 구매일? 도착일?
A: 목적지에서 모바일 네트워크에 처음 연결할 때부터 시작됩니다 (구매일이 아님). 출발 전에 eSIM을 설치해도 됩니다.

Q3: 핫스팟/테더링으로 데이터를 공유할 수 있나요?
A: 네, 모든 요금제에서 핫스팟 지원됩니다. 설정 → 개인용 핫스팟에서 켜면 됩니다.

Q4: 데이터를 다 쓰면 어떻게 되나요?
A: 연결이 중단됩니다. yah.mobi에서 추가 데이터 팩을 구매할 수 있습니다. eSIM은 설치된 상태로 유지됩니다.

Q5: 같은 eSIM을 여러 번 여행에 사용할 수 있나요?
A: 아니요. 각 eSIM은 일회용입니다. 다음 여행 시 새 요금제를 구매하고 새 eSIM을 설치하세요.

Q6: 여행 후 eSIM을 삭제해야 하나요?
A: 선택사항이지만 정리를 위해 권장합니다. 설정 → 셀룰러 → yah.mobile → 셀룰러 요금제 제거.

Q7: 내 폰이 eSIM을 지원하나요?
A: 2020년 이후 대부분의 폰이 eSIM을 지원합니다. yah.mobi/compatibility에서 확인하세요. SIM 잠금 해제도 필요합니다.

Q8: 출발 전에 eSIM을 설치할 수 있나요?
A: 네! Wi-Fi가 있을 때 출발 1-2일 전 설치를 권장합니다. 도착 전까지 활성화하지 마세요 (요금제 조기 시작 방지).

Q9: 연결 속도가 왜 느린가요?
A: 시도해 보세요: 1) 비행기 모드 켜기/끄기, 2) 설정에서 4G/5G 전환, 3) 위치 이동. 속도는 현지 네트워크 혼잡도에 따라 다릅니다.

Q10: eSIM이 작동하지 않으면 환불 가능한가요?
A: eSIM은 디지털 상품입니다. 일본 법률(특정상거래법)에 따라 배송 후 환불이 불가합니다. 하지만 24시간 고객지원팀이 연결 문제 해결을 도와드립니다.`
  },
];

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  console.log(`Inserting ${docs.length} Priority-MID GEO RAG documents...`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`[${i + 1}/${docs.length}] ${doc.title.substring(0, 70)}...`);
    const embedding = await getEmbedding(doc.title + ' ' + doc.content.substring(0, 500));
    await pool.execute(
      `INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())`,
      [doc.title, doc.content, JSON.stringify(embedding)]
    );
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('Done! All Priority-MID GEO documents inserted.');
  await pool.end();
}

main().catch(console.error);
