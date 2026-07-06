/**
 * Firestore DB ハンドル（named DB 分離）
 *
 * - chatDb    : chat 専用 named DB「chat」。chat の全読み書きはこちら。
 * - defaultDb : 販売 (default) DB。🚨 read-only（顧客データ参照のみ）。
 *               書き込み・削除・ルール変更は絶対にしない（yah.mobi 保護）。
 */
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) admin.initializeApp();

/** chat named DB の database ID（トリガーの database オプションにも使用） */
export const CHAT_DATABASE_ID = "chat";

/** chat 専用 DB（read/write） */
export const chatDb = getFirestore(CHAT_DATABASE_ID);

/** 販売 (default) DB — read-only。orders / esim_links / users の参照のみ */
export const defaultDb = getFirestore();
