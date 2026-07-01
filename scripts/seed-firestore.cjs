/**
 * Firestore 初期コレクション作成スクリプト
 * 全 Admin ページが必要とするコレクションをシードデータ付きで作成
 */
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "yah-mobile-v1-3ed24" });
const db = admin.firestore();
const { Timestamp } = admin.firestore;
const now = Timestamp.now();

async function seed() {
  const batch = db.batch();

  // 1. ragDocuments — RAG ナレッジベース
  const rag1 = db.collection("ragDocuments").doc();
  batch.set(rag1, {
    title: "eSIMの設定方法",
    content: "eSIMを設定するには、まず端末の設定アプリを開き、モバイル通信 > eSIM追加を選択します。QRコードをスキャンするか、手動で設定情報を入力してください。",
    category: "setup",
    createdAt: now,
    updatedAt: now,
  });
  const rag2 = db.collection("ragDocuments").doc();
  batch.set(rag2, {
    title: "対応端末一覧",
    content: "iPhone XS以降、Google Pixel 3a以降、Samsung Galaxy S20以降のeSIM対応端末でご利用いただけます。",
    category: "device",
    createdAt: now,
    updatedAt: now,
  });
  const rag3 = db.collection("ragDocuments").doc();
  batch.set(rag3, {
    title: "料金プランについて",
    content: "yah.mobileでは1GB〜無制限まで、渡航先に応じた最適なプランをご用意しております。詳細はyah.mobiをご確認ください。",
    category: "pricing",
    createdAt: now,
    updatedAt: now,
  });

  // 2. chatFlowNodes — デシジョンツリー
  const flow1 = db.collection("chatFlowNodes").doc("root");
  batch.set(flow1, {
    nodeId: "root",
    label: "お問い合わせ内容を選択してください",
    type: "menu",
    parentId: null,
    order: 0,
    children: ["setup", "billing", "trouble"],
    createdAt: now,
  });
  const flow2 = db.collection("chatFlowNodes").doc("setup");
  batch.set(flow2, {
    nodeId: "setup",
    label: "設定・接続について",
    type: "menu",
    parentId: "root",
    order: 0,
    children: [],
    createdAt: now,
  });
  const flow3 = db.collection("chatFlowNodes").doc("billing");
  batch.set(flow3, {
    nodeId: "billing",
    label: "料金・請求について",
    type: "menu",
    parentId: "root",
    order: 1,
    children: [],
    createdAt: now,
  });
  const flow4 = db.collection("chatFlowNodes").doc("trouble");
  batch.set(flow4, {
    nodeId: "trouble",
    label: "トラブル・不具合",
    type: "menu",
    parentId: "root",
    order: 2,
    children: [],
    createdAt: now,
  });

  // 3. quickReplies — クイック返信テンプレート
  const qr1 = db.collection("quickReplies").doc();
  batch.set(qr1, {
    title: "ご挨拶",
    content: "yah.mobileカスタマーサポートへようこそ。どのようなご質問でしょうか？",
    category: "greeting",
    createdAt: now,
    updatedAt: now,
  });
  const qr2 = db.collection("quickReplies").doc();
  batch.set(qr2, {
    title: "設定案内",
    content: "eSIMの設定方法につきましては、購入時にお送りしたメールに記載のQRコードをスキャンしてください。",
    category: "setup",
    createdAt: now,
    updatedAt: now,
  });

  // 4. plans — eSIM プラン
  const plan1 = db.collection("plans").doc();
  batch.set(plan1, {
    name: "アジア 1GB / 7日間",
    region: "asia",
    dataAmount: "1GB",
    duration: "7日間",
    price: 980,
    currency: "JPY",
    active: true,
    createdAt: now,
  });
  const plan2 = db.collection("plans").doc();
  batch.set(plan2, {
    name: "アジア 3GB / 15日間",
    region: "asia",
    dataAmount: "3GB",
    duration: "15日間",
    price: 1980,
    currency: "JPY",
    active: true,
    createdAt: now,
  });

  // 5. competitorPlans — 競合他社プラン
  const cp1 = db.collection("competitorPlans").doc();
  batch.set(cp1, {
    competitor: "Airalo",
    name: "Asia 1GB",
    dataAmount: "1GB",
    duration: "7日間",
    price: 1200,
    currency: "JPY",
    createdAt: now,
  });

  // 6. hospitalityGuidelines — ホスピタリティ基準
  const hg1 = db.collection("hospitalityGuidelines").doc();
  batch.set(hg1, {
    title: "基本応対マナー",
    content: "お客様には常に敬語で対応し、感謝の気持ちを伝えてください。回答は簡潔で分かりやすく、専門用語を避けてください。",
    priority: 1,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  // 7. improvements — SSoT 改善カード
  const imp1 = db.collection("improvements").doc("ai_quality");
  batch.set(imp1, {
    cardKey: "ai_quality",
    nextDate: null,
    lastDate: null,
    notes: "",
    updatedAt: now,
  });

  // 8. systemHealth — システム状態
  const sh1 = db.collection("systemHealth").doc("status");
  batch.set(sh1, {
    firestore: "operational",
    functions: "operational",
    auth: "operational",
    lastChecked: now,
  });

  await batch.commit();
  console.log("✅ 全コレクション作成完了！");
  console.log("  - ragDocuments: 3件");
  console.log("  - chatFlowNodes: 4件");
  console.log("  - quickReplies: 2件");
  console.log("  - plans: 2件");
  console.log("  - competitorPlans: 1件");
  console.log("  - hospitalityGuidelines: 1件");
  console.log("  - improvements: 1件");
  console.log("  - systemHealth: 1件");
}

seed().catch(console.error);
