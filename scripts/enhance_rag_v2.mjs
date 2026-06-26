/**
 * RAG Document Enhancement v2 - Granular troubleshooting documents
 * 
 * Strategy:
 * 1. Split connection troubleshooting into granular step-by-step docs
 *    (each step as a separate document for better cosine similarity matching)
 * 2. Add "still not working" / "まだ繋がらない" specific documents
 * 3. Maximize keyword density for short follow-up queries
 * 4. Add device-specific documents (iPhone vs Android)
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
    }),
  });
  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding;
}

// Granular RAG documents - each targets specific user queries
const GRANULAR_DOCS = [
  // === CONNECTION TROUBLESHOOTING - iPhone ===
  {
    id: 'iphone-not-connecting',
    title: 'iPhone eSIM Not Connecting - Troubleshooting',
    language: 'en',
    content: `# iPhone eSIM Not Connecting - Complete Troubleshooting Guide

## Keywords: not connecting, can't connect, no signal, no service, not working, still not working, iPhone, iOS

## Problem: eSIM installed but cannot connect to internet in Japan

### Step 1: Enable the eSIM Line
Settings > Cellular > check that yah.mobile eSIM line toggle is ON (green).
If you see "No Service" or "SOS Only", the line may be disabled.

### Step 2: Turn on Data Roaming
Settings > Cellular > tap yah.mobile line > Turn on "Data Roaming"
IMPORTANT: Data Roaming MUST be enabled for international eSIM to work in Japan.

### Step 3: Set APN
Settings > Cellular > tap yah.mobile line > Cellular Data Network
Set APN to: yah.mobile
Leave Username and Password blank.

### Step 4: Set as Primary Data Line
Settings > Cellular > Cellular Data > select yah.mobile
This ensures your device uses the eSIM for internet, not your physical SIM.

### Step 5: Toggle Airplane Mode
Turn Airplane Mode ON, wait 10 seconds, then turn OFF.
This forces the device to re-register on the network.

### Step 6: Check Carrier Settings
Settings > General > About
If a carrier settings update is available, a popup will appear. Tap "Update".

### Step 7: Restart Device
Power off completely, wait 30 seconds, power on.

### Step 8: Reset Network Settings (Last Resort)
Settings > General > Transfer or Reset iPhone > Reset > Reset Network Settings
WARNING: This will erase saved Wi-Fi passwords.

### Still Not Working After All Steps?
If you've completed all 8 steps and still cannot connect:
- Confirm you are physically in Japan
- Check if your device is carrier-unlocked (locked devices cannot use other eSIMs)
- Try removing and re-installing the eSIM using the original QR code
- Contact us via the form at yah.mobi/app for personalized assistance`
  },
  {
    id: 'iphone-not-connecting-ja',
    title: 'iPhone eSIM 接続できない - トラブルシューティング',
    language: 'ja',
    content: `# iPhone eSIM 接続できない・繋がらない 完全トラブルシューティング

## キーワード: 繋がらない、接続できない、圏外、通信できない、使えない、まだ繋がらない、iPhone、iOS

## 問題: eSIMをインストールしたがインターネットに接続できない

### ステップ1: eSIM回線を有効化
設定 > モバイル通信 > yah.mobile回線のトグルがON（緑）になっているか確認。
「圏外」「SOS」と表示される場合、回線が無効になっている可能性があります。

### ステップ2: データローミングをON
設定 > モバイル通信 > yah.mobile回線をタップ > 「データローミング」をON
重要: 海外eSIMが日本で動作するには、データローミングを必ずONにする必要があります。

### ステップ3: APN設定
設定 > モバイル通信 > yah.mobile回線をタップ > モバイルデータ通信ネットワーク
APN: yah.mobile
ユーザー名・パスワードは空欄のまま。

### ステップ4: 主回線に設定
設定 > モバイル通信 > モバイルデータ通信 > yah.mobileを選択
これにより、物理SIMではなくeSIMでインターネット接続します。

### ステップ5: 機内モードの切り替え
機内モードをON → 10秒待つ → OFF
ネットワークへの再登録を強制します。

### ステップ6: キャリア設定の確認
設定 > 一般 > 情報
キャリア設定のアップデートがあれば、ポップアップが表示されます。「アップデート」をタップ。

### ステップ7: デバイスを再起動
電源を完全にOFF → 30秒待つ → 電源ON。

### ステップ8: ネットワーク設定のリセット（最終手段）
設定 > 一般 > 転送またはiPhoneをリセット > リセット > ネットワーク設定をリセット
注意: 保存済みのWi-Fiパスワードが消去されます。

### すべてのステップを試しても繋がらない場合
- 日本国内にいることを確認してください
- デバイスがSIMロック解除されているか確認（ロック端末は他社eSIMを使用できません）
- 元のQRコードを使ってeSIMを削除・再インストールしてみてください
- yah.mobi/app のお問い合わせフォームからご連絡ください`
  },
  // === CONNECTION TROUBLESHOOTING - Android ===
  {
    id: 'android-not-connecting',
    title: 'Android eSIM Not Connecting - Troubleshooting',
    language: 'en',
    content: `# Android eSIM Not Connecting - Complete Troubleshooting Guide

## Keywords: not connecting, can't connect, no signal, no service, not working, still not working, Android, Samsung, Pixel, Galaxy

## Problem: eSIM installed but cannot connect to internet in Japan

### Step 1: Enable the eSIM
Settings > Network & Internet > SIMs > check yah.mobile eSIM is toggled ON.
On Samsung: Settings > Connections > SIM Manager > yah.mobile > Enable.

### Step 2: Turn on Data Roaming
Settings > Network & Internet > SIMs > yah.mobile > enable "Roaming"
On Samsung: Settings > Connections > Mobile Networks > Data Roaming > ON
IMPORTANT: Data Roaming MUST be enabled for international eSIM to work.

### Step 3: Set APN
Settings > Network & Internet > SIMs > yah.mobile > Access Point Names > Add new APN
Name: yah.mobile
APN: yah.mobile
Leave all other fields blank. Save and select this APN.
On Samsung: Settings > Connections > Mobile Networks > Access Point Names

### Step 4: Set as Default Data SIM
Settings > Network & Internet > SIMs > set yah.mobile as "Mobile data" default.
On Samsung: Settings > Connections > SIM Manager > Preferred SIM > Mobile data > yah.mobile

### Step 5: Toggle Airplane Mode
Turn Airplane Mode ON, wait 10 seconds, then turn OFF.

### Step 6: Restart Device
Power off completely, wait 30 seconds, power on.

### Step 7: Reset Network Settings (Last Resort)
Settings > System > Reset options > Reset Wi-Fi, mobile & Bluetooth
On Samsung: Settings > General Management > Reset > Reset Network Settings
WARNING: This erases saved Wi-Fi passwords and Bluetooth pairings.

### Still Not Working After All Steps?
- Confirm you are physically in Japan
- Check device is carrier-unlocked
- Try removing and re-adding the eSIM profile
- Contact us via yah.mobi/app for personalized assistance`
  },
  {
    id: 'android-not-connecting-ja',
    title: 'Android eSIM 接続できない - トラブルシューティング',
    language: 'ja',
    content: `# Android eSIM 接続できない・繋がらない 完全トラブルシューティング

## キーワード: 繋がらない、接続できない、圏外、通信できない、使えない、まだ繋がらない、Android、Samsung、Pixel、Galaxy

## 問題: eSIMをインストールしたがインターネットに接続できない

### ステップ1: eSIMを有効化
設定 > ネットワークとインターネット > SIM > yah.mobile eSIMのトグルがONか確認。
Samsung: 設定 > 接続 > SIMマネージャー > yah.mobile > 有効化。

### ステップ2: データローミングをON
設定 > ネットワークとインターネット > SIM > yah.mobile > 「ローミング」をON
Samsung: 設定 > 接続 > モバイルネットワーク > データローミング > ON
重要: 海外eSIMが動作するにはデータローミングが必須です。

### ステップ3: APN設定
設定 > ネットワークとインターネット > SIM > yah.mobile > アクセスポイント名 > 新規追加
名前: yah.mobile
APN: yah.mobile
他のフィールドは空欄。保存してこのAPNを選択。
Samsung: 設定 > 接続 > モバイルネットワーク > アクセスポイント名

### ステップ4: デフォルトデータSIMに設定
設定 > ネットワークとインターネット > SIM > yah.mobileを「モバイルデータ」のデフォルトに設定。
Samsung: 設定 > 接続 > SIMマネージャー > 優先SIM > モバイルデータ > yah.mobile

### ステップ5: 機内モードの切り替え
機内モードON → 10秒待つ → OFF。

### ステップ6: デバイスを再起動
電源を完全にOFF → 30秒待つ → 電源ON。

### ステップ7: ネットワーク設定のリセット（最終手段）
設定 > システム > リセットオプション > Wi-Fi、モバイル、Bluetoothをリセット
Samsung: 設定 > 一般管理 > リセット > ネットワーク設定をリセット
注意: Wi-Fiパスワードとペアリング情報が消去されます。

### すべてのステップを試しても繋がらない場合
- 日本国内にいることを確認
- デバイスがSIMロック解除されているか確認
- eSIMプロファイルを削除して再追加
- yah.mobi/app のお問い合わせフォームからご連絡ください`
  },
  // === "STILL NOT WORKING" specific documents ===
  {
    id: 'still-not-working-en',
    title: 'eSIM Still Not Working - Next Steps',
    language: 'en',
    content: `# eSIM Still Not Working - Advanced Troubleshooting

## Keywords: still not working, still can't connect, tried everything, nothing works, same problem, not resolved, again, still no signal, still not connecting, doesn't work, cannot connect

## If basic troubleshooting didn't help, try these advanced steps:

### Check 1: Are you in Japan?
yah.mobile eSIM only works within Japan. It will not connect in other countries or during transit.

### Check 2: Is your device carrier-unlocked?
A carrier-locked device (e.g., locked to AT&T, Vodafone, or a specific carrier) cannot use third-party eSIMs.
How to check: Insert a SIM from a different carrier. If it doesn't work, your device is locked.
Solution: Contact your original carrier to request an unlock.

### Check 3: Remove and Re-install eSIM
Sometimes the eSIM profile gets corrupted during installation.
1. Delete the current yah.mobile eSIM profile
2. Re-scan the original QR code (you can use the same QR code multiple times)
3. Complete the installation process again

### Check 4: Try Manual Network Selection
Settings > Cellular/Mobile > Network Selection > turn off Automatic
Look for networks containing "Docomo", "Softbank", or "KDDI" and select one manually.
After connecting, you can switch back to Automatic.

### Check 5: Date & Time Settings
Ensure "Set Automatically" is enabled for Date & Time.
Incorrect date/time can prevent network authentication.

### Check 6: Software Update
Ensure your device OS is up to date. Older OS versions may have eSIM compatibility issues.

### If NONE of the above works:
Your case may require individual investigation. Please contact us through the form at yah.mobi/app (scroll to CONTACT section). Include:
- Your device model and OS version
- Screenshot of your cellular/SIM settings
- When you purchased and installed the eSIM
We respond within 2 hours during business hours (9:00-21:00 JST).`
  },
  {
    id: 'still-not-working-ja',
    title: 'eSIM まだ繋がらない - 追加トラブルシューティング',
    language: 'ja',
    content: `# eSIM まだ繋がらない・解決しない - 高度なトラブルシューティング

## キーワード: まだ繋がらない、まだ接続できない、全部試した、何をしてもダメ、同じ問題、解決しない、また、まだ圏外、まだ使えない、できない、うまくいかない

## 基本的なトラブルシューティングで解決しない場合の追加手順:

### 確認1: 日本国内にいますか？
yah.mobile eSIMは日本国内でのみ動作します。他の国や移動中は接続できません。

### 確認2: デバイスはSIMロック解除されていますか？
キャリアロックされたデバイス（特定のキャリアにロックされている）は、他社のeSIMを使用できません。
確認方法: 別のキャリアのSIMを挿入してみてください。動作しなければロックされています。
解決策: 元のキャリアにロック解除を依頼してください。

### 確認3: eSIMを削除して再インストール
インストール中にeSIMプロファイルが破損することがあります。
1. 現在のyah.mobile eSIMプロファイルを削除
2. 元のQRコードを再スキャン（同じQRコードは何度でも使用可能）
3. インストールプロセスを再度完了

### 確認4: 手動ネットワーク選択
設定 > モバイル通信 > ネットワーク選択 > 自動をOFF
「Docomo」「Softbank」「KDDI」を含むネットワークを探して手動選択。
接続後、自動に戻せます。

### 確認5: 日付と時刻の設定
「自動設定」が有効になっていることを確認。
日付/時刻が正しくないと、ネットワーク認証に失敗することがあります。

### 確認6: ソフトウェアアップデート
デバイスのOSが最新であることを確認。古いOSバージョンにはeSIM互換性の問題がある場合があります。

### 上記すべてを試しても解決しない場合:
個別調査が必要な場合があります。yah.mobi/app のお問い合わせフォーム（CONTACTセクション）からご連絡ください。以下の情報をお知らせください:
- デバイスの機種名とOSバージョン
- モバイル通信/SIM設定のスクリーンショット
- eSIMの購入・インストール日時
営業時間内（9:00-21:00 JST）2時間以内に返信いたします。`
  },
  // === PRICING DOCUMENTS ===
  {
    id: 'pricing-plans-en',
    title: 'yah.mobile Pricing Plans & Purchase Guide',
    language: 'en',
    content: `# yah.mobile Pricing Plans & Purchase Guide

## Keywords: price, pricing, plan, plans, cost, how much, fee, rate, cheap, cheapest, data plan, GB, gigabyte, purchase, buy, order, payment

## Available Plans (Tax Included)

| Plan | Data | Duration | Price |
|------|------|----------|-------|
| Light | 3 GB | 7 days | ¥1,078 |
| Standard | 5 GB | 15 days | ¥1,848 |
| Value | 10 GB | 30 days | ¥3,278 |
| Premium | 20 GB | 30 days | ¥5,478 |
| Ultra | 50 GB | 30 days | ¥11,000 |
| Unlimited | Unlimited | 30 days | ¥16,500 |

## Additional Data
- 1 GB add-on: ¥550 (valid for remaining plan period)
- Can be purchased anytime through the app

## Plan Recommendations
- Short trip (3-5 days), light use: Light plan (3GB)
- Standard trip (1-2 weeks), social media & maps: Standard plan (5GB)
- Extended stay (1 month), moderate use: Value plan (10GB)
- Business travelers, heavy use: Premium or Ultra plan
- Remote workers, unlimited streaming: Unlimited plan

## How to Purchase
1. Visit yah.mobi on your smartphone
2. Select your desired plan
3. Complete payment (credit card, Apple Pay, or Google Pay)
4. Receive QR code via email immediately
5. Scan QR code to install eSIM (can install before arriving in Japan)

## Payment Methods
- Credit/Debit Cards: Visa, Mastercard, American Express, JCB
- Digital Wallets: Apple Pay, Google Pay
- All prices include 10% consumption tax

## Compatible Devices
- iPhone XS or later (iOS 14+)
- Google Pixel 3 or later
- Samsung Galaxy S20 or later
- Other eSIM-compatible Android devices

## Validity Period
- Starts when you first connect to the network in Japan
- NOT from purchase date
- You can install the eSIM before your trip`
  },
  {
    id: 'pricing-plans-ja',
    title: 'yah.mobile 料金プラン・購入ガイド',
    language: 'ja',
    content: `# yah.mobile 料金プラン・購入ガイド

## キーワード: 料金、プラン、値段、いくら、費用、価格、安い、最安、データプラン、ギガ、GB、購入、買う、注文、支払い、料金プラン

## 利用可能なプラン（税込）

| プラン | データ量 | 有効期間 | 価格 |
|--------|---------|---------|------|
| Light | 3 GB | 7日間 | ¥1,078 |
| Standard | 5 GB | 15日間 | ¥1,848 |
| Value | 10 GB | 30日間 | ¥3,278 |
| Premium | 20 GB | 30日間 | ¥5,478 |
| Ultra | 50 GB | 30日間 | ¥11,000 |
| Unlimited | 無制限 | 30日間 | ¥16,500 |

## 追加データ
- 1GB追加: ¥550（プラン残り期間有効）
- アプリからいつでも購入可能

## プラン選びのおすすめ
- 短期旅行（3〜5日）、軽い利用: Lightプラン（3GB）
- 通常旅行（1〜2週間）、SNS・地図: Standardプラン（5GB）
- 長期滞在（1ヶ月）、中程度の利用: Valueプラン（10GB）
- ビジネス出張、ヘビーユース: PremiumまたはUltraプラン
- リモートワーク、動画視聴: Unlimitedプラン

## 購入方法
1. スマートフォンで yah.mobi にアクセス
2. 希望のプランを選択
3. 支払い完了（クレジットカード、Apple Pay、Google Pay）
4. QRコードがメールで即時届く
5. QRコードをスキャンしてeSIMをインストール（日本到着前にインストール可能）

## 支払い方法
- クレジット/デビットカード: Visa、Mastercard、American Express、JCB
- デジタルウォレット: Apple Pay、Google Pay
- すべての価格は消費税10%込み

## 対応デバイス
- iPhone XS以降（iOS 14以上）
- Google Pixel 3以降
- Samsung Galaxy S20以降
- その他eSIM対応Androidデバイス

## 有効期間について
- 日本国内でネットワークに初めて接続した時点から開始
- 購入日からではありません
- 旅行前にeSIMをインストールしておくことが可能`
  },
  // === REFUND DOCUMENTS ===
  {
    id: 'refund-policy-en',
    title: 'yah.mobile Refund & Cancellation Policy',
    language: 'en',
    content: `# yah.mobile Refund & Cancellation Policy

## Keywords: refund, cancel, cancellation, money back, return, charge, charged, billing, dispute, mistake, wrong, accidental, unauthorized, duplicate, double charge

## General Policy: No Refunds for Digital Products

eSIM is a digital product. Once payment is complete, refunds and cancellations are NOT available.

### Legal Basis
Japan's Act on Specified Commercial Transactions (特定商取引法), Article 15-3:
Digital content delivered electronically is exempt from the cooling-off period that applies to physical goods.

### Customer Consent
During purchase, customers must check a box confirming:
"I understand that this is a digital product and that refunds/cancellations are not available after payment."

## Exceptions (Refund IS Possible)

Refunds are available ONLY in these specific cases:

### 1. System Failure - eSIM Not Issued
If yah.mobile's system failed and the eSIM/QR code was never delivered after payment.
Evidence: No QR code email received within 24 hours of purchase.

### 2. Confirmed Duplicate Charge
If the same plan was charged twice due to a system error.
Evidence: Two identical charges on your credit card statement for the same plan/date.

### 3. Unauthorized Credit Card Use
If someone used your credit card without permission to purchase an eSIM.
Evidence: You did not make this purchase and can confirm with your card issuer.

## How to Request a Refund (Exception Cases Only)
1. Go to yah.mobi/app
2. Scroll to the CONTACT section
3. Fill out the contact form with:
   - Your email address used for purchase
   - Order number (from confirmation email)
   - Reason for refund request
   - Supporting evidence (screenshots, etc.)
4. We will review and respond within 2 business hours (9:00-21:00 JST)

## NOT Eligible for Refund
- "I changed my travel plans" - Not eligible
- "I bought the wrong plan" - Not eligible (but you can purchase additional data)
- "The speed is slow" - Not eligible (speed depends on network conditions)
- "I couldn't figure out how to install" - Not eligible (contact support for help)
- "I already have Wi-Fi" - Not eligible`
  },
  {
    id: 'refund-policy-ja',
    title: 'yah.mobile 返金・キャンセルポリシー',
    language: 'ja',
    content: `# yah.mobile 返金・キャンセルポリシー

## キーワード: 返金、キャンセル、返品、払い戻し、請求、課金、間違い、誤り、不正利用、二重課金、重複課金、お金を返して

## 基本ポリシー: デジタル商品のため返金不可

eSIMはデジタル商品です。お支払い完了後の返金・キャンセルはできません。

### 法的根拠
特定商取引法 第15条の3:
電子的に配信されるデジタルコンテンツは、物理的商品に適用されるクーリングオフ期間の対象外です。

### お客様の同意
購入時に以下のチェックボックスにチェックが必要です:
「本商品はデジタル商品であり、お支払い後の返金・キャンセルができないことを理解しました。」

## 例外（返金可能なケース）

以下の特定のケースのみ返金が可能です:

### 1. システム障害 - eSIM未発行
yah.mobileのシステム障害により、支払い後にeSIM/QRコードが配信されなかった場合。
証拠: 購入後24時間以内にQRコードメールが届いていない。

### 2. 確認済みの二重課金
システムエラーにより同じプランが2回課金された場合。
証拠: クレジットカード明細に同じプラン/日付で2件の同一請求がある。

### 3. クレジットカードの不正利用
許可なく他者がクレジットカードを使用してeSIMを購入した場合。
証拠: この購入を行っておらず、カード発行会社に確認できる。

## 返金リクエスト方法（例外ケースのみ）
1. yah.mobi/app にアクセス
2. CONTACTセクションまでスクロール
3. お問い合わせフォームに以下を記入:
   - 購入時に使用したメールアドレス
   - 注文番号（確認メールに記載）
   - 返金リクエストの理由
   - 証拠（スクリーンショット等）
4. 営業時間内（9:00-21:00 JST）2営業時間以内に確認・返信します

## 返金対象外
- 「旅行の予定が変わった」- 対象外
- 「間違ったプランを購入した」- 対象外（追加データの購入は可能）
- 「速度が遅い」- 対象外（速度はネットワーク状況に依存）
- 「インストール方法がわからない」- 対象外（サポートにお問い合わせください）
- 「Wi-Fiがあるので不要になった」- 対象外`
  },
  // === INSTALLATION GUIDES ===
  {
    id: 'install-guide-iphone-en',
    title: 'How to Install eSIM on iPhone - Step by Step',
    language: 'en',
    content: `# How to Install yah.mobile eSIM on iPhone

## Keywords: install, installation, setup, QR code, scan, add eSIM, iPhone, iOS, how to install, can't install, installation failed, not showing, doesn't appear

## Before You Start
- Device: iPhone XS or later
- OS: iOS 14 or later
- Connection: Stable Wi-Fi required during installation
- QR Code: Have your QR code ready (from purchase confirmation email)

## Installation Steps

### Step 1: Open eSIM Settings
Settings > Cellular > Add eSIM (or "Add Cellular Plan" on older iOS)

### Step 2: Scan QR Code
- Tap "Use QR Code"
- Point camera at the QR code from your email
- Wait for "Cellular Plan Detected" message

### Step 3: Confirm Installation
- Tap "Continue" when prompted
- Label the plan as "yah.mobile" or "Travel" for easy identification
- Tap "Done"

### Step 4: Configure (IMPORTANT)
After installation, configure these settings:
- Settings > Cellular > yah.mobile > Turn ON "Data Roaming"
- Settings > Cellular > Cellular Data > Select yah.mobile
- Settings > Cellular > yah.mobile > Cellular Data Network > APN: yah.mobile

## Common Installation Issues

### "eSIM Not Supported" Error
- Your device may be carrier-locked. Contact your carrier for unlock.
- Check: Settings > General > About > look for "EID" field

### QR Code Won't Scan
- Ensure good lighting and steady hand
- Try zooming in on the QR code
- Alternative: Use manual entry (SM-DP+ address and activation code from email)

### "Unable to Complete" Error
- Check Wi-Fi connection is stable
- Restart device and try again
- If on airplane: connect to airport Wi-Fi first

### eSIM Installed But Not Showing
- Go to Settings > Cellular > check all plans listed
- May need to restart device after installation
- Check if the plan is toggled ON

## When to Install
- You can install BEFORE arriving in Japan
- The plan validity starts when you first connect to network in Japan
- Recommended: Install at home before your trip while on Wi-Fi`
  },
  {
    id: 'install-guide-iphone-ja',
    title: 'iPhone eSIMインストール方法 - ステップバイステップ',
    language: 'ja',
    content: `# iPhone yah.mobile eSIMインストール方法

## キーワード: インストール、設定、QRコード、スキャン、追加、iPhone、iOS、インストール方法、インストールできない、失敗、表示されない、出てこない

## 始める前に
- デバイス: iPhone XS以降
- OS: iOS 14以降
- 接続: インストール中は安定したWi-Fi接続が必要
- QRコード: 購入確認メールのQRコードを準備

## インストール手順

### ステップ1: eSIM設定を開く
設定 > モバイル通信 > eSIMを追加（古いiOSでは「モバイル通信プランを追加」）

### ステップ2: QRコードをスキャン
- 「QRコードを使用」をタップ
- メールのQRコードにカメラを向ける
- 「モバイル通信プランが検出されました」メッセージを待つ

### ステップ3: インストールを確認
- 「続ける」をタップ
- プランに「yah.mobile」や「旅行用」などのラベルを付ける
- 「完了」をタップ

### ステップ4: 設定（重要）
インストール後、以下を設定:
- 設定 > モバイル通信 > yah.mobile > 「データローミング」をON
- 設定 > モバイル通信 > モバイルデータ通信 > yah.mobileを選択
- 設定 > モバイル通信 > yah.mobile > モバイルデータ通信ネットワーク > APN: yah.mobile

## よくあるインストールの問題

### 「eSIMに対応していません」エラー
- デバイスがキャリアロックされている可能性。キャリアにロック解除を依頼。
- 確認: 設定 > 一般 > 情報 > 「EID」フィールドがあるか確認

### QRコードがスキャンできない
- 明るい場所で安定した状態で撮影
- QRコードを拡大してみる
- 代替方法: 手動入力（メールのSM-DP+アドレスとアクティベーションコードを使用）

### 「完了できません」エラー
- Wi-Fi接続が安定しているか確認
- デバイスを再起動して再試行
- 飛行機内の場合: 空港Wi-Fiに接続してから

### インストールしたが表示されない
- 設定 > モバイル通信 > すべてのプランが表示されているか確認
- インストール後にデバイスの再起動が必要な場合あり
- プランのトグルがONになっているか確認

## インストールのタイミング
- 日本到着前にインストール可能
- プランの有効期間は日本でネットワークに初めて接続した時点から開始
- おすすめ: 旅行前に自宅のWi-Fiでインストール`
  },
  // === MULTILINGUAL "STILL NOT WORKING" DOCS ===
  {
    id: 'still-not-working-zh',
    title: 'eSIM 仍然无法连接 - 高级故障排除',
    language: 'zh',
    content: `# eSIM 仍然无法连接 - 高级故障排除

## 关键词: 还是不行、仍然连不上、试过了、不能用、同样的问题、没有解决、又、还是没信号、还是不能连接、连接失败

## 基本故障排除无效时的高级步骤:

### 检查1: 您在日本吗？
yah.mobile eSIM仅在日本境内有效。在其他国家或转机途中无法连接。

### 检查2: 设备是否已解锁？
运营商锁定的设备无法使用第三方eSIM。
确认方法: 插入其他运营商的SIM卡，如果不工作则设备已锁定。
解决方案: 联系原运营商申请解锁。

### 检查3: 删除并重新安装eSIM
1. 删除当前yah.mobile eSIM配置文件
2. 重新扫描原始QR码（同一QR码可多次使用）
3. 重新完成安装过程

### 检查4: 手动选择网络
设置 > 蜂窝网络 > 网络选择 > 关闭自动
寻找包含"Docomo"、"Softbank"或"KDDI"的网络并手动选择。

### 检查5: 日期和时间设置
确保"自动设置"已启用。日期/时间不正确可能导致网络认证失败。

### 以上都不行？
请通过 yah.mobi/app 的联系表单联系我们。营业时间内2小时内回复。`
  },
  {
    id: 'still-not-working-ko',
    title: 'eSIM 여전히 연결 안됨 - 고급 문제 해결',
    language: 'ko',
    content: `# eSIM 여전히 연결 안됨 - 고급 문제 해결

## 키워드: 여전히 안돼, 아직 안됨, 다 해봤어, 안되네, 같은 문제, 해결안됨, 또, 아직 신호없음, 연결안됨, 오류

## 기본 문제 해결이 안 될 때 고급 단계:

### 확인1: 일본에 계신가요?
yah.mobile eSIM은 일본 내에서만 작동합니다. 다른 국가나 경유 중에는 연결되지 않습니다.

### 확인2: 기기가 잠금 해제되었나요?
통신사 잠금 기기는 타사 eSIM을 사용할 수 없습니다.
확인 방법: 다른 통신사 SIM을 넣어보세요. 안 되면 잠금 상태입니다.
해결: 원래 통신사에 잠금 해제를 요청하세요.

### 확인3: eSIM 삭제 후 재설치
1. 현재 yah.mobile eSIM 프로필 삭제
2. 원래 QR 코드를 다시 스캔 (같은 QR 코드 여러 번 사용 가능)
3. 설치 과정을 다시 완료

### 확인4: 수동 네트워크 선택
설정 > 셀룰러 > 네트워크 선택 > 자동 끄기
"Docomo", "Softbank", "KDDI"가 포함된 네트워크를 찾아 수동 선택.

### 확인5: 날짜 및 시간 설정
"자동 설정"이 활성화되어 있는지 확인. 날짜/시간이 잘못되면 네트워크 인증에 실패할 수 있습니다.

### 위 모든 방법이 안 될 경우
yah.mobi/app 문의 양식으로 연락해 주세요. 영업시간 내 2시간 이내 답변드립니다.`
  },
  {
    id: 'still-not-working-th',
    title: 'eSIM ยังเชื่อมต่อไม่ได้ - การแก้ไขขั้นสูง',
    language: 'th',
    content: `# eSIM ยังเชื่อมต่อไม่ได้ - การแก้ไขปัญหาขั้นสูง

## คำสำคัญ: ยังไม่ได้, ยังเชื่อมต่อไม่ได้, ลองแล้ว, ไม่ได้ผล, ปัญหาเดิม, ยังไม่แก้ไข, อีกครั้ง, ยังไม่มีสัญญาณ, เชื่อมต่อไม่ได้, ข้อผิดพลาด

## ขั้นตอนขั้นสูงเมื่อการแก้ไขพื้นฐานไม่ได้ผล:

### ตรวจสอบ 1: คุณอยู่ในญี่ปุ่นหรือไม่?
yah.mobile eSIM ใช้งานได้เฉพาะในญี่ปุ่นเท่านั้น

### ตรวจสอบ 2: อุปกรณ์ปลดล็อคแล้วหรือไม่?
อุปกรณ์ที่ล็อคกับผู้ให้บริการไม่สามารถใช้ eSIM ของบุคคลที่สาม
วิธีตรวจสอบ: ใส่ SIM จากผู้ให้บริการอื่น ถ้าใช้ไม่ได้แสดงว่าอุปกรณ์ถูกล็อค

### ตรวจสอบ 3: ลบและติดตั้ง eSIM ใหม่
1. ลบโปรไฟล์ eSIM yah.mobile ปัจจุบัน
2. สแกน QR code เดิมอีกครั้ง (ใช้ QR code เดิมได้หลายครั้ง)
3. ทำขั้นตอนการติดตั้งใหม่

### ตรวจสอบ 4: เลือกเครือข่ายด้วยตนเอง
ตั้งค่า > เซลลูลาร์ > เลือกเครือข่าย > ปิดอัตโนมัติ
มองหาเครือข่ายที่มี "Docomo", "Softbank" หรือ "KDDI"

### หากวิธีข้างต้นไม่ได้ผล
กรุณาติดต่อเราผ่านแบบฟอร์มที่ yah.mobi/app ตอบกลับภายใน 2 ชั่วโมงในเวลาทำการ`
  },
  {
    id: 'still-not-working-vi',
    title: 'eSIM vẫn không kết nối được - Xử lý nâng cao',
    language: 'vi',
    content: `# eSIM vẫn không kết nối được - Xử lý sự cố nâng cao

## Từ khóa: vẫn không được, vẫn không kết nối, đã thử, không hoạt động, cùng vấn đề, chưa giải quyết, lại, vẫn không có tín hiệu, kết nối thất bại, lỗi

## Các bước nâng cao khi xử lý cơ bản không hiệu quả:

### Kiểm tra 1: Bạn đang ở Nhật Bản không?
eSIM yah.mobile chỉ hoạt động trong lãnh thổ Nhật Bản.

### Kiểm tra 2: Thiết bị đã được mở khóa chưa?
Thiết bị bị khóa mạng không thể sử dụng eSIM của bên thứ ba.
Cách kiểm tra: Lắp SIM của nhà mạng khác. Nếu không hoạt động, thiết bị đã bị khóa.

### Kiểm tra 3: Xóa và cài đặt lại eSIM
1. Xóa hồ sơ eSIM yah.mobile hiện tại
2. Quét lại mã QR gốc (có thể sử dụng cùng mã QR nhiều lần)
3. Hoàn thành lại quy trình cài đặt

### Kiểm tra 4: Chọn mạng thủ công
Cài đặt > Di động > Chọn mạng > Tắt Tự động
Tìm mạng có "Docomo", "Softbank" hoặc "KDDI" và chọn thủ công.

### Nếu tất cả đều không hiệu quả
Vui lòng liên hệ qua biểu mẫu tại yah.mobi/app. Phản hồi trong 2 giờ trong giờ làm việc.`
  },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const doc of GRANULAR_DOCS) {
    try {
      // Check if document with this title already exists
      const [existing] = await conn.execute(
        'SELECT id FROM rag_documents WHERE title = ?',
        [doc.title]
      );
      
      // Generate embedding
      const embedding = await getEmbedding(doc.content);
      
      if (existing.length > 0) {
        // Update existing
        await conn.execute(
          'UPDATE rag_documents SET content = ?, embedding = ? WHERE id = ?',
          [doc.content, JSON.stringify(embedding), existing[0].id]
        );
        console.log(`✅ Updated: ${doc.title}`);
      } else {
        // Insert new
        await conn.execute(
          'INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())',
          [doc.title, doc.content, JSON.stringify(embedding)]
        );
        console.log(`✅ Created: ${doc.title}`);
      }
      successCount++;
      
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`❌ Error for ${doc.title}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`\n=== DONE: ${successCount} success, ${errorCount} errors ===`);
  await conn.end();
}

main().catch(console.error);
