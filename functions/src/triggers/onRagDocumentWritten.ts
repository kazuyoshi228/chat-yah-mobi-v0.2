/**
 * onRagDocumentWritten — RAGドキュメントの Embedding 自動生成
 *
 * トリガー: /chat_rag_documents/{id} の作成・更新・削除
 * 処理:
 *   - 作成/更新時: content から Gemini Embedding を生成し embedding フィールドに保存
 *   - 削除時: スキップ
 *   - content 未変更時: スキップ（不要な再計算防止）
 */

import {
  onDocumentWritten,
  FirestoreEvent,
  Change,
  DocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { chatDb as db, CHAT_DATABASE_ID } from "../db";
import { generateEmbedding } from "../utils/ai";
import { REGION } from "../config";

export const onRagDocumentWritten = onDocumentWritten(
  {
    document: "chat_rag_documents/{id}",
    database: CHAT_DATABASE_ID,
    region: REGION,
  },
  async (
    event: FirestoreEvent<
      Change<DocumentSnapshot> | undefined,
      { id: string }
    >
  ) => {
    if (!event.data) return;

    const { id } = event.params;
    const afterSnap = event.data.after;
    const beforeSnap = event.data.before;

    // ── ガード: 削除時はスキップ ──
    if (!afterSnap.exists) {
      console.log(`RAGドキュメント削除: ${id} — Embedding 更新不要`);
      return;
    }

    const afterData = afterSnap.data()!;
    const afterContent = afterData.content as string | undefined;

    // ── ガード: content が空の場合はスキップ ──
    if (!afterContent) {
      console.warn(`RAGドキュメント ${id}: content が空のため Embedding 生成をスキップ`);
      return;
    }

    // ── ガード: content 未変更 かつ embedding 済み ならスキップ ──
    // （embedding が欠けている場合は content 未変更でも生成する＝自己修復・backfill 対応）
    const hasEmbedding = afterData.embedding != null;
    if (beforeSnap.exists && hasEmbedding) {
      const beforeData = beforeSnap.data()!;
      const beforeContent = beforeData.content as string | undefined;
      if (beforeContent === afterContent) {
        console.log(`RAGドキュメント ${id}: content 未変更・embedding 済み — 再生成不要`);
        return;
      }
    }

    try {
      // ── Embedding 生成 ──
      const embedding = await generateEmbedding(afterContent);

      // ── Firestore に Embedding を保存 ──
      await db.doc(`chat_rag_documents/${id}`).update({
        embedding: admin.firestore.FieldValue.vector(embedding),
        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`RAGドキュメント ${id}: Embedding 生成完了`);
    } catch (error) {
      console.error(`RAGドキュメント ${id}: Embedding 生成エラー:`, error);
    }
  }
);
