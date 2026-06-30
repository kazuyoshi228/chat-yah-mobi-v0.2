/**
 * MySQL → Firestore 移行スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/migrateToFirestore.ts
 *
 * 環境変数:
 *   DATABASE_URL — MySQL 接続文字列
 *   GOOGLE_APPLICATION_CREDENTIALS — Firebase サービスアカウント JSON
 *
 * 対象コレクション:
 *   - chatSessions (+ messages サブコレクション)
 *   - surveys
 *   - ragDocuments
 *   - chatFlowNodes
 *   - plans
 *   - competitorPlans
 *   - customerProfiles
 *   - purchases
 *   - esimStatuses
 */

import * as admin from "firebase-admin";
import mysql from "mysql2/promise";

// ── Firebase 初期化 ──
admin.initializeApp();
const db = admin.firestore();

// ── MySQL 接続 ──
async function getConnection() {
  return mysql.createConnection({
    uri: process.env.DATABASE_URL!,
  });
}

// ── バッチ書き込みヘルパー ──
async function batchWrite(
  collectionName: string,
  docs: { id?: string; data: Record<string, unknown> }[]
) {
  const batchSize = 450; // Firestore batch limit = 500
  let written = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      const ref = doc.id
        ? db.collection(collectionName).doc(doc.id)
        : db.collection(collectionName).doc();
      batch.set(ref, {
        ...doc.data,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    written += chunk.length;
    console.log(`  [${collectionName}] ${written}/${docs.length} 件完了`);
  }

  return written;
}

// ── 各テーブルの移行 ──

async function migrateSessions(conn: mysql.Connection) {
  console.log("\n📋 chatSessions 移行開始...");
  const [rows] = await conn.query("SELECT * FROM chat_sessions ORDER BY id");
  const sessions = rows as Record<string, unknown>[];

  for (const session of sessions) {
    const sessionId = String(session.id);
    const sessionData = {
      visitorId: session.visitor_id as string,
      status: session.status as string,
      language: (session.language as string) || "ja",
      summary: session.summary || null,
      escalated: session.escalated === 1,
      createdAt: session.created_at
        ? admin.firestore.Timestamp.fromDate(new Date(session.created_at as string))
        : admin.firestore.FieldValue.serverTimestamp(),
      scheduledDeleteAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
      ),
    };

    await db.collection("chatSessions").doc(sessionId).set({
      ...sessionData,
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // メッセージのサブコレクション
    const [msgRows] = await conn.query(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at",
      [session.id]
    );
    const messages = msgRows as Record<string, unknown>[];

    if (messages.length > 0) {
      const batch = db.batch();
      for (const msg of messages) {
        const ref = db
          .collection("chatSessions")
          .doc(sessionId)
          .collection("messages")
          .doc(String(msg.id));
        batch.set(ref, {
          role: msg.role as string,
          content: msg.content as string,
          createdAt: msg.created_at
            ? admin.firestore.Timestamp.fromDate(new Date(msg.created_at as string))
            : admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
  }
  console.log(`  ✅ ${sessions.length} セッション完了`);
}

async function migrateTable(
  conn: mysql.Connection,
  tableName: string,
  collectionName: string,
  transform: (row: Record<string, unknown>) => Record<string, unknown>
) {
  console.log(`\n📋 ${collectionName} 移行開始...`);
  const [rows] = await conn.query(`SELECT * FROM ${tableName}`);
  const items = rows as Record<string, unknown>[];

  const docs = items.map((row) => ({
    id: String(row.id),
    data: transform(row),
  }));

  const count = await batchWrite(collectionName, docs);
  console.log(`  ✅ ${count} 件完了`);
}

// ── メイン実行 ──
async function main() {
  console.log("🚀 MySQL → Firestore 移行スクリプト開始");
  console.log("================================================\n");

  const conn = await getConnection();

  try {
    // 1. チャットセッション + メッセージ
    await migrateSessions(conn);

    // 2. アンケート
    await migrateTable(conn, "surveys", "surveys", (row) => ({
      sessionId: String(row.session_id),
      rating: row.rating as number,
      comment: row.free_comment || null,
      resolved: row.resolved === "yes",
      createdAt: row.created_at
        ? admin.firestore.Timestamp.fromDate(new Date(row.created_at as string))
        : admin.firestore.FieldValue.serverTimestamp(),
    }));

    // 3. RAG ドキュメント
    await migrateTable(conn, "rag_documents", "ragDocuments", (row) => ({
      title: row.title as string,
      content: row.content as string,
      category: row.category || "",
      isActive: row.is_active !== 0,
      // Note: embedding は onRagDocumentWritten トリガーが自動生成
    }));

    // 4. チャットフローノード
    await migrateTable(conn, "chat_flow_nodes", "chatFlowNodes", (row) => ({
      parentId: row.parent_id ? String(row.parent_id) : null,
      type: row.type as string,
      label: row.label as string,
      content: row.content || null,
      options: row.options || null,
      icon: row.icon || null,
      formTrigger: row.form_trigger || 0,
      aiTrigger: row.ai_trigger || 0,
      sortOrder: row.sort_order || 0,
      isActive: true,
    }));

    // 5. プラン
    await migrateTable(conn, "plans", "plans", (row) => ({
      name: row.name as string,
      dataAmount: row.data_amount as string,
      duration: row.duration as number,
      price: row.price as number,
      currency: row.currency || "JPY",
      isActive: row.is_active !== 0,
    }));

    // 6. 競合プラン
    await migrateTable(conn, "competitor_plans", "competitorPlans", (row) => ({
      provider: row.provider as string,
      name: row.name as string,
      dataAmount: row.data_amount as string,
      price: row.price as number,
      currency: row.currency || "JPY",
    }));

    console.log("\n================================================");
    console.log("✅ 移行完了！");
    console.log("\n⚠️  注意:");
    console.log("  - RAG ドキュメントの Embedding は Cloud Functions が自動生成します");
    console.log("  - customerProfiles / purchases / esimStatuses は");
    console.log("    webhookSync が yah.mobi から同期するため、ここでは移行不要");
    console.log("  - hospitalityGuidelines は管理画面から手動で追加してください");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌ 移行エラー:", err);
  process.exit(1);
});
