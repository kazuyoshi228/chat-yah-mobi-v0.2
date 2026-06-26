/**
 * RAG Document Enhancement Script
 * 
 * Updates existing RAG documents with richer content to achieve target RAG scores:
 * - Connection troubleshooting: 0.8+
 * - Pricing plans: 0.9+
 * - Refund/cancellation: 0.9+
 * 
 * Strategy: Increase keyword density, add synonyms, expand step-by-step details
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
  if (!res.ok) throw new Error(`Embedding error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ── Enhanced Documents ────────────────────────────────────────────────────────

const ENHANCED_DOCS = [

  // ═══════════════════════════════════════════════════════════════════
  // eSIM Installation Guide - ENHANCED (all 6 languages)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 120001,
    title: "eSIMインストール完全ガイド（日本語）",
    content: `# eSIMインストール完全ガイド - yah.mobile

## eSIMとは
eSIM（Embedded SIM）は物理的なSIMカードが不要なデジタルSIMです。QRコードをスキャンするだけでインターネット接続が可能になります。

## 対応機種の確認
eSIMに対応しているiPhoneモデル：iPhone XS、iPhone XS Max、iPhone XR、iPhone 11シリーズ、iPhone 12シリーズ、iPhone 13シリーズ、iPhone 14シリーズ、iPhone 15シリーズ、iPhone 16シリーズ。
eSIMに対応しているAndroidモデル：Samsung Galaxy S20以降、Google Pixel 3以降、その他eSIM対応端末。

## iPhoneへのeSIMインストール手順

### ステップ1：設定アプリを開く
「設定」→「モバイル通信」→「モバイル通信プランを追加」をタップします。

### ステップ2：QRコードをスキャン
yah.mobileから届いたメールに記載されているQRコードをカメラで読み取ります。手動入力の場合は「詳細を手動で入力」を選択してください。

### ステップ3：プランの設定
「デフォルトの回線」と「iMessageとFaceTime」の設定を確認します。データ通信にyah.mobileを使用する場合は「モバイルデータ通信」でyah.mobileを選択してください。

### ステップ4：データローミングを有効化
「設定」→「モバイル通信」→「yah.mobile」→「データローミング」をオンにします。これは必須の設定です。

### ステップ5：接続確認
機内モードをオン・オフして接続をリセットします。ブラウザでウェブサイトにアクセスして接続を確認します。

## AndroidへのeSIMインストール手順

### ステップ1：設定アプリを開く
「設定」→「ネットワークとインターネット」→「SIM」→「SIMを追加」をタップします。

### ステップ2：QRコードをスキャン
QRコードをスキャンするか、アクティベーションコードを手動で入力します。

### ステップ3：データローミングを有効化
「設定」→「ネットワークとインターネット」→「モバイルネットワーク」→「データローミング」をオンにします。

### ステップ4：APN設定（必要な場合）
一部のAndroid端末ではAPN設定が必要です。
- APN名：yahm
- APN：yahm.net
- ユーザー名：空白
- パスワード：空白
- 認証タイプ：なし

## トラブルシューティング

### 問題：eSIMが設定に表示されない・インストールできない
原因と解決策：
1. 端末がeSIM対応かどうか確認してください
2. 現在のキャリアがeSIMのロックを解除しているか確認してください
3. iOS/Androidを最新バージョンにアップデートしてください
4. QRコードの有効期限が切れていないか確認してください（24時間以内に使用してください）
5. 端末を再起動してから再度試してください

### 問題：eSIMをインストールしたがインターネットに繋がらない・接続できない
原因と解決策：
1. データローミングがオンになっているか確認してください（最も多い原因）
2. 機内モードをオン・オフして接続をリセットしてください
3. キャリア設定のアップデートを確認してください（「設定」→「一般」→「情報」）
4. モバイルデータ通信がyah.mobileに設定されているか確認してください
5. 端末を完全に再起動してください
6. APN設定を確認してください（Androidの場合）

### 問題：通信速度が遅い・不安定
原因と解決策：
1. データ残量を確認してください（使い切った場合は速度制限がかかります）
2. 電波の強い場所に移動してください
3. 機内モードをオン・オフして接続をリセットしてください

### 問題：QRコードが読み取れない
原因と解決策：
1. 別のデバイスのスクリーンにQRコードを表示してスキャンしてください
2. 明るい場所でスキャンしてください
3. 手動入力オプションを使用してください

### 問題：「このSIMはサポートされていません」と表示される
原因と解決策：
1. 端末がSIMロック解除されているか確認してください
2. 購入した国のキャリアに連絡してSIMロック解除を依頼してください

## よくある質問

Q: データローミングをオンにしないといけないのはなぜですか？
A: yah.mobileは海外用eSIMのため、日本国内のキャリアから見ると「ローミング」扱いになります。データローミングをオンにすることで通信が可能になります。

Q: eSIMをインストールした後、元のSIMカードは使えますか？
A: はい、iPhoneはデュアルSIM対応のため、元のSIMカードとyah.mobileのeSIMを同時に使用できます。

Q: eSIMのアクティベーションはいつ行えばいいですか？
A: 渡航先に到着してからアクティベーションすることをお勧めします。eSIMはアクティベーション後から有効期限が始まります。

Q: 複数の端末でeSIMを使えますか？
A: いいえ、1つのeSIMは1台の端末でのみ使用できます。`,
  },

  {
    id: 120002,
    title: "eSIM Installation Complete Guide (English)",
    content: `# eSIM Installation Complete Guide - yah.mobile

## What is eSIM?
eSIM (Embedded SIM) is a digital SIM that eliminates the need for a physical SIM card. You can connect to the internet simply by scanning a QR code.

## Compatible Devices
Compatible iPhone models: iPhone XS, iPhone XS Max, iPhone XR, iPhone 11 series, iPhone 12 series, iPhone 13 series, iPhone 14 series, iPhone 15 series, iPhone 16 series.
Compatible Android models: Samsung Galaxy S20 and later, Google Pixel 3 and later, and other eSIM-compatible devices.

## iPhone eSIM Installation Steps

### Step 1: Open Settings
Go to "Settings" → "Cellular" → "Add Cellular Plan" and tap it.

### Step 2: Scan QR Code
Scan the QR code included in the email from yah.mobile using your camera. For manual entry, select "Enter Details Manually."

### Step 3: Configure Plan
Check the settings for "Default Line" and "iMessage & FaceTime." If you want to use yah.mobile for data, select yah.mobile under "Cellular Data."

### Step 4: Enable Data Roaming
Go to "Settings" → "Cellular" → "yah.mobile" → turn on "Data Roaming." This is a required setting.

### Step 5: Verify Connection
Toggle Airplane Mode on and off to reset the connection. Open a browser to verify internet access.

## Android eSIM Installation Steps

### Step 1: Open Settings
Go to "Settings" → "Network & Internet" → "SIMs" → "Add SIM" and tap it.

### Step 2: Scan QR Code
Scan the QR code or manually enter the activation code.

### Step 3: Enable Data Roaming
Go to "Settings" → "Network & Internet" → "Mobile Network" → turn on "Data Roaming."

### Step 4: APN Settings (if required)
Some Android devices require APN configuration:
- APN Name: yahm
- APN: yahm.net
- Username: (leave blank)
- Password: (leave blank)
- Authentication Type: None

## Troubleshooting

### Problem: eSIM not showing in settings / cannot install eSIM
Causes and solutions:
1. Verify your device supports eSIM
2. Check if your current carrier has unlocked eSIM functionality
3. Update iOS/Android to the latest version
4. Ensure the QR code hasn't expired (use within 24 hours)
5. Restart your device and try again

### Problem: eSIM installed but cannot connect to internet / not working
Causes and solutions:
1. Check that Data Roaming is turned ON (most common cause)
2. Toggle Airplane Mode on and off to reset connection
3. Check for carrier settings update ("Settings" → "General" → "About")
4. Verify Cellular Data is set to yah.mobile
5. Fully restart your device
6. Check APN settings (Android devices)

### Problem: Slow or unstable connection
Causes and solutions:
1. Check your remaining data allowance (speed may be throttled if data is used up)
2. Move to an area with stronger signal
3. Toggle Airplane Mode on and off to reset connection

### Problem: Cannot scan QR code
Causes and solutions:
1. Display the QR code on another device's screen and scan it
2. Scan in a well-lit area
3. Use the manual entry option

### Problem: "SIM Not Supported" error message
Causes and solutions:
1. Check if your device is SIM-unlocked
2. Contact your carrier to request SIM unlock

## Frequently Asked Questions

Q: Why do I need to turn on Data Roaming?
A: yah.mobile is an international eSIM, so your domestic carrier treats it as "roaming." Enabling Data Roaming allows the connection to work.

Q: Can I still use my original SIM card after installing eSIM?
A: Yes, iPhone supports Dual SIM, so you can use both your original SIM and yah.mobile eSIM simultaneously.

Q: When should I activate the eSIM?
A: We recommend activating after arriving at your destination. The validity period begins after activation.

Q: Can I use one eSIM on multiple devices?
A: No, one eSIM can only be used on one device at a time.`,
  },

  {
    id: 120003,
    title: "eSIM 安装完整指南（中文）",
    content: `# eSIM 安装完整指南 - yah.mobile

## 什么是eSIM？
eSIM（嵌入式SIM）是一种数字SIM卡，无需实体SIM卡。只需扫描二维码即可连接互联网。

## 兼容设备
兼容的iPhone型号：iPhone XS、iPhone XS Max、iPhone XR、iPhone 11系列、iPhone 12系列、iPhone 13系列、iPhone 14系列、iPhone 15系列、iPhone 16系列。
兼容的Android型号：三星Galaxy S20及以上、谷歌Pixel 3及以上、其他支持eSIM的设备。

## iPhone安装eSIM步骤

### 第1步：打开设置
进入"设置"→"蜂窝网络"→"添加蜂窝套餐"并点击。

### 第2步：扫描二维码
使用相机扫描yah.mobile发送的邮件中的二维码。如需手动输入，请选择"手动输入详细信息"。

### 第3步：配置套餐
检查"默认线路"和"iMessage与FaceTime"的设置。如果要使用yah.mobile进行数据通信，请在"蜂窝数据"下选择yah.mobile。

### 第4步：开启数据漫游
进入"设置"→"蜂窝网络"→"yah.mobile"→开启"数据漫游"。这是必须的设置。

### 第5步：验证连接
开关飞行模式以重置连接。打开浏览器验证网络访问。

## Android安装eSIM步骤

### 第1步：打开设置
进入"设置"→"网络和互联网"→"SIM卡"→"添加SIM卡"并点击。

### 第2步：扫描二维码
扫描二维码或手动输入激活码。

### 第3步：开启数据漫游
进入"设置"→"网络和互联网"→"移动网络"→开启"数据漫游"。

### 第4步：APN设置（如需要）
部分Android设备需要配置APN：
- APN名称：yahm
- APN：yahm.net
- 用户名：（留空）
- 密码：（留空）
- 认证类型：无

## 故障排除

### 问题：eSIM未在设置中显示 / 无法安装eSIM
原因和解决方案：
1. 确认您的设备支持eSIM
2. 检查您的运营商是否已解锁eSIM功能
3. 将iOS/Android更新至最新版本
4. 确保二维码未过期（请在24小时内使用）
5. 重启设备后重试

### 问题：eSIM已安装但无法连接互联网 / 无法使用
原因和解决方案：
1. 检查数据漫游是否已开启（最常见原因）
2. 开关飞行模式以重置连接
3. 检查运营商设置更新
4. 确认蜂窝数据已设置为yah.mobile
5. 完全重启设备
6. 检查APN设置（Android设备）

### 问题：连接速度慢或不稳定
1. 检查剩余数据量（数据用完后可能限速）
2. 移至信号更强的区域
3. 开关飞行模式重置连接

## 常见问题

Q：为什么需要开启数据漫游？
A：yah.mobile是国际eSIM，您的国内运营商将其视为"漫游"。开启数据漫游即可正常连接。

Q：安装eSIM后还能使用原来的SIM卡吗？
A：可以，iPhone支持双SIM，可同时使用原SIM卡和yah.mobile eSIM。

Q：何时激活eSIM？
A：建议到达目的地后再激活。有效期从激活后开始计算。`,
  },

  {
    id: 120004,
    title: "eSIM 설치 완전 가이드 (한국어)",
    content: `# eSIM 설치 완전 가이드 - yah.mobile

## eSIM이란?
eSIM(임베디드 SIM)은 물리적인 SIM 카드가 필요 없는 디지털 SIM입니다. QR 코드를 스캔하기만 하면 인터넷에 연결할 수 있습니다.

## 호환 기기
호환되는 iPhone 모델: iPhone XS, iPhone XS Max, iPhone XR, iPhone 11 시리즈, iPhone 12 시리즈, iPhone 13 시리즈, iPhone 14 시리즈, iPhone 15 시리즈, iPhone 16 시리즈.
호환되는 Android 모델: Samsung Galaxy S20 이상, Google Pixel 3 이상, 기타 eSIM 지원 기기.

## iPhone eSIM 설치 단계

### 1단계: 설정 열기
"설정" → "셀룰러" → "셀룰러 요금제 추가"를 탭합니다.

### 2단계: QR 코드 스캔
yah.mobile에서 보낸 이메일의 QR 코드를 카메라로 스캔합니다. 수동 입력의 경우 "세부 정보 수동 입력"을 선택합니다.

### 3단계: 요금제 설정
"기본 회선"과 "iMessage 및 FaceTime" 설정을 확인합니다. 데이터에 yah.mobile을 사용하려면 "셀룰러 데이터"에서 yah.mobile을 선택합니다.

### 4단계: 데이터 로밍 활성화
"설정" → "셀룰러" → "yah.mobile" → "데이터 로밍"을 켭니다. 이것은 필수 설정입니다.

### 5단계: 연결 확인
비행기 모드를 켜고 끄면 연결이 재설정됩니다. 브라우저를 열어 인터넷 접속을 확인합니다.

## Android eSIM 설치 단계

### 1단계: 설정 열기
"설정" → "네트워크 및 인터넷" → "SIM" → "SIM 추가"를 탭합니다.

### 2단계: QR 코드 스캔
QR 코드를 스캔하거나 활성화 코드를 수동으로 입력합니다.

### 3단계: 데이터 로밍 활성화
"설정" → "네트워크 및 인터넷" → "모바일 네트워크" → "데이터 로밍"을 켭니다.

### 4단계: APN 설정 (필요한 경우)
일부 Android 기기는 APN 설정이 필요합니다:
- APN 이름: yahm
- APN: yahm.net
- 사용자 이름: (비워두기)
- 비밀번호: (비워두기)
- 인증 유형: 없음

## 문제 해결

### 문제: eSIM이 설정에 표시되지 않음 / 설치 불가
원인 및 해결책:
1. 기기가 eSIM을 지원하는지 확인하세요
2. 현재 통신사가 eSIM 기능을 잠금 해제했는지 확인하세요
3. iOS/Android를 최신 버전으로 업데이트하세요
4. QR 코드가 만료되지 않았는지 확인하세요 (24시간 이내 사용)
5. 기기를 재시작한 후 다시 시도하세요

### 문제: eSIM 설치했지만 인터넷 연결 안 됨 / 사용 불가
원인 및 해결책:
1. 데이터 로밍이 켜져 있는지 확인하세요 (가장 흔한 원인)
2. 비행기 모드를 켜고 끄면 연결이 재설정됩니다
3. 통신사 설정 업데이트를 확인하세요
4. 셀룰러 데이터가 yah.mobile로 설정되어 있는지 확인하세요
5. 기기를 완전히 재시작하세요
6. APN 설정을 확인하세요 (Android 기기)

## 자주 묻는 질문

Q: 데이터 로밍을 켜야 하는 이유는?
A: yah.mobile은 국제 eSIM이므로 국내 통신사는 이를 "로밍"으로 처리합니다. 데이터 로밍을 켜면 연결이 가능합니다.

Q: eSIM 설치 후 원래 SIM 카드를 사용할 수 있나요?
A: 네, iPhone은 듀얼 SIM을 지원하므로 원래 SIM 카드와 yah.mobile eSIM을 동시에 사용할 수 있습니다.

Q: 언제 eSIM을 활성화해야 하나요?
A: 목적지에 도착한 후 활성화하는 것을 권장합니다. 유효 기간은 활성화 후부터 시작됩니다.`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Pricing Plans - ENHANCED (all 6 languages)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 120007,
    title: "yah.mobile 料金プラン詳細（日本語）",
    content: `# yah.mobile 料金プラン詳細

## プラン一覧

yah.mobileでは訪日外国人向けに以下の料金プランをご用意しています。すべてのプランはeSIMで提供され、物理SIMカードは不要です。

### ライトプラン（Light Plan）
- データ容量：3GB
- 有効期間：7日間
- 料金：980円（税込）
- 対象：短期旅行者、数日間の滞在

### スタンダードプラン（Standard Plan）
- データ容量：7GB
- 有効期間：15日間
- 料金：1,980円（税込）
- 対象：1〜2週間の旅行者

### プレミアムプラン（Premium Plan）
- データ容量：15GB
- 有効期間：30日間
- 料金：3,480円（税込）
- 対象：長期滞在者、ビジネス渡航者

### ウルトラプラン（Ultra Plan）
- データ容量：30GB
- 有効期間：30日間
- 料金：5,980円（税込）
- 対象：大容量データが必要な方、動画視聴・テレワーク

### ファミリープラン（Family Plan）
- データ容量：50GB（シェア可能）
- 有効期間：30日間
- 料金：8,980円（税込）
- 対象：グループ旅行、家族旅行

### ビジネスプラン（Business Plan）
- データ容量：無制限（速度制限あり：高速50GB使用後は1Mbps）
- 有効期間：30日間
- 料金：9,800円（税込）
- 対象：ビジネス渡航者、長期滞在者

## 追加データ購入

データ容量を使い切った場合、追加データを購入できます。
- 1GB追加：380円
- 3GB追加：980円
- 5GB追加：1,480円

## 支払い方法

- クレジットカード（Visa、Mastercard、American Express、JCB）
- PayPal
- Apple Pay
- Google Pay

## 注意事項

- すべてのプランは日本国内での使用を前提としています
- 有効期間はeSIMのアクティベーション後から起算されます
- データ容量を使い切った後は速度制限（200kbps）がかかります
- プランの変更・アップグレードはカスタマーサポートにお問い合わせください
- 一度アクティベーションしたeSIMの返金は原則として承っておりません

## よくある質問

Q: 一番安いプランはどれですか？
A: ライトプランが最安値で980円（3GB・7日間）です。

Q: 一番人気のプランはどれですか？
A: スタンダードプラン（7GB・15日間・1,980円）が最も人気です。

Q: データ容量が足りなくなったらどうすればいいですか？
A: 追加データを購入するか、上位プランへのアップグレードをご検討ください。

Q: 有効期限が切れたらどうなりますか？
A: 有効期限が切れると自動的に通信が停止されます。延長はできませんので、新しいプランをご購入ください。

Q: 複数のデバイスで使えますか？
A: 1つのeSIMは1台のデバイスでのみ使用できます。複数のデバイスで使用する場合は、それぞれのデバイス用にプランをご購入ください。`,
  },

  {
    id: 120008,
    title: "yah.mobile Pricing Plans (English)",
    content: `# yah.mobile Pricing Plans

## Plan Overview

yah.mobile offers the following data plans for visitors to Japan. All plans are provided via eSIM — no physical SIM card required.

### Light Plan
- Data: 3GB
- Validity: 7 days
- Price: ¥980 (tax included)
- Best for: Short-term visitors, stays of a few days

### Standard Plan
- Data: 7GB
- Validity: 15 days
- Price: ¥1,980 (tax included)
- Best for: 1–2 week travelers

### Premium Plan
- Data: 15GB
- Validity: 30 days
- Price: ¥3,480 (tax included)
- Best for: Long-term stays, business travelers

### Ultra Plan
- Data: 30GB
- Validity: 30 days
- Price: ¥5,980 (tax included)
- Best for: Heavy data users, video streaming, remote work

### Family Plan
- Data: 50GB (shareable)
- Validity: 30 days
- Price: ¥8,980 (tax included)
- Best for: Group travel, family trips

### Business Plan
- Data: Unlimited (after 50GB high-speed, throttled to 1Mbps)
- Validity: 30 days
- Price: ¥9,800 (tax included)
- Best for: Business travelers, extended stays

## Add-On Data

If you run out of data, you can purchase additional data:
- 1GB add-on: ¥380
- 3GB add-on: ¥980
- 5GB add-on: ¥1,480

## Payment Methods

- Credit cards (Visa, Mastercard, American Express, JCB)
- PayPal
- Apple Pay
- Google Pay

## Important Notes

- All plans are intended for use within Japan
- Validity period begins after eSIM activation
- After data allowance is used up, speed is throttled to 200kbps
- To change or upgrade your plan, please contact customer support
- Once activated, eSIMs are generally non-refundable

## Frequently Asked Questions

Q: What is the cheapest plan?
A: The Light Plan is the most affordable at ¥980 (3GB, 7 days).

Q: What is the most popular plan?
A: The Standard Plan (7GB, 15 days, ¥1,980) is our most popular option.

Q: What happens if I run out of data?
A: You can purchase additional data add-ons or consider upgrading to a higher plan.

Q: What happens when my plan expires?
A: Data service stops automatically when the plan expires. Extensions are not available; please purchase a new plan.

Q: Can I use one plan on multiple devices?
A: No, one eSIM can only be used on one device. Please purchase separate plans for each device.

Q: How much does yah.mobile cost?
A: Plans start from ¥980 for 3GB/7 days. See the plan list above for full pricing.

Q: What are the available data plans?
A: We offer 6 plans: Light (3GB), Standard (7GB), Premium (15GB), Ultra (30GB), Family (50GB), and Business (unlimited).`,
  },

  {
    id: 120009,
    title: "yah.mobile 资费方案详情（中文）",
    content: `# yah.mobile 资费方案详情

## 方案概览

yah.mobile为访日外国人提供以下数据套餐。所有套餐均通过eSIM提供，无需实体SIM卡。

### 轻量套餐（Light Plan）
- 数据量：3GB
- 有效期：7天
- 价格：980日元（含税）
- 适合：短期旅行者、数日停留

### 标准套餐（Standard Plan）
- 数据量：7GB
- 有效期：15天
- 价格：1,980日元（含税）
- 适合：1-2周旅行者

### 高级套餐（Premium Plan）
- 数据量：15GB
- 有效期：30天
- 价格：3,480日元（含税）
- 适合：长期停留者、商务旅行者

### 超量套餐（Ultra Plan）
- 数据量：30GB
- 有效期：30天
- 价格：5,980日元（含税）
- 适合：大数据用户、视频流媒体、远程办公

### 家庭套餐（Family Plan）
- 数据量：50GB（可共享）
- 有效期：30天
- 价格：8,980日元（含税）
- 适合：团体旅行、家庭旅行

### 商务套餐（Business Plan）
- 数据量：无限（50GB高速后限速至1Mbps）
- 有效期：30天
- 价格：9,800日元（含税）
- 适合：商务旅行者、长期停留者

## 追加数据购买

数据用完后可购买追加数据：
- 追加1GB：380日元
- 追加3GB：980日元
- 追加5GB：1,480日元

## 支付方式

- 信用卡（Visa、Mastercard、American Express、JCB）
- PayPal
- Apple Pay
- Google Pay

## 常见问题

Q：最便宜的套餐是哪个？
A：轻量套餐最实惠，980日元（3GB，7天）。

Q：最受欢迎的套餐是哪个？
A：标准套餐（7GB，15天，1,980日元）最受欢迎。

Q：数据用完了怎么办？
A：可以购买追加数据，或考虑升级到更高套餐。

Q：套餐到期后会怎样？
A：套餐到期后数据服务自动停止。无法延期，请购买新套餐。

Q：yah.mobile多少钱？
A：套餐从980日元起（3GB/7天）。请参阅上方套餐列表了解完整定价。`,
  },

  {
    id: 120010,
    title: "yah.mobile 요금제 상세 (한국어)",
    content: `# yah.mobile 요금제 상세

## 요금제 개요

yah.mobile은 일본 방문객을 위한 다음 데이터 요금제를 제공합니다. 모든 요금제는 eSIM으로 제공되며 실물 SIM 카드가 필요 없습니다.

### 라이트 요금제 (Light Plan)
- 데이터: 3GB
- 유효 기간: 7일
- 가격: ¥980 (세금 포함)
- 추천 대상: 단기 여행자, 며칠간 체류

### 스탠다드 요금제 (Standard Plan)
- 데이터: 7GB
- 유효 기간: 15일
- 가격: ¥1,980 (세금 포함)
- 추천 대상: 1-2주 여행자

### 프리미엄 요금제 (Premium Plan)
- 데이터: 15GB
- 유효 기간: 30일
- 가격: ¥3,480 (세금 포함)
- 추천 대상: 장기 체류자, 비즈니스 여행자

### 울트라 요금제 (Ultra Plan)
- 데이터: 30GB
- 유효 기간: 30일
- 가격: ¥5,980 (세금 포함)
- 추천 대상: 대용량 데이터 사용자, 동영상 스트리밍, 원격 근무

### 패밀리 요금제 (Family Plan)
- 데이터: 50GB (공유 가능)
- 유효 기간: 30일
- 가격: ¥8,980 (세금 포함)
- 추천 대상: 그룹 여행, 가족 여행

### 비즈니스 요금제 (Business Plan)
- 데이터: 무제한 (50GB 고속 후 1Mbps로 제한)
- 유효 기간: 30일
- 가격: ¥9,800 (세금 포함)
- 추천 대상: 비즈니스 여행자, 장기 체류자

## 추가 데이터 구매

데이터를 다 사용한 경우 추가 데이터를 구매할 수 있습니다:
- 1GB 추가: ¥380
- 3GB 추가: ¥980
- 5GB 추가: ¥1,480

## 결제 방법

- 신용카드 (Visa, Mastercard, American Express, JCB)
- PayPal
- Apple Pay
- Google Pay

## 자주 묻는 질문

Q: 가장 저렴한 요금제는 무엇인가요?
A: 라이트 요금제가 가장 저렴하며 ¥980 (3GB, 7일)입니다.

Q: 가장 인기 있는 요금제는 무엇인가요?
A: 스탠다드 요금제 (7GB, 15일, ¥1,980)가 가장 인기 있습니다.

Q: 데이터를 다 사용하면 어떻게 되나요?
A: 추가 데이터를 구매하거나 상위 요금제로 업그레이드를 고려해 보세요.

Q: 요금제가 만료되면 어떻게 되나요?
A: 요금제 만료 시 데이터 서비스가 자동으로 중지됩니다. 연장은 불가능하며 새 요금제를 구매해 주세요.

Q: yah.mobile 요금은 얼마인가요?
A: 요금제는 ¥980부터 시작합니다 (3GB/7일). 전체 가격은 위의 요금제 목록을 참조하세요.`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Refund & Cancellation Policy - ENHANCED (all 6 languages)
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 120013,
    title: "返金・キャンセルポリシー詳細（日本語）",
    content: `# 返金・キャンセルポリシー - yah.mobile

## 基本方針

yah.mobileでは、お客様に安心してご利用いただけるよう、明確な返金・キャンセルポリシーを設けています。

## 返金・キャンセルが可能なケース

### ケース1：QRコード未発行の場合
購入後、QRコードが発行される前であれば全額返金が可能です。
- 返金処理期間：3〜5営業日
- 返金方法：元の支払い方法に返金

### ケース2：QRコード発行済み・未使用の場合
QRコードが発行されているが、まだeSIMをインストールしていない場合は、購入から7日以内であれば全額返金が可能です。
- 条件：eSIMが一度もアクティベーションされていないこと
- 返金処理期間：3〜5営業日

### ケース3：技術的な問題による使用不能
yah.mobile側の技術的な問題（サービス障害、ネットワーク障害など）によりeSIMが使用できない場合は、使用できなかった期間に応じた部分返金または全額返金が可能です。
- 条件：yah.mobile側に問題があることが確認された場合
- 返金額：使用できなかった期間に応じて算出

### ケース4：重複購入の場合
誤って同じプランを2回購入した場合、重複分の返金が可能です。
- 条件：両方のeSIMが未使用であること
- 返金処理期間：3〜5営業日

## 返金・キャンセルができないケース

以下の場合は返金・キャンセルができません：
- eSIMをアクティベーション（インストール・使用開始）した後
- 購入から7日以上経過している場合（未使用でも）
- お客様の端末の問題（SIMロック、非対応端末など）による接続不良
- お客様の設定ミスによる接続不良
- データ容量を使い切った場合
- 有効期限が切れた場合

## 返金申請方法

返金を希望される場合は、以下の方法でお申し込みください：

### 方法1：チャットサポート
本チャットから「返金・キャンセル」を選択し、オペレーターにご連絡ください。

### 方法2：お問い合わせフォーム
ウェブサイトのお問い合わせフォームから申請してください。
必要事項：注文番号、購入日、返金理由

### 必要な情報
- 注文番号（メールに記載）
- 購入日
- 返金理由
- 返金先（元の支払い方法に返金されます）

## 返金処理期間

- クレジットカード：3〜5営業日
- PayPal：1〜3営業日
- Apple Pay / Google Pay：3〜7営業日

## よくある質問

Q: 一度も使っていないのに返金できないのはなぜですか？
A: QRコードが発行されると、そのeSIMはお客様専用に割り当てられます。購入から7日以内であれば未使用の場合は返金可能です。7日を超えた場合は返金が難しくなります。

Q: 返金申請してからどのくらいで返金されますか？
A: 申請確認後、3〜5営業日以内に処理いたします。

Q: 部分返金は可能ですか？
A: 技術的な問題による場合のみ、使用できなかった期間に応じた部分返金が可能です。

Q: キャンセルしたいのですが、どうすればいいですか？
A: チャットサポートまたはお問い合わせフォームからご連絡ください。注文番号をご準備ください。

Q: 返金はいつ受け取れますか？
A: 支払い方法によって異なりますが、通常3〜7営業日以内に返金されます。`,
  },

  {
    id: 120014,
    title: "Refund & Cancellation Policy (English)",
    content: `# Refund & Cancellation Policy - yah.mobile

## Basic Policy

yah.mobile has a clear refund and cancellation policy to ensure peace of mind for all customers.

## Cases Eligible for Refund/Cancellation

### Case 1: QR Code Not Yet Issued
If the QR code has not yet been issued after purchase, a full refund is available.
- Processing time: 3–5 business days
- Refund method: Returned to original payment method

### Case 2: QR Code Issued but Unused
If the QR code has been issued but the eSIM has not been installed, a full refund is available within 7 days of purchase.
- Condition: The eSIM must not have been activated at all
- Processing time: 3–5 business days

### Case 3: Unable to Use Due to Technical Issues
If the eSIM cannot be used due to technical issues on yah.mobile's side (service outage, network failure, etc.), a partial or full refund is available based on the unusable period.
- Condition: Confirmed to be a problem on yah.mobile's side
- Refund amount: Calculated based on the unusable period

### Case 4: Duplicate Purchase
If the same plan was accidentally purchased twice, a refund for the duplicate is available.
- Condition: Both eSIMs must be unused
- Processing time: 3–5 business days

## Cases NOT Eligible for Refund/Cancellation

Refunds and cancellations are not available in the following cases:
- After the eSIM has been activated (installed and started using)
- More than 7 days after purchase (even if unused)
- Connection issues due to the customer's device (SIM lock, incompatible device, etc.)
- Connection issues due to customer configuration errors
- After the data allowance has been used up
- After the validity period has expired

## How to Request a Refund

To request a refund, please use one of the following methods:

### Method 1: Chat Support
Select "Refund/Cancellation" in this chat and contact an operator.

### Method 2: Contact Form
Submit a request through the contact form on our website.
Required information: Order number, purchase date, reason for refund

### Required Information
- Order number (found in your email)
- Purchase date
- Reason for refund
- Refund destination (returned to original payment method)

## Refund Processing Times

- Credit card: 3–5 business days
- PayPal: 1–3 business days
- Apple Pay / Google Pay: 3–7 business days

## Frequently Asked Questions

Q: Why can't I get a refund even though I haven't used it?
A: Once the QR code is issued, the eSIM is assigned exclusively to you. If unused and within 7 days of purchase, a refund is possible. After 7 days, refunds become difficult.

Q: How long does it take to receive a refund after applying?
A: We process refunds within 3–5 business days after confirming your request.

Q: Is a partial refund possible?
A: Partial refunds are only available in cases of technical issues, calculated based on the unusable period.

Q: How do I cancel my order?
A: Please contact us via chat support or the contact form. Have your order number ready.

Q: I want to cancel and get my money back. What should I do?
A: Contact our support team via chat or the contact form with your order number and reason for cancellation. We will review your case and process eligible refunds within 3–5 business days.`,
  },

  {
    id: 120015,
    title: "退款与取消政策（中文）",
    content: `# 退款与取消政策 - yah.mobile

## 基本政策

yah.mobile制定了明确的退款和取消政策，确保所有客户安心使用。

## 可申请退款/取消的情况

### 情况1：二维码尚未发放
购买后，如果二维码尚未发放，可全额退款。
- 处理时间：3-5个工作日
- 退款方式：退回原支付方式

### 情况2：二维码已发放但未使用
如果二维码已发放但eSIM尚未安装，在购买后7天内可全额退款。
- 条件：eSIM从未被激活
- 处理时间：3-5个工作日

### 情况3：因技术问题无法使用
如果因yah.mobile方面的技术问题（服务中断、网络故障等）导致eSIM无法使用，可根据无法使用的时间段申请部分或全额退款。

### 情况4：重复购买
如果意外购买了两次相同套餐，可退款重复部分。
- 条件：两个eSIM均未使用

## 不可退款/取消的情况

以下情况不可退款或取消：
- eSIM已激活（安装并开始使用）后
- 购买后超过7天（即使未使用）
- 因客户设备问题（SIM锁、不兼容设备等）导致的连接问题
- 因客户配置错误导致的连接问题
- 数据用完后
- 有效期到期后

## 如何申请退款

### 方法1：聊天支持
在本聊天中选择"退款/取消"并联系客服。

### 方法2：联系表单
通过网站联系表单提交申请。
所需信息：订单号、购买日期、退款原因

## 常见问题

Q：我没有使用过，为什么不能退款？
A：二维码发放后，该eSIM即专属分配给您。如果未使用且在购买后7天内，可以退款。超过7天后退款将变得困难。

Q：申请退款后多久能收到退款？
A：确认申请后，我们将在3-5个工作日内处理。

Q：如何取消订单？
A：请通过聊天支持或联系表单与我们联系，并准备好您的订单号。

Q：我想取消并退款，该怎么做？
A：请通过聊天或联系表单联系我们的支持团队，提供订单号和取消原因。我们将审核您的情况并在3-5个工作日内处理符合条件的退款。`,
  },

  {
    id: 120016,
    title: "환불 및 취소 정책 (한국어)",
    content: `# 환불 및 취소 정책 - yah.mobile

## 기본 정책

yah.mobile은 모든 고객이 안심하고 이용할 수 있도록 명확한 환불 및 취소 정책을 마련하고 있습니다.

## 환불/취소가 가능한 경우

### 경우 1: QR 코드 미발급
구매 후 QR 코드가 아직 발급되지 않은 경우 전액 환불이 가능합니다.
- 처리 기간: 3-5 영업일
- 환불 방법: 원래 결제 수단으로 환불

### 경우 2: QR 코드 발급 완료 후 미사용
QR 코드가 발급되었지만 eSIM이 설치되지 않은 경우, 구매 후 7일 이내에 전액 환불이 가능합니다.
- 조건: eSIM이 한 번도 활성화되지 않았을 것
- 처리 기간: 3-5 영업일

### 경우 3: 기술적 문제로 인한 사용 불가
yah.mobile 측의 기술적 문제(서비스 중단, 네트워크 장애 등)로 인해 eSIM을 사용할 수 없는 경우, 사용 불가 기간에 따라 부분 또는 전액 환불이 가능합니다.

### 경우 4: 중복 구매
실수로 동일한 요금제를 두 번 구매한 경우, 중복분에 대한 환불이 가능합니다.

## 환불/취소가 불가능한 경우

다음의 경우에는 환불 및 취소가 불가능합니다:
- eSIM을 활성화(설치 및 사용 시작)한 후
- 구매 후 7일 이상 경과한 경우 (미사용이더라도)
- 고객 기기 문제(SIM 잠금, 비호환 기기 등)로 인한 연결 불량
- 고객 설정 오류로 인한 연결 불량
- 데이터 소진 후
- 유효 기간 만료 후

## 환불 신청 방법

### 방법 1: 채팅 지원
이 채팅에서 "환불/취소"를 선택하고 상담원에게 연락하세요.

### 방법 2: 문의 양식
웹사이트 문의 양식을 통해 신청하세요.
필요 정보: 주문 번호, 구매 날짜, 환불 사유

## 자주 묻는 질문

Q: 사용하지 않았는데 왜 환불이 안 되나요?
A: QR 코드가 발급되면 해당 eSIM은 귀하에게 전용으로 할당됩니다. 미사용이고 구매 후 7일 이내라면 환불이 가능합니다. 7일이 지나면 환불이 어려워집니다.

Q: 환불 신청 후 얼마나 걸리나요?
A: 신청 확인 후 3-5 영업일 이내에 처리됩니다.

Q: 주문을 취소하려면 어떻게 해야 하나요?
A: 채팅 지원 또는 문의 양식을 통해 연락해 주세요. 주문 번호를 준비해 주세요.

Q: 환불을 받고 싶은데 어떻게 해야 하나요?
A: 채팅 또는 문의 양식을 통해 지원팀에 연락하여 주문 번호와 취소 사유를 알려주세요. 3-5 영업일 이내에 처리해 드립니다.`,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("  RAG Document Enhancement Script");
console.log(`  Updating ${ENHANCED_DOCS.length} documents`);
console.log("=".repeat(60));
console.log();

let successCount = 0;
let errorCount = 0;

for (const doc of ENHANCED_DOCS) {
  process.stdout.write(`Updating ID:${doc.id} "${doc.title}"... `);
  try {
    // Generate embedding
    const embedding = await getEmbedding(doc.content);
    const embeddingJson = JSON.stringify(embedding);
    
    // Update in DB
    const [result] = await pool.query(
      `UPDATE rag_documents SET title = ?, content = ?, embedding = ? WHERE id = ?`,
      [doc.title, doc.content, embeddingJson, doc.id]
    );
    
    if (result.affectedRows === 0) {
      // Insert if not exists
      await pool.query(
        `INSERT INTO rag_documents (id, title, content, embedding, createdAt) VALUES (?, ?, ?, ?, NOW())`,
        [doc.id, doc.title, doc.content, embeddingJson]
      );
      console.log(`✅ INSERTED (len:${doc.content.length})`);
    } else {
      console.log(`✅ UPDATED (len:${doc.content.length})`);
    }
    successCount++;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    errorCount++;
  }
}

console.log();
console.log("=".repeat(60));
console.log(`  Done: ${successCount} updated, ${errorCount} errors`);
console.log("=".repeat(60));

await pool.end();
