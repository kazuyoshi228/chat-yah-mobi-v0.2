/**
 * checkQrResend — QRコード再送 Callable 関数
 *
 * クライアントから呼び出し可能な関数。
 * 処理:
 *   1. メールアドレスのバリデーション
 *   2. purchases コレクションからメールで検索
 *   3. Gmail API で QRコードメールを再送
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { REGION, ADMIN_EMAIL } from "../config";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** メールアドレスの簡易バリデーション */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const checkQrResend = onCall(
  {
    region: REGION,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    const { email } = request.data as { email?: string };

    // ── バリデーション: email 必須 ──
    if (!email || typeof email !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "メールアドレスは必須です。"
      );
    }

    // ── バリデーション: email 形式チェック ──
    if (!EMAIL_REGEX.test(email)) {
      throw new HttpsError(
        "invalid-argument",
        "有効なメールアドレスを入力してください。"
      );
    }

    // ── purchases コレクションからメールで検索 ──
    const purchasesSnap = await db
      .collection("purchases")
      .where("email", "==", email.toLowerCase().trim())
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    if (purchasesSnap.empty) {
      return {
        success: false,
        message: "該当する購入履歴が見つかりませんでした。",
      };
    }

    // ── QRコード付き購入を抽出 ──
    const purchasesWithQr = purchasesSnap.docs.filter(
      (doc) => doc.data().qrCodeUrl
    );

    if (purchasesWithQr.length === 0) {
      return {
        success: false,
        message: "QRコードが含まれる購入履歴が見つかりませんでした。",
      };
    }

    // ── Gmail API で QRコードメールを再送 ──
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/gmail.send"],
      });
      const gmail = google.gmail({ version: "v1", auth });

      // 最新の購入から QR 情報を取得
      const latestPurchase = purchasesWithQr[0].data();
      const planName = (latestPurchase.planName as string) || "eSIMプラン";
      const qrCodeUrl = latestPurchase.qrCodeUrl as string;

      const subject = `[yah.mobile] QRコード再送: ${planName}`;
      const body = [
        `${email} 様`,
        "",
        "ご依頼いただいたQRコードを再送いたします。",
        "",
        `プラン名: ${planName}`,
        `QRコード: ${qrCodeUrl}`,
        "",
        "eSIMの設定方法については以下をご確認ください：",
        "https://yah.mobi/setup",
        "",
        "ご不明点がございましたら、チャットサポートまでお問い合わせください。",
        "",
        "yah.mobile サポートチーム",
      ].join("\n");

      const raw = Buffer.from(
        `To: ${email}\r\n` +
          `From: ${ADMIN_EMAIL}\r\n` +
          `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\n` +
          `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
          body
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      console.log(`QRコード再送完了: ${email}`);

      return {
        success: true,
        message: "QRコードを再送しました。メールをご確認ください。",
      };
    } catch (error) {
      console.error("QRコード再送エラー:", error);
      throw new HttpsError(
        "internal",
        "メール送信中にエラーが発生しました。しばらくしてからもう一度お試しください。"
      );
    }
  }
);
