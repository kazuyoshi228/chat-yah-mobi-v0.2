/**
 * ssoExchange — 親ページ（yah.mobi）のログインをウィジェットへ引き継ぐ（SSO）
 *
 * 背景: ウィジェットは chat.yah.mobi の iframe で、Firebase Auth の永続化はオリジン別のため
 *       yah.mobi でログイン済みでも iframe 内は匿名のまま。親ページの IDトークンを
 *       postMessage で受け取り、本 Callable でカスタムトークンに交換して
 *       signInWithCustomToken すれば、同一 uid（uid_real）でサインインできる。
 *
 * 🔒 セキュリティ:
 *   - 受け取った idToken を verifyIdToken（同一 Firebase プロジェクトの正規トークンのみ通る）
 *   - 発行するカスタムトークンは「そのトークンの uid 本人」のみ・追加 claims なし（権限昇格なし）
 *   - 管理者判定（isAdmin）は email_verified＋google.com＋許可ドメインで別途行われるため影響しない
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { REGION } from "../config";

export const ssoExchange = onCall({ region: REGION }, async (request) => {
  const idToken = (request.data?.idToken as string | undefined)?.trim();
  if (!idToken) {
    throw new HttpsError("invalid-argument", "idToken が必要です。");
  }

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    throw new HttpsError("permission-denied", "IDトークンが無効です。");
  }

  const token = await admin.auth().createCustomToken(uid);
  return { token };
});
