"use strict";
/**
 * checkQrResend — QRコード再送 Callable 関数
 *
 * クライアントから呼び出し可能な関数。
 * 処理:
 *   1. メールアドレスのバリデーション
 *   2. purchases コレクションからメールで検索
 *   3. Gmail API で QRコードメールを再送
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQrResend = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const config_1 = require("../config");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
/** メールアドレスの簡易バリデーション */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.checkQrResend = (0, https_1.onCall)({
    region: config_1.REGION,
}, async (request) => {
    const { email } = request.data;
    // ── バリデーション: email 必須 ──
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "メールアドレスは必須です。");
    }
    // ── バリデーション: email 形式チェック ──
    if (!EMAIL_REGEX.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "有効なメールアドレスを入力してください。");
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
    const purchasesWithQr = purchasesSnap.docs.filter((doc) => doc.data().qrCodeUrl);
    if (purchasesWithQr.length === 0) {
        return {
            success: false,
            message: "QRコードが含まれる購入履歴が見つかりませんでした。",
        };
    }
    // ── Gmail API で QRコードメールを再送 ──
    try {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/gmail.send"],
        });
        const gmail = googleapis_1.google.gmail({ version: "v1", auth });
        // 最新の購入から QR 情報を取得
        const latestPurchase = purchasesWithQr[0].data();
        const planName = latestPurchase.planName || "eSIMプラン";
        const qrCodeUrl = latestPurchase.qrCodeUrl;
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
        const raw = Buffer.from(`To: ${email}\r\n` +
            `From: ${config_1.ADMIN_EMAIL}\r\n` +
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\n` +
            `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
            body)
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
    }
    catch (error) {
        console.error("QRコード再送エラー:", error);
        throw new https_1.HttpsError("internal", "メール送信中にエラーが発生しました。しばらくしてからもう一度お試しください。");
    }
});
//# sourceMappingURL=qrResend.js.map