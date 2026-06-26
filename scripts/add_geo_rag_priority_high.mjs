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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}

const docs = [
  // ===== APN SETTINGS - ENGLISH =====
  {
    title: "APN Settings Guide - iPhone (English) | eSIM not connecting fix",
    content: `How to configure APN settings on iPhone for yah.mobile eSIM:

Step-by-step instructions when your eSIM is installed but you have no internet connection:

1. Go to Settings → Cellular (or Mobile Data)
2. Tap your yah.mobile eSIM line
3. Make sure "Turn On This Line" is enabled
4. Enable "Data Roaming" (IMPORTANT - this must be ON for international use)
5. Tap "Cellular Data Network" (or "Mobile Data Network")
6. In the APN field, enter: internet
7. Leave Username and Password blank
8. Go back to Settings → Cellular and set "Cellular Data" to your yah.mobile line
9. Toggle Airplane Mode ON, wait 10 seconds, then toggle OFF
10. Wait 30-60 seconds for connection

If still not connecting after these steps:
- Restart your iPhone completely (power off → power on)
- Check if your eSIM plan has been activated (check email for confirmation)
- Make sure you're in a coverage area
- Try manually selecting a network: Settings → Cellular → Network Selection → turn off Automatic → select available carrier

Common issues:
- "No Service" showing: Data Roaming is likely OFF. Enable it in step 4.
- Connected but slow: Try toggling between 4G/LTE and 5G in Settings → Cellular → Cellular Data Options → Voice & Data
- APN field not visible: Some iOS versions hide this. Try Settings → Cellular → [your line] → Cellular Data Network`
  },
  {
    title: "APN Settings Guide - Android (English) | eSIM not connecting fix",
    content: `How to configure APN settings on Android for yah.mobile eSIM:

Step-by-step instructions when your eSIM is installed but you have no internet connection:

1. Go to Settings → Network & Internet (or Connections)
2. Tap "SIMs" or "Mobile Networks"
3. Select your yah.mobile eSIM
4. Enable "Mobile Data" for this SIM
5. Enable "Data Roaming" (CRITICAL for international use)
6. Tap "Access Point Names" (APN)
7. Tap the "+" button to add a new APN:
   - Name: yah.mobile
   - APN: internet
   - Leave all other fields blank/default
8. Save and select the new APN
9. Toggle Airplane Mode ON → wait 10 seconds → OFF
10. Wait 30-60 seconds for connection

For Samsung Galaxy specifically:
- Settings → Connections → Mobile Networks → Access Point Names
- If you don't see APN option: Settings → Connections → Mobile Networks → tap your eSIM → Access Point Names

For Google Pixel:
- Settings → Network & Internet → SIMs → yah.mobile → Access Point Names

If still not connecting:
- Restart your phone completely
- Check: Settings → Network & Internet → SIMs → make sure yah.mobile is set for "Mobile data"
- Try manual network selection: Settings → Network & Internet → SIMs → [your line] → Automatically select network → OFF → choose available carrier
- Clear network settings: Settings → System → Reset → Reset network settings (note: this resets all saved Wi-Fi passwords)`
  },
  // ===== APN SETTINGS - CHINESE =====
  {
    title: "APN设置指南 - iPhone（中文）| eSIM无法连接解决方案",
    content: `yah.mobile eSIM iPhone APN设置步骤：

当eSIM已安装但无法上网时，请按以下步骤操作：

1. 打开 设置 → 蜂窝网络（或移动数据）
2. 点击您的 yah.mobile eSIM 线路
3. 确保"启用此线路"已开启
4. 开启"数据漫游"（重要！国际使用必须开启）
5. 点击"蜂窝数据网络"（或"移动数据网络"）
6. 在APN栏中输入：internet
7. 用户名和密码留空
8. 返回 设置 → 蜂窝网络，将"蜂窝数据"设为 yah.mobile 线路
9. 开启飞行模式，等待10秒，然后关闭
10. 等待30-60秒连接网络

如果仍然无法连接：
- 完全重启iPhone（关机→开机）
- 确认eSIM套餐已激活（检查确认邮件）
- 确保您在覆盖区域内
- 尝试手动选择网络：设置 → 蜂窝网络 → 网络选择 → 关闭自动 → 选择可用运营商

常见问题：
- 显示"无服务"：数据漫游可能未开启，请在第4步开启
- 已连接但速度慢：尝试在 设置 → 蜂窝网络 → 蜂窝数据选项 → 语音与数据 中切换4G/LTE和5G
- 看不到APN选项：某些iOS版本会隐藏此选项，尝试 设置 → 蜂窝网络 → [您的线路] → 蜂窝数据网络`
  },
  {
    title: "APN设置指南 - Android（中文）| eSIM无法连接解决方案",
    content: `yah.mobile eSIM Android APN设置步骤：

当eSIM已安装但无法上网时，请按以下步骤操作：

1. 打开 设置 → 网络和互联网（或连接）
2. 点击"SIM卡"或"移动网络"
3. 选择您的 yah.mobile eSIM
4. 为此SIM卡启用"移动数据"
5. 开启"数据漫游"（国际使用必须开启）
6. 点击"接入点名称"（APN）
7. 点击"+"添加新APN：
   - 名称：yah.mobile
   - APN：internet
   - 其他字段留空/默认
8. 保存并选择新的APN
9. 开启飞行模式 → 等待10秒 → 关闭
10. 等待30-60秒连接网络

三星Galaxy设置路径：
- 设置 → 连接 → 移动网络 → 接入点名称
- 如果看不到APN选项：设置 → 连接 → 移动网络 → 点击eSIM → 接入点名称

Google Pixel设置路径：
- 设置 → 网络和互联网 → SIM卡 → yah.mobile → 接入点名称

如果仍然无法连接：
- 完全重启手机
- 检查：确保yah.mobile被设为"移动数据"使用的SIM
- 手动选择网络：设置 → 网络和互联网 → SIM卡 → [您的线路] → 自动选择网络 → 关闭 → 选择可用运营商
- 重置网络设置：设置 → 系统 → 重置 → 重置网络设置（注意：这会清除所有已保存的Wi-Fi密码）`
  },
  // ===== APN SETTINGS - KOREAN =====
  {
    title: "APN 설정 가이드 - iPhone (한국어) | eSIM 연결 안될 때 해결방법",
    content: `yah.mobile eSIM iPhone APN 설정 방법:

eSIM이 설치되었지만 인터넷에 연결되지 않을 때 다음 단계를 따라주세요:

1. 설정 → 셀룰러 (또는 모바일 데이터) 이동
2. yah.mobile eSIM 회선 탭
3. "이 회선 켜기"가 활성화되어 있는지 확인
4. "데이터 로밍" 켜기 (중요! 해외 사용 시 반드시 켜야 합니다)
5. "셀룰러 데이터 네트워크" (또는 "모바일 데이터 네트워크") 탭
6. APN 란에 입력: internet
7. 사용자 이름과 비밀번호는 비워두기
8. 설정 → 셀룰러로 돌아가서 "셀룰러 데이터"를 yah.mobile 회선으로 설정
9. 비행기 모드 켜기, 10초 대기, 끄기
10. 30-60초 대기하여 연결 확인

여전히 연결되지 않는 경우:
- iPhone 완전히 재시작 (전원 끄기 → 켜기)
- eSIM 요금제가 활성화되었는지 확인 (확인 이메일 체크)
- 서비스 지역 내에 있는지 확인
- 수동 네트워크 선택: 설정 → 셀룰러 → 네트워크 선택 → 자동 끄기 → 사용 가능한 통신사 선택

자주 발생하는 문제:
- "서비스 없음" 표시: 데이터 로밍이 꺼져 있을 가능성이 높습니다. 4단계에서 켜주세요.
- 연결되었지만 느림: 설정 → 셀룰러 → 셀룰러 데이터 옵션 → 음성 및 데이터에서 4G/LTE와 5G 전환 시도
- APN 항목이 안 보임: 일부 iOS 버전에서는 숨겨져 있습니다. 설정 → 셀룰러 → [회선] → 셀룰러 데이터 네트워크에서 확인`
  },
  {
    title: "APN 설정 가이드 - Android (한국어) | eSIM 연결 안될 때 해결방법",
    content: `yah.mobile eSIM Android APN 설정 방법:

eSIM이 설치되었지만 인터넷에 연결되지 않을 때 다음 단계를 따라주세요:

1. 설정 → 네트워크 및 인터넷 (또는 연결) 이동
2. "SIM" 또는 "모바일 네트워크" 탭
3. yah.mobile eSIM 선택
4. 이 SIM의 "모바일 데이터" 활성화
5. "데이터 로밍" 켜기 (해외 사용 시 필수!)
6. "액세스 포인트 이름" (APN) 탭
7. "+" 버튼으로 새 APN 추가:
   - 이름: yah.mobile
   - APN: internet
   - 나머지 항목은 비워두기/기본값
8. 저장 후 새 APN 선택
9. 비행기 모드 켜기 → 10초 대기 → 끄기
10. 30-60초 대기하여 연결 확인

삼성 갤럭시 설정 경로:
- 설정 → 연결 → 모바일 네트워크 → 액세스 포인트 이름
- APN 옵션이 안 보이면: 설정 → 연결 → 모바일 네트워크 → eSIM 탭 → 액세스 포인트 이름

구글 픽셀 설정 경로:
- 설정 → 네트워크 및 인터넷 → SIM → yah.mobile → 액세스 포인트 이름

여전히 연결되지 않는 경우:
- 휴대폰 완전히 재시작
- 확인: yah.mobile이 "모바일 데이터" 사용 SIM으로 설정되어 있는지
- 수동 네트워크 선택: 설정 → 네트워크 및 인터넷 → SIM → [회선] → 자동 네트워크 선택 → 끄기 → 사용 가능한 통신사 선택
- 네트워크 설정 초기화: 설정 → 시스템 → 초기화 → 네트워크 설정 초기화 (주의: 저장된 Wi-Fi 비밀번호가 모두 삭제됩니다)`
  },
  // ===== SERVICE OVERVIEW - ENGLISH =====
  {
    title: "yah.mobile Service Overview - What is yah.mobile? (English)",
    content: `What is yah.mobile?

yah.mobile is a travel eSIM service for international travelers. We provide instant, affordable mobile data connectivity in 100+ countries without the hassle of physical SIM cards or expensive roaming charges.

Key Features:
- Instant activation: No physical SIM needed. Download and connect in minutes.
- No contract: Pay only for what you need. No monthly fees, no commitments.
- Wide coverage: Works in 100+ countries across Asia, Europe, Americas, and more.
- Easy setup: Scan QR code → Install eSIM → Connect. That's it.
- 24/7 support: Live chat support available around the clock.

How it works:
1. Choose your plan at yah.mobi based on destination and data needs
2. Complete purchase (credit card or other payment methods)
3. Receive QR code via email instantly
4. Scan QR code with your eSIM-compatible phone
5. Activate at your destination (or before departure)
6. Enjoy mobile data!

Plan validity:
- Plans are valid from the date of first connection (not purchase date)
- Typical validity: 7 days, 15 days, or 30 days depending on plan
- Data expires when either the validity period ends OR data allowance is used up (whichever comes first)
- Unused data does NOT roll over

Important notes:
- eSIM is DATA ONLY (no voice calls or SMS via this eSIM)
- Your phone must be eSIM-compatible and SIM-unlocked
- You can use your original SIM for calls/SMS while using yah.mobile for data
- One eSIM per purchase (cannot be transferred to another device once installed)`
  },
  // ===== SERVICE OVERVIEW - CHINESE =====
  {
    title: "yah.mobile 服务概述 - 什么是yah.mobile?（中文）",
    content: `什么是yah.mobile？

yah.mobile是一款面向国际旅行者的旅行eSIM服务。我们在100多个国家提供即时、实惠的移动数据连接，无需实体SIM卡，也不用担心昂贵的漫游费用。

主要特点：
- 即时激活：无需实体SIM卡。下载后几分钟内即可连接。
- 无合约：按需付费。无月费，无承诺。
- 广泛覆盖：覆盖亚洲、欧洲、美洲等100多个国家。
- 简单设置：扫描QR码 → 安装eSIM → 连接。就这么简单。
- 24/7客服：全天候在线聊天支持。

使用流程：
1. 在 yah.mobi 根据目的地和数据需求选择套餐
2. 完成购买（信用卡或其他支付方式）
3. 立即通过邮件收到QR码
4. 用支持eSIM的手机扫描QR码
5. 在目的地激活（或出发前激活）
6. 享受移动数据！

套餐有效期：
- 套餐从首次连接日期开始计算（非购买日期）
- 典型有效期：7天、15天或30天（取决于套餐）
- 当有效期结束或数据用完时（以先到者为准），数据即失效
- 未使用的数据不会结转

重要说明：
- eSIM仅提供数据服务（不包含语音通话或短信）
- 您的手机必须支持eSIM且已解锁
- 您可以同时使用原SIM卡打电话/发短信，用yah.mobile上网
- 每次购买一个eSIM（安装后不能转移到其他设备）`
  },
  // ===== SERVICE OVERVIEW - KOREAN =====
  {
    title: "yah.mobile 서비스 소개 - yah.mobile이란? (한국어)",
    content: `yah.mobile이란?

yah.mobile은 해외 여행자를 위한 여행용 eSIM 서비스입니다. 100개 이상의 국가에서 물리적 SIM 카드 없이, 비싼 로밍 요금 걱정 없이 즉시 저렴한 모바일 데이터를 제공합니다.

주요 특징:
- 즉시 활성화: 물리적 SIM 불필요. 다운로드 후 몇 분 내 연결.
- 무약정: 필요한 만큼만 결제. 월정액 없음, 약정 없음.
- 넓은 커버리지: 아시아, 유럽, 미주 등 100개 이상 국가에서 사용 가능.
- 간편 설정: QR코드 스캔 → eSIM 설치 → 연결. 끝!
- 24시간 지원: 연중무휴 실시간 채팅 지원.

이용 방법:
1. yah.mobi에서 목적지와 데이터 필요량에 맞는 요금제 선택
2. 결제 완료 (신용카드 또는 기타 결제 수단)
3. 이메일로 QR코드 즉시 수신
4. eSIM 지원 휴대폰으로 QR코드 스캔
5. 목적지에서 활성화 (또는 출발 전 활성화)
6. 모바일 데이터 사용!

요금제 유효기간:
- 요금제는 첫 연결 날짜부터 시작 (구매 날짜가 아님)
- 일반적인 유효기간: 7일, 15일, 또는 30일 (요금제에 따라 다름)
- 유효기간 종료 또는 데이터 소진 시 (먼저 도래하는 것) 데이터 만료
- 미사용 데이터는 이월되지 않음

중요 사항:
- eSIM은 데이터 전용 (이 eSIM으로 음성통화나 문자 불가)
- 휴대폰이 eSIM을 지원하고 SIM 잠금 해제되어 있어야 함
- 기존 SIM으로 전화/문자를 사용하면서 yah.mobile로 데이터 사용 가능
- 구매당 eSIM 1개 (설치 후 다른 기기로 이전 불가)`
  },
  // ===== PURCHASE FLOW - ENGLISH =====
  {
    title: "Purchase & Activation Guide - Step by Step (English)",
    content: `Complete guide from purchase to connection for yah.mobile eSIM:

BEFORE PURCHASE - Preparation:
1. Confirm your phone supports eSIM (check at yah.mobi/compatibility)
2. Confirm your phone is SIM-unlocked
3. Make sure you have a stable Wi-Fi connection for installation
4. Have your email ready (QR code will be sent here)

PURCHASE PROCESS:
1. Visit yah.mobi
2. Select your destination country/region
3. Choose a data plan (consider trip length + daily usage)
4. Create account or log in
5. Enter payment information (credit card accepted)
6. Complete purchase
7. Check your email for the QR code (arrives within 1-5 minutes)

INSTALLATION (can be done before departure):
1. Open the email with QR code on another device (or print it)
2. On your phone: Settings → Cellular → Add eSIM → Scan QR Code
3. Follow on-screen prompts to install
4. Label the eSIM as "yah.mobile" or "Travel" for easy identification
5. You can choose to activate now or later

ACTIVATION (at destination or before):
1. Settings → Cellular → yah.mobile line → Turn On
2. Enable Data Roaming
3. Set yah.mobile as your data line
4. Toggle Airplane Mode ON/OFF to refresh connection
5. Wait 30-60 seconds — you should see signal bars

TROUBLESHOOTING - Email not received:
- Check spam/junk folder
- Verify email address used during purchase
- Wait 5 minutes (sometimes delayed)
- Contact support via chat at yah.mobi

TROUBLESHOOTING - QR code won't scan:
- Make sure you're scanning with the CAMERA app or eSIM scanner, not a regular QR reader
- Ensure good lighting and the QR code is displayed clearly
- Try zooming in on the QR code
- If printed, make sure print quality is good`
  },
  // ===== PURCHASE FLOW - CHINESE =====
  {
    title: "购买与激活指南 - 完整步骤（中文）",
    content: `yah.mobile eSIM从购买到连接的完整指南：

购买前准备：
1. 确认手机支持eSIM（在 yah.mobi/compatibility 查看）
2. 确认手机已解锁（非运营商锁定）
3. 确保有稳定的Wi-Fi连接用于安装
4. 准备好邮箱（QR码将发送到此邮箱）

购买流程：
1. 访问 yah.mobi
2. 选择目的地国家/地区
3. 选择数据套餐（考虑旅行天数 + 每日使用量）
4. 创建账户或登录
5. 输入支付信息（接受信用卡）
6. 完成购买
7. 查看邮箱中的QR码（1-5分钟内到达）

安装（可在出发前完成）：
1. 在另一台设备上打开含QR码的邮件（或打印出来）
2. 在手机上：设置 → 蜂窝网络 → 添加eSIM → 扫描QR码
3. 按屏幕提示完成安装
4. 将eSIM标记为"yah.mobile"或"旅行"以便识别
5. 可以选择现在激活或稍后激活

激活（在目的地或出发前）：
1. 设置 → 蜂窝网络 → yah.mobile线路 → 开启
2. 开启数据漫游
3. 将yah.mobile设为数据线路
4. 开启/关闭飞行模式刷新连接
5. 等待30-60秒 — 应该能看到信号

常见问题 - 没收到邮件：
- 检查垃圾邮件文件夹
- 确认购买时使用的邮箱地址
- 等待5分钟（有时会延迟）
- 通过 yah.mobi 在线聊天联系客服

常见问题 - QR码扫不了：
- 确保使用相机应用或eSIM扫描器扫描，不是普通QR码阅读器
- 确保光线充足，QR码显示清晰
- 尝试放大QR码
- 如果是打印的，确保打印质量良好`
  },
  // ===== PURCHASE FLOW - KOREAN =====
  {
    title: "구매 및 활성화 가이드 - 전체 단계 (한국어)",
    content: `yah.mobile eSIM 구매부터 연결까지 완전 가이드:

구매 전 준비:
1. 휴대폰이 eSIM을 지원하는지 확인 (yah.mobi/compatibility에서 확인)
2. 휴대폰 SIM 잠금 해제 확인
3. 설치를 위한 안정적인 Wi-Fi 연결 확보
4. 이메일 준비 (QR코드가 여기로 발송됩니다)

구매 과정:
1. yah.mobi 방문
2. 목적지 국가/지역 선택
3. 데이터 요금제 선택 (여행 기간 + 일일 사용량 고려)
4. 계정 생성 또는 로그인
5. 결제 정보 입력 (신용카드 가능)
6. 구매 완료
7. 이메일에서 QR코드 확인 (1-5분 내 도착)

설치 (출발 전에 가능):
1. 다른 기기에서 QR코드가 포함된 이메일 열기 (또는 인쇄)
2. 휴대폰에서: 설정 → 셀룰러 → eSIM 추가 → QR코드 스캔
3. 화면 안내에 따라 설치 완료
4. eSIM을 "yah.mobile" 또는 "여행"으로 라벨 지정
5. 지금 활성화하거나 나중에 활성화 선택 가능

활성화 (목적지 또는 출발 전):
1. 설정 → 셀룰러 → yah.mobile 회선 → 켜기
2. 데이터 로밍 켜기
3. yah.mobile을 데이터 회선으로 설정
4. 비행기 모드 켜기/끄기로 연결 새로고침
5. 30-60초 대기 — 신호가 표시되어야 합니다

문제 해결 - 이메일 미수신:
- 스팸/정크 폴더 확인
- 구매 시 사용한 이메일 주소 확인
- 5분 대기 (때때로 지연됨)
- yah.mobi에서 채팅으로 고객지원 연락

문제 해결 - QR코드 스캔 안됨:
- 일반 QR 리더가 아닌 카메라 앱 또는 eSIM 스캐너로 스캔하고 있는지 확인
- 조명이 충분하고 QR코드가 선명하게 표시되는지 확인
- QR코드를 확대해 보기
- 인쇄한 경우 인쇄 품질 확인`
  },
];

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  console.log(`Inserting ${docs.length} Priority-HIGH GEO RAG documents...`);

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

  console.log('Done! All Priority-HIGH GEO documents inserted.');
  await pool.end();
}

main().catch(console.error);
