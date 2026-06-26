import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) })
  });
  const data = await res.json();
  return data.data[0].embedding;
}

const docs = [
  // eSIM対応端末リスト - Apple
  {
    title: "eSIM Compatible Devices - Apple iPhone (eSIM対応端末 - Apple iPhone)",
    content: `Apple iPhone eSIM対応端末一覧:
【対応】iPhone XR, XS, XS Max (2018〜), iPhone 11/11 Pro/11 Pro Max, iPhone SE 2 (2020), iPhone 12シリーズ, iPhone 13シリーズ (デュアルeSIM対応), iPhone SE 3 (2022), iPhone 14シリーズ (米国版はeSIMのみ), iPhone 15シリーズ, iPhone 16シリーズ/16e, iPhone 17シリーズ, iPhone Air (世界初グローバルeSIMのみ・中国でもeSIM対応)
【非対応】iPhone X以前の全モデル (iPhone 8, 7, 6s, SE第1世代等), 中国本土版iPhone (iPhone Air除く全モデル), 香港・マカオ版iPhone (13 mini, 12 mini, SE 2020, XS除く)
【重要】米国版iPhone 14以降は物理SIMスロットなし（eSIMのみ）。中国本土版は政府規制によりeSIM機能が無効化されている。`
  },
  // eSIM対応端末リスト - Samsung
  {
    title: "eSIM Compatible Devices - Samsung Galaxy (eSIM対応端末 - Samsung Galaxy)",
    content: `Samsung Galaxy eSIM対応端末一覧:
【対応】Galaxy S20〜S26シリーズ, Galaxy Note 20シリーズ, Galaxy Z Fold〜Z Fold7, Galaxy Z Flip〜Z Flip7, Galaxy Z TriFold, Galaxy A54 5G, A55 5G, A56, A35, A36, A17
【地域制限・非対応】
- 米国版: S20/S21, Note 20 Ultra, Z Fold/Z Fold2, Z Flip/Z Flip 5G → eSIM無効化
- 韓国版: S20〜S22, Note 20, Z Fold〜Z Fold3, Z Flip〜Z Flip3 → eSIM無効化 (S23以降は対応)
- 中国・香港・台湾版: 全Samsung端末 → eSIM無効化
【完全非対応】Galaxy S20 FE 4G/5G, Galaxy Aシリーズ大部分 (A54,A55,A35,A36,A56,A17,A23 5G除く), Galaxy Mシリーズ全モデル
【重要】同じモデルでも購入地域によってeSIM対応が異なる。モデル番号で判別可能。`
  },
  // eSIM対応端末リスト - Google, Xiaomi, OPPO
  {
    title: "eSIM Compatible Devices - Google Pixel, Xiaomi, OPPO (eSIM対応端末 - Pixel, Xiaomi, OPPO)",
    content: `Google Pixel eSIM対応:
【対応】Pixel 2以降の全モデル (2〜10, Fold, aシリーズ含む)
【非対応】オーストラリア・台湾・日本版Pixel 3, 東南アジア版・Verizon版Pixel 3a, 香港版全Pixel

Xiaomi eSIM対応:
【対応】Xiaomi 12T Pro, 13〜17シリーズ, Redmi Note 13 Pro+〜15 Pro+, Poco X7/X8 Pro Max/F8 Pro/F8 Ultra
【非対応】Xiaomi 12以前の全モデル, Redmi/Pocoの大部分

OPPO eSIM対応:
【対応】Find X3〜X9シリーズ, Find N2 Flip/N3/N3 Flip/N5, Reno 14〜15シリーズ, A55s 5G (日本版)
【非対応】Liteシリーズ全モデル, Reno 7以前の大部分, Aシリーズの大部分`
  },
  // eSIM対応端末リスト - Sony, Motorola, その他
  {
    title: "eSIM Compatible Devices - Sony, Motorola, Others (eSIM対応端末 - Sony, Motorola, その他)",
    content: `Sony Xperia eSIM対応:
【対応】Xperia 1 IV〜VIII, 5 IV〜V, 10 III Lite〜VII, Ace III
【非対応】Xperia 1 III以前, 5 III以前, 10 III (Lite除く) 以前

Motorola eSIM対応:
【対応】Razr全モデル (2019〜70 Ultra), Edge 2022以降全モデル, Moto G34〜G86の一部
【非対応】Moto Eシリーズ全モデル, 旧Gシリーズ

その他メーカー:
- Huawei: P40, P40 Pro, Mate 40 Pro, Pura 70 Pro のみ対応
- Honor: Magic 4 Pro〜8 Pro, Honor 90/200 Pro/400 Lite, Magic V2〜V6
- Vivo: X80 Pro〜X300 Pro, V29/V40/V50, iQOO 15
- OnePlus: 11, 12, 13, 13R, 15, Open のみ対応 (10以前は非対応)
- Sharp: AQUOS sense4 lite〜9, R7〜R10, wish〜wish3 (日本市場限定)
- Nokia: G60, XR21, X30 のみ対応

【完全非対応メーカー】LG (全モデル・事業撤退済み), Tecno, Infinix, itel, Ulefone, Doogee, Oukitel等の格安中国ブランド, 全フィーチャーフォン, 2017年以前の全スマートフォン`
  },
  // SIMロック状況 - 日本
  {
    title: "SIM Lock Status Japan - History and Current Rules (日本のSIMロック状況 - 歴史と現在の規制)",
    content: `日本のSIMロック状況:
【現在の規制】2021年10月1日以降に発売された端末はSIMロック原則禁止（総務省ガイドライン改正）。新品端末は100%SIMフリーで販売。
【中古市場の問題】2021年10月以前に購入されたドコモ・au・ソフトバンク版端末にはSIMロックが残存。中古市場の約30-40%はSIMロック端末と推定。2024年度の中古スマートフォン販売台数は321.4万台。
【SIMロック解除方法】
- NTTドコモ: My docomoから無料で解除可能。購入後100日経過が条件。
- KDDI (au): My auから無料で解除可能。購入後100日経過が条件。
- ソフトバンク: My SoftBankから無料で解除可能。購入後100日経過が条件。
- 店頭での解除: 手数料3,300円が発生する場合あり。
【確認方法】iPhone: 設定→一般→情報→「SIMロック」欄。Android: 設定→端末情報→SIMカード状態。
【yah.mobileへの影響】SIMロック端末ではeSIMプロファイルのインストールが失敗する。解除後に再試行が必要。`
  },
  // SIMロック状況 - 米国
  {
    title: "SIM Lock Status USA - Carrier Unlock Policies (米国のSIMロック状況 - キャリア解除ポリシー)",
    content: `米国のSIMロック状況:
【現状】米国はSIMロックが依然として一般的。新品端末の約88%がキャリアロック状態で販売される。アンロック端末の比率は約12%。
【各キャリアの解除ポリシー】
- AT&T: 端末代金完済後60日で自動解除。プリペイドは6ヶ月使用後。オンラインで申請可能。
- T-Mobile: 端末代金完済後に申請で解除。40日以上のアクティブ利用が条件。
- Verizon: 2019年以降の端末は購入後60日で自動解除。
【重要な注意点】
- 米国版Samsung Galaxy S20/S21, Note 20 Ultra, Z Fold/Z Fold2, Z Flip 5GはSIMロック解除してもeSIM機能が無効化されている。物理SIMのみ使用可能。
- 米国版iPhone 14以降は物理SIMスロットがないため、eSIMのみで運用。
- 割賦支払い中の端末は解除不可。完済が必須条件。
【yah.mobileへの影響】米国からの旅行者で割賦支払い中の端末を持つ場合、eSIMインストール不可。完済証明が必要。`
  },
  // SIMロック状況 - 中国・韓国
  {
    title: "SIM Lock Status China & Korea (中国・韓国のSIMロック状況)",
    content: `中国のSIMロック状況:
【現状】法律によりSIMロック端末の販売が禁止。全端末がSIMフリー。
【eSIM制限】中国政府の通信規制により、中国本土版のiPhone (iPhone Air除く)、Samsung、Huawei等はeSIM機能が無効化されている。
【yah.mobileへの影響】中国本土版端末を持つ旅行者はeSIMを利用できない。iPhone Airのみ例外。物理SIMカードの代替案を提案する必要がある。

韓国のSIMロック状況:
【現状】SIMロックが事実上存在しない市場。2010年に完全自由化。
【eSIM制限】韓国版Samsung Galaxy S20〜S22, Note 20, Z Fold〜Z Fold3, Z Flip〜Z Flip3はeSIM非対応。S23以降、Z Fold4以降、Z Flip4以降、A54 5Gは対応。
【yah.mobileへの影響】韓国からの旅行者で旧型Samsung端末を持つ場合、eSIM非対応の可能性が高い。モデル番号で確認が必要。`
  },
  // SIMロック状況 - タイ・ベトナム
  {
    title: "SIM Lock Status Thailand & Vietnam (タイ・ベトナムのSIMロック状況)",
    content: `タイのSIMロック状況:
【現状】SIMロックの概念がほぼ存在しない市場。AIS、True Corp、DTACの主要キャリアが存在するが、端末販売にSIMロックを設定する慣行がない。年間出荷約2,000万台は全てSIMフリー。
【yah.mobileへの影響】タイ国内で購入された端末はSIMロックの問題なし。eSIM対応はモデルに依存。

ベトナムのSIMロック状況:
【現状】SIMロックが存在しない市場。Viettel、Mobifone、Vinaphoneの3大キャリアが市場を支配するが、端末にSIMロックを設定する慣行はない。
【中古市場の注意】海外からの輸入品（特に日本・米国からのキャリアロック端末）が少数流通。ハノイやホーチミンの携帯ショップでは5-10ドル程度でアンロックサービスが提供されている。
【yah.mobileへの影響】ベトナム国内で購入された端末はSIMロックの問題なし。ただし海外輸入の中古端末はSIMロック確認が必要。`
  },
  // 接続トラブル対応フロー
  {
    title: "Connection Troubleshooting - SIM Lock and Device Compatibility Check (接続トラブル対応 - SIMロック・端末互換性確認フロー)",
    content: `eSIM接続トラブルの対応フロー:

【Step 1: 端末メーカー・モデルの確認】
お客様に端末のメーカーとモデル名を確認。設定→端末情報で確認可能。

【Step 2: eSIM対応の確認】
- iPhone: XR/XS以降が対応（中国本土版・一部香港版除く）
- Samsung: S20以降が対応（米国版S20/S21、韓国版S22以前、中国・香港版除く）
- Google Pixel: 2以降が対応（一部地域版除く）
- Xiaomi: 12T Pro以降の一部モデルが対応
- その他: モデル別に確認が必要

【Step 3: 購入国・キャリアの確認】
同じモデルでも購入地域によってeSIM対応が異なる:
- 中国本土版: eSIM無効化（iPhone Air除く）
- 韓国版Samsung旧モデル: eSIM無効化
- 米国版Samsung S20/S21: eSIM無効化
- 香港版: 多くのモデルでeSIM無効化

【Step 4: SIMロック状態の確認】
- iPhone: 設定→一般→情報→「SIMロック」欄で「SIMロックなし」と表示されるか確認
- Android: *#06# をダイヤルしてEID (Embedded Identity Document) が表示されるか確認
- EIDが表示されない場合: eSIM非対応またはeSIM機能が無効化されている

【Step 5: SIMロック解除の案内】
- 日本のキャリア: My docomo / My au / My SoftBankから無料で解除可能
- 米国のキャリア: 端末代金完済後にキャリアに連絡して解除
- 解除後は端末を再起動してからeSIMインストールを再試行

【Step 6: 非対応端末の場合】
端末がeSIM非対応の場合:
- 物理SIMカードの代替サービスを案内（該当する場合）
- 対応端末への機種変更を提案
- レンタルWi-Fiルーターの利用を提案`
  },
  // よくある質問 - SIMロック関連
  {
    title: "FAQ - SIM Lock Issues for eSIM (よくある質問 - SIMロックとeSIM)",
    content: `SIMロック関連のよくある質問:

Q: SIMロックがかかっているかどうかはどうやって確認できますか？
A: iPhoneの場合: 設定→一般→情報→「SIMロック」欄を確認。「SIMロックなし」と表示されればOK。Androidの場合: 設定→端末情報→SIMカード状態で確認。または*#06#をダイヤルしてEIDが表示されるか確認。

Q: SIMロックを解除するにはどうすればいいですか？
A: 日本のキャリア端末の場合、各キャリアのマイページ（My docomo / My au / My SoftBank）から無料で解除できます。購入後100日経過が条件です。米国のキャリア端末は端末代金の完済が条件です。

Q: 中国版のiPhoneでeSIMは使えますか？
A: 中国本土版のiPhoneはeSIM機能が政府規制により無効化されています。iPhone Airのみ例外で、中国でもeSIM対応です。中国版iPhoneをお持ちの場合、物理SIMカードの代替をご検討ください。

Q: Samsung GalaxyでeSIMが使えないと言われました。
A: Samsung端末は購入地域によってeSIM対応が異なります。米国版Galaxy S20/S21、韓国版S22以前、中国・香港・台湾版の全Samsung端末はeSIM非対応です。モデル番号（SM-XXXX）で地域版を判別できます。

Q: iPhone 8/7/6sでeSIMは使えますか？
A: いいえ。eSIM対応はiPhone XR/XS (2018年発売) 以降のモデルのみです。iPhone X以前の端末ではeSIMは利用できません。

Q: eSIMをインストールしようとしたらエラーが出ます。
A: 以下を順番に確認してください: 1) 端末がeSIM対応モデルか 2) SIMロックが解除されているか 3) 安定したWi-Fi接続があるか 4) 端末のOSが最新か 5) 既存のeSIMプロファイル数が上限に達していないか`
  },
  // 多言語版 - 英語
  {
    title: "Device Compatibility Guide - English (端末互換性ガイド - 英語版)",
    content: `Device Compatibility for yah.mobile eSIM:

COMPATIBLE DEVICES:
- Apple: iPhone XR/XS or later (except Mainland China models, some Hong Kong models)
- Samsung: Galaxy S20 or later (except US models S20/S21, Korean models before S23, China/HK/TW models)
- Google: Pixel 2 or later (except some regional variants)
- Xiaomi: 12T Pro, 13-17 series, select Redmi/Poco models
- Others: See full list for Sony, Motorola, OPPO, OnePlus, Honor, Vivo

NOT COMPATIBLE:
- Any phone released before 2018
- Mainland China version iPhones (except iPhone Air)
- US version Samsung Galaxy S20/S21, Note 20, Z Fold/Fold2, Z Flip
- Korean version Samsung before Galaxy S23
- LG phones (all models)
- Budget brands: Tecno, Infinix, itel, etc.
- Feature phones

SIM LOCK CHECK:
- iPhone: Settings > General > About > "Carrier Lock" should show "No SIM restrictions"
- Android: Dial *#06# - if EID appears, eSIM is supported
- If your phone is carrier-locked, contact your carrier to unlock it before installing eSIM`
  },
  // 多言語版 - 中国語
  {
    title: "设备兼容性指南 - 中文 (端末互換性ガイド - 中国語版)",
    content: `yah.mobile eSIM 设备兼容性指南:

【重要提醒】中国大陆版iPhone（iPhone Air除外）、三星、华为等手机的eSIM功能已被禁用。这是中国政府通信法规的要求。如果您使用的是中国大陆版手机，无法使用eSIM服务。

兼容设备:
- 苹果: iPhone XR/XS及以后机型（中国大陆版除外，iPhone Air除外）
- 三星: Galaxy S20及以后机型（中国/香港/台湾版除外，美国版S20/S21除外）
- 谷歌: Pixel 2及以后机型（香港版除外）
- 小米: 12T Pro, 13-17系列, 部分Redmi/Poco机型
- 其他: 索尼、摩托罗拉、OPPO、一加等部分机型

不兼容:
- 中国大陆版所有iPhone（iPhone Air除外）
- 中国大陆版所有三星手机
- 2018年之前发布的所有手机
- LG所有机型
- 廉价品牌: Tecno, Infinix, itel等

如何确认eSIM是否可用:
- iPhone: 设置→通用→关于本机→查看"运营商锁"是否显示"无SIM卡限制"
- 安卓: 拨打*#06#，如果显示EID则支持eSIM`
  },
  // 多言語版 - 韓国語
  {
    title: "기기 호환성 가이드 - 한국어 (端末互換性ガイド - 韓国語版)",
    content: `yah.mobile eSIM 기기 호환성 가이드:

【중요】한국판 삼성 Galaxy S20~S22, Note 20, Z Fold~Z Fold3, Z Flip~Z Flip3는 eSIM이 비활성화되어 있습니다. Galaxy S23 이후, Z Fold4 이후, Z Flip4 이후, A54 5G는 eSIM을 지원합니다.

호환 기기:
- 애플: iPhone XR/XS 이후 모델 (중국 본토판 제외)
- 삼성: Galaxy S23 이후 (한국판 포함), S20~S22 (한국판 제외)
- 구글: Pixel 2 이후 모든 모델
- 샤오미: 12T Pro, 13~17 시리즈
- 기타: 소니, 모토로라, OPPO, 원플러스 일부 모델

비호환:
- 한국판 Galaxy S20~S22, Note 20, Z Fold~Z Fold3, Z Flip~Z Flip3
- 중국/홍콩/대만판 모든 삼성 기기
- 2018년 이전 출시된 모든 폰
- LG 모든 모델 (사업 철수)

SIM 잠금 확인:
- 한국에서 판매된 기기는 SIM 잠금이 없습니다
- eSIM 지원 여부만 확인하면 됩니다
- iPhone: 설정→일반→정보→"통신사 잠금" 확인
- Android: *#06# 다이얼하여 EID 표시 여부 확인`
  },
  // 多言語版 - タイ語
  {
    title: "คู่มือความเข้ากันได้ของอุปกรณ์ - ภาษาไทย (端末互換性ガイド - タイ語版)",
    content: `คู่มือความเข้ากันได้ของ yah.mobile eSIM:

อุปกรณ์ที่รองรับ:
- Apple: iPhone XR/XS ขึ้นไป (ยกเว้นรุ่นจีนแผ่นดินใหญ่)
- Samsung: Galaxy S20 ขึ้นไป (ยกเว้นรุ่นอเมริกา S20/S21, รุ่นเกาหลีก่อน S23, รุ่นจีน/ฮ่องกง/ไต้หวัน)
- Google: Pixel 2 ขึ้นไป
- Xiaomi: 12T Pro, ซีรีส์ 13-17
- อื่นๆ: Sony, Motorola, OPPO, OnePlus บางรุ่น

ไม่รองรับ:
- โทรศัพท์ที่วางจำหน่ายก่อนปี 2018
- iPhone รุ่นจีนแผ่นดินใหญ่ (ยกเว้น iPhone Air)
- Samsung รุ่นอเมริกา S20/S21
- LG ทุกรุ่น
- แบรนด์ราคาประหยัด: Tecno, Infinix, itel

การตรวจสอบ SIM Lock:
- โทรศัพท์ที่ซื้อในประเทศไทยไม่มี SIM Lock
- ตรวจสอบเฉพาะว่ารองรับ eSIM หรือไม่
- iPhone: ตั้งค่า→ทั่วไป→เกี่ยวกับ→"ล็อคผู้ให้บริการ"
- Android: กด *#06# ถ้าแสดง EID แสดงว่ารองรับ eSIM`
  },
  // 多言語版 - ベトナム語
  {
    title: "Hướng dẫn tương thích thiết bị - Tiếng Việt (端末互換性ガイド - ベトナム語版)",
    content: `Hướng dẫn tương thích eSIM yah.mobile:

Thiết bị tương thích:
- Apple: iPhone XR/XS trở lên (trừ phiên bản Trung Quốc đại lục)
- Samsung: Galaxy S20 trở lên (trừ phiên bản Mỹ S20/S21, phiên bản Hàn Quốc trước S23, phiên bản Trung Quốc/Hồng Kông/Đài Loan)
- Google: Pixel 2 trở lên
- Xiaomi: 12T Pro, dòng 13-17
- Khác: Sony, Motorola, OPPO, OnePlus một số model

Không tương thích:
- Điện thoại ra mắt trước năm 2018
- iPhone phiên bản Trung Quốc đại lục (trừ iPhone Air)
- Samsung phiên bản Mỹ S20/S21
- Tất cả điện thoại LG
- Thương hiệu giá rẻ: Tecno, Infinix, itel

Kiểm tra SIM Lock:
- Điện thoại mua tại Việt Nam không có SIM Lock
- Điện thoại nhập khẩu từ Nhật/Mỹ có thể bị khóa mạng
- iPhone: Cài đặt→Cài đặt chung→Giới thiệu→"Khóa nhà mạng"
- Android: Bấm *#06# nếu hiện EID thì hỗ trợ eSIM
- Nếu bị khóa mạng, liên hệ nhà mạng gốc để mở khóa trước khi cài eSIM`
  }
];

async function main() {
  const pool = mysql.createPool(DATABASE_URL);
  
  // Delete old device-related docs to avoid duplicates
  await pool.execute(
    `DELETE FROM rag_documents WHERE title LIKE '%eSIM Compatible%' OR title LIKE '%SIM Lock Status%' OR title LIKE '%Connection Troubleshooting%' OR title LIKE '%Device Compatibility%' OR title LIKE '%设备兼容性%' OR title LIKE '%기기 호환성%' OR title LIKE '%ความเข้ากันได้%' OR title LIKE '%tương thích thiết bị%' OR title LIKE '%FAQ - SIM Lock%'`
  );
  console.log(`Deleted old device/SIM lock RAG docs`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`[${i+1}/${docs.length}] Embedding: ${doc.title.slice(0, 50)}...`);
    const embedding = await getEmbedding(doc.title + ' ' + doc.content);
    
    await pool.execute(
      `INSERT INTO rag_documents (title, content, embedding, createdAt) VALUES (?, ?, ?, NOW())`,
      [doc.title, doc.content, JSON.stringify(embedding)]
    );
    console.log(`  ✓ Inserted`);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Done! Inserted ${docs.length} device/SIM lock RAG documents.`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
