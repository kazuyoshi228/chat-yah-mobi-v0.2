/**
 * Firestore シードデータ投入 — 一時的な HTTPS Callable
 * デプロイ後に一度呼び出し、シードデータ作成後に削除する
 */
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const seedFirestore = onRequest(
  { region: "asia-northeast1" },
  async (_req, res) => {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // chat_rag_documents
    batch.set(db.collection("chat_rag_documents").doc(), {
      title: "eSIMの設定方法",
      content: "eSIMを設定するには、まず端末の設定アプリを開き、モバイル通信 > eSIM追加を選択します。QRコードをスキャンするか、手動で設定情報を入力してください。",
      category: "setup", createdAt: now, updatedAt: now,
    });
    batch.set(db.collection("chat_rag_documents").doc(), {
      title: "対応端末一覧",
      content: "iPhone XS以降、Google Pixel 3a以降、Samsung Galaxy S20以降のeSIM対応端末でご利用いただけます。",
      category: "device", createdAt: now, updatedAt: now,
    });
    batch.set(db.collection("chat_rag_documents").doc(), {
      title: "料金プランについて",
      content: "yah.mobileでは1GB〜無制限まで、渡航先に応じた最適なプランをご用意しております。",
      category: "pricing", createdAt: now, updatedAt: now,
    });

    // chat_flow_nodes
    batch.set(db.collection("chat_flow_nodes").doc("root"), {
      nodeId: "root", label: "お問い合わせ内容を選択してください", type: "menu",
      parentId: null, order: 0, children: ["setup", "billing", "trouble"], createdAt: now,
    });
    batch.set(db.collection("chat_flow_nodes").doc("setup"), {
      nodeId: "setup", label: "設定・接続について", type: "menu",
      parentId: "root", order: 0, children: [], createdAt: now,
    });
    batch.set(db.collection("chat_flow_nodes").doc("billing"), {
      nodeId: "billing", label: "料金・請求について", type: "menu",
      parentId: "root", order: 1, children: [], createdAt: now,
    });
    batch.set(db.collection("chat_flow_nodes").doc("trouble"), {
      nodeId: "trouble", label: "トラブル・不具合", type: "menu",
      parentId: "root", order: 2, children: [], createdAt: now,
    });

    // chat_quick_replies
    batch.set(db.collection("chat_quick_replies").doc(), {
      title: "ご挨拶", content: "yah.mobileカスタマーサポートへようこそ。どのようなご質問でしょうか？",
      category: "greeting", createdAt: now, updatedAt: now,
    });
    batch.set(db.collection("chat_quick_replies").doc(), {
      title: "設定案内", content: "eSIMの設定方法につきましては、購入時にお送りしたメールに記載のQRコードをスキャンしてください。",
      category: "setup", createdAt: now, updatedAt: now,
    });

    // plans
    batch.set(db.collection("plans").doc(), {
      name: "アジア 1GB / 7日間", region: "asia", dataAmount: "1GB", duration: "7日間",
      price: 980, currency: "JPY", active: true, createdAt: now,
    });
    batch.set(db.collection("plans").doc(), {
      name: "アジア 3GB / 15日間", region: "asia", dataAmount: "3GB", duration: "15日間",
      price: 1980, currency: "JPY", active: true, createdAt: now,
    });
    batch.set(db.collection("plans").doc(), {
      name: "ヨーロッパ 5GB / 30日間", region: "europe", dataAmount: "5GB", duration: "30日間",
      price: 3980, currency: "JPY", active: true, createdAt: now,
    });

    // competitorPlans
    batch.set(db.collection("competitorPlans").doc(), {
      competitor: "Airalo", name: "Asia 1GB", dataAmount: "1GB",
      duration: "7日間", price: 1200, currency: "JPY", createdAt: now,
    });
    batch.set(db.collection("competitorPlans").doc(), {
      competitor: "Holafly", name: "Asia Unlimited", dataAmount: "無制限",
      duration: "7日間", price: 2980, currency: "JPY", createdAt: now,
    });

    // hospitalityGuidelines
    batch.set(db.collection("hospitalityGuidelines").doc(), {
      title: "基本応対マナー",
      content: "お客様には常に敬語で対応し、感謝の気持ちを伝えてください。回答は簡潔で分かりやすく、専門用語を避けてください。",
      priority: 1, active: true, createdAt: now, updatedAt: now,
    });
    batch.set(db.collection("hospitalityGuidelines").doc(), {
      title: "エスカレーション基準",
      content: "3回以上のやりとりで解決しない場合、または返金要求がある場合は、すぐに管理者へエスカレーションしてください。",
      priority: 2, active: true, createdAt: now, updatedAt: now,
    });

    // improvements (SSoT)
    batch.set(db.collection("improvements").doc("ai_quality"), {
      cardKey: "ai_quality", nextDate: null, lastDate: null, notes: "", updatedAt: now,
    });

    // systemHealth
    batch.set(db.collection("systemHealth").doc("status"), {
      firestore: "operational", functions: "operational", auth: "operational", lastChecked: now,
    });

    await batch.commit();

    res.json({
      success: true,
      collections: {
        chat_rag_documents: 3, chat_flow_nodes: 4, chat_quick_replies: 2,
        plans: 3, competitorPlans: 2, hospitalityGuidelines: 2,
        improvements: 1, systemHealth: 1,
      },
    });
  }
);
