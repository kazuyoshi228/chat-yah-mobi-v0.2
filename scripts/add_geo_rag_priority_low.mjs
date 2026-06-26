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
  // ===== PRE-TRAVEL CHECKLIST - ENGLISH =====
  {
    title: "Pre-Travel eSIM Checklist - Before Your Trip (English)",
    content: `Complete Pre-Travel Checklist for yah.mobile eSIM:

✅ 1 WEEK BEFORE DEPARTURE:
□ Confirm phone is eSIM compatible (yah.mobi/compatibility)
□ Confirm phone is SIM-unlocked (Settings → General → About → Carrier Lock: "No SIM restrictions")
□ Purchase your yah.mobile plan at yah.mobi
□ Check email for QR code confirmation

✅ 1-2 DAYS BEFORE DEPARTURE:
□ Install eSIM while connected to Wi-Fi:
  - iPhone: Settings → Cellular → Add eSIM → Scan QR Code
  - Android: Settings → Connections → SIM Manager → Add eSIM
□ Label the eSIM as "yah.mobile" or "Travel"
□ DO NOT enable it yet (plan starts on first connection)
□ Download offline maps for your destination (Google Maps → download area)
□ Download Google Translate offline language pack if needed

✅ AT THE AIRPORT (before boarding):
□ Make sure eSIM is installed (check in Settings → Cellular/SIM)
□ Turn OFF your phone or enable Airplane Mode before takeoff
□ Note: Do NOT enable yah.mobile data yet

✅ UPON ARRIVAL (after landing):
□ Turn off Airplane Mode
□ Go to Settings → Cellular (or SIM Manager)
□ Enable yah.mobile line
□ Turn ON Data Roaming
□ Set yah.mobile as your data line
□ Toggle Airplane Mode ON then OFF (refreshes connection)
□ Wait 30-60 seconds for signal
□ Test: Open a website or app to confirm data works

✅ IF NOT CONNECTING:
□ Check Data Roaming is ON
□ Check correct line is set for data
□ Try Airplane Mode toggle again
□ Restart phone if needed
□ Contact yah.mobile support via chat

IMPORTANT REMINDERS:
- Keep your original SIM active for calls/SMS
- yah.mobile = data only (no voice calls on this line)
- Plan validity starts from FIRST connection, not installation
- Save this checklist for reference during your trip!`
  },
  // ===== PRE-TRAVEL CHECKLIST - CHINESE =====
  {
    title: "旅行前eSIM检查清单 - 出发前准备（中文）",
    content: `yah.mobile eSIM 完整旅行前检查清单：

✅ 出发前1周：
□ 确认手机支持eSIM（yah.mobi/compatibility）
□ 确认手机已解锁（设置 → 通用 → 关于本机 → 运营商锁定："无SIM卡限制"）
□ 在 yah.mobi 购买套餐
□ 检查邮箱确认收到QR码

✅ 出发前1-2天：
□ 连接Wi-Fi后安装eSIM：
  - iPhone：设置 → 蜂窝网络 → 添加eSIM → 扫描QR码
  - Android：设置 → 连接 → SIM管理器 → 添加eSIM
□ 将eSIM标记为"yah.mobile"或"旅行"
□ 暂时不要启用（套餐从首次连接开始计算）
□ 下载目的地离线地图（Google地图 → 下载区域）
□ 如需要，下载Google翻译离线语言包

✅ 在机场（登机前）：
□ 确认eSIM已安装（在设置 → 蜂窝网络/SIM中检查）
□ 起飞前关机或开启飞行模式
□ 注意：此时不要启用yah.mobile数据

✅ 到达后（落地后）：
□ 关闭飞行模式
□ 前往 设置 → 蜂窝网络（或SIM管理器）
□ 启用yah.mobile线路
□ 开启数据漫游
□ 将yah.mobile设为数据线路
□ 开关飞行模式（刷新连接）
□ 等待30-60秒出现信号
□ 测试：打开网页或应用确认数据正常

✅ 如果无法连接：
□ 检查数据漫游是否已开启
□ 检查数据使用的线路是否正确
□ 再次尝试开关飞行模式
□ 必要时重启手机
□ 通过聊天联系yah.mobile客服

重要提醒：
- 保持原SIM卡激活用于通话/短信
- yah.mobile = 仅数据（此线路无语音通话）
- 套餐有效期从首次连接开始，非安装日期
- 保存此清单，旅行中随时参考！`
  },
  // ===== PRE-TRAVEL CHECKLIST - KOREAN =====
  {
    title: "여행 전 eSIM 체크리스트 - 출발 전 준비 (한국어)",
    content: `yah.mobile eSIM 완전 여행 전 체크리스트:

✅ 출발 1주일 전:
□ 휴대폰 eSIM 지원 확인 (yah.mobi/compatibility)
□ 휴대폰 SIM 잠금 해제 확인 (설정 → 일반 → 정보 → 통신사 잠금: "SIM 제한 없음")
□ yah.mobi에서 요금제 구매
□ 이메일에서 QR코드 확인

✅ 출발 1-2일 전:
□ Wi-Fi 연결 후 eSIM 설치:
  - iPhone: 설정 → 셀룰러 → eSIM 추가 → QR코드 스캔
  - Android: 설정 → 연결 → SIM 관리자 → eSIM 추가
□ eSIM을 "yah.mobile" 또는 "여행"으로 라벨 지정
□ 아직 활성화하지 마세요 (요금제는 첫 연결부터 시작)
□ 목적지 오프라인 지도 다운로드 (Google 지도 → 지역 다운로드)
□ 필요시 Google 번역 오프라인 언어팩 다운로드

✅ 공항에서 (탑승 전):
□ eSIM 설치 확인 (설정 → 셀룰러/SIM에서 확인)
□ 이륙 전 전원 끄기 또는 비행기 모드 켜기
□ 참고: 아직 yah.mobile 데이터 활성화하지 마세요

✅ 도착 후 (착륙 후):
□ 비행기 모드 끄기
□ 설정 → 셀룰러 (또는 SIM 관리자) 이동
□ yah.mobile 회선 활성화
□ 데이터 로밍 켜기
□ yah.mobile을 데이터 회선으로 설정
□ 비행기 모드 켜기 → 끄기 (연결 새로고침)
□ 30-60초 대기하여 신호 확인
□ 테스트: 웹사이트나 앱을 열어 데이터 작동 확인

✅ 연결 안 되면:
□ 데이터 로밍이 켜져 있는지 확인
□ 데이터 사용 회선이 맞는지 확인
□ 비행기 모드 다시 켜기/끄기
□ 필요시 휴대폰 재시작
□ yah.mobile 채팅 고객지원 연락

중요 사항:
- 기존 SIM은 통화/문자용으로 활성 상태 유지
- yah.mobile = 데이터 전용 (이 회선으로 음성통화 불가)
- 요금제 유효기간은 첫 연결부터 시작, 설치일이 아님
- 이 체크리스트를 저장해서 여행 중 참고하세요!`
  },
  // ===== DEPARTURE DAY TIMING GUIDE - ENGLISH =====
  {
    title: "Departure Day eSIM Activation Timing Guide (English)",
    content: `When to Activate Your yah.mobile eSIM - Timing Guide:

IMPORTANT: Your plan validity period starts from the moment you FIRST CONNECT to a mobile network using the eSIM. Choose your activation timing carefully!

OPTION A: Activate UPON ARRIVAL (Recommended for most travelers)
- Best for: Trips where you want maximum validity at destination
- How: Keep eSIM installed but disabled during flight. Enable after landing.
- Pros: Full plan duration available at destination
- Cons: No data during transit/layovers

OPTION B: Activate BEFORE DEPARTURE (at airport)
- Best for: Long layovers where you need data, or if you want to test before flying
- How: Enable eSIM at departure airport
- Pros: Can verify it works before leaving; data during layovers
- Cons: Uses some validity time before reaching destination

OPTION C: Activate DURING LAYOVER
- Best for: Long layovers (4+ hours) in a covered country
- How: Enable eSIM during layover, disable before next flight
- Note: Plan starts counting from this moment

TIMING TIPS:
- 7-day plan: If you arrive Monday morning, plan expires next Monday morning
- 15-day plan: Good buffer for activation timing flexibility
- 30-day plan: Most flexible, less timing pressure

WHAT NOT TO DO:
❌ Don't enable eSIM days before departure (wastes validity)
❌ Don't panic if no signal immediately after landing (wait 1-2 minutes)
❌ Don't forget to enable Data Roaming after activation

STEP-BY-STEP for arrival activation:
1. Plane lands → wait for "turn off airplane mode" announcement
2. Turn off Airplane Mode
3. Settings → Cellular → yah.mobile → Turn On
4. Enable Data Roaming
5. Wait 30-60 seconds
6. You should see signal bars and data connection
7. Open browser to confirm: if page loads, you're connected!`
  },
  // ===== DEPARTURE DAY TIMING GUIDE - CHINESE =====
  {
    title: "出发当天eSIM激活时机指南（中文）",
    content: `何时激活yah.mobile eSIM - 时机指南：

重要：套餐有效期从您首次使用eSIM连接移动网络的那一刻开始计算。请谨慎选择激活时机！

方案A：到达后激活（推荐大多数旅行者）
- 适合：希望在目的地获得最长有效期的旅行
- 方法：飞行期间保持eSIM已安装但未启用。落地后启用。
- 优点：目的地可使用完整套餐时长
- 缺点：中转/转机时无数据

方案B：出发前激活（在机场）
- 适合：需要数据的长时间转机，或想在出发前测试
- 方法：在出发机场启用eSIM
- 优点：出发前可验证是否正常工作；转机时有数据
- 缺点：到达目的地前会消耗部分有效期

方案C：转机时激活
- 适合：在覆盖国家的长时间转机（4小时以上）
- 方法：转机期间启用eSIM，下一段飞行前可选择禁用
- 注意：套餐从此刻开始计算

时机建议：
- 7天套餐：如果周一早上到达，套餐在下周一早上到期
- 15天套餐：有较好的时间缓冲
- 30天套餐：最灵活，时间压力最小

不要这样做：
❌ 不要在出发前几天就启用eSIM（浪费有效期）
❌ 落地后没有立即出现信号不要慌（等1-2分钟）
❌ 激活后不要忘记开启数据漫游

到达后激活步骤：
1. 飞机落地 → 等待"关闭飞行模式"提示
2. 关闭飞行模式
3. 设置 → 蜂窝网络 → yah.mobile → 开启
4. 开启数据漫游
5. 等待30-60秒
6. 应该能看到信号格和数据连接
7. 打开浏览器确认：如果页面加载成功，说明已连接！`
  },
  // ===== DEPARTURE DAY TIMING GUIDE - KOREAN =====
  {
    title: "출발 당일 eSIM 활성화 타이밍 가이드 (한국어)",
    content: `yah.mobile eSIM 언제 활성화할까 - 타이밍 가이드:

중요: 요금제 유효기간은 eSIM으로 모바일 네트워크에 처음 연결하는 순간부터 시작됩니다. 활성화 타이밍을 신중하게 선택하세요!

옵션 A: 도착 후 활성화 (대부분의 여행자에게 추천)
- 적합: 목적지에서 최대 유효기간을 원하는 여행
- 방법: 비행 중 eSIM 설치 상태 유지하되 비활성화. 착륙 후 활성화.
- 장점: 목적지에서 전체 요금제 기간 사용 가능
- 단점: 환승/경유 중 데이터 없음

옵션 B: 출발 전 활성화 (공항에서)
- 적합: 데이터가 필요한 긴 경유, 또는 출발 전 테스트하고 싶을 때
- 방법: 출발 공항에서 eSIM 활성화
- 장점: 출발 전 작동 확인 가능; 경유 중 데이터 사용
- 단점: 목적지 도착 전 일부 유효기간 소모

옵션 C: 경유 중 활성화
- 적합: 커버리지 국가에서의 긴 경유 (4시간 이상)
- 방법: 경유 중 eSIM 활성화, 다음 비행 전 비활성화 선택 가능
- 참고: 이 순간부터 요금제 시작

타이밍 팁:
- 7일 요금제: 월요일 아침 도착하면 다음 주 월요일 아침 만료
- 15일 요금제: 활성화 타이밍에 여유 있음
- 30일 요금제: 가장 유연, 시간 압박 적음

하지 말아야 할 것:
❌ 출발 며칠 전에 eSIM 활성화하지 마세요 (유효기간 낭비)
❌ 착륙 직후 신호가 안 잡혀도 당황하지 마세요 (1-2분 대기)
❌ 활성화 후 데이터 로밍 켜는 것을 잊지 마세요

도착 후 활성화 단계별 안내:
1. 비행기 착륙 → "비행기 모드 해제" 안내 대기
2. 비행기 모드 끄기
3. 설정 → 셀룰러 → yah.mobile → 켜기
4. 데이터 로밍 켜기
5. 30-60초 대기
6. 신호 막대와 데이터 연결이 표시되어야 함
7. 브라우저 열어 확인: 페이지가 로드되면 연결 완료!`
  },
];

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  console.log(`Inserting ${docs.length} Priority-LOW GEO RAG documents...`);

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

  console.log('Done! All Priority-LOW GEO documents inserted.');
  await pool.end();
}

main().catch(console.error);
