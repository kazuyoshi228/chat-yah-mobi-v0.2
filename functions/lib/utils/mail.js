"use strict";
/**
 * mail.ts — Gmail 送信の共通ユーティリティ
 *
 * 🔑 認証は ADC（Cloud Functions のサービスアカウント）。外部APIキー無し。
 *    エスカレーション通知（handleEscalation）と L1 の下書き承認通知で共用。
 *    ※ 送信元は既存のエスカレーション通知と同一の Gmail 経路（userId:"me"）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGmail = sendGmail;
const googleapis_1 = require("googleapis");
/**
 * プレーンテキストのメールを1通送信する。
 * 失敗しても例外を投げず false を返す（本体フローを止めない）。
 */
async function sendGmail(params) {
    try {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/gmail.send"],
        });
        const gmail = googleapis_1.google.gmail({ version: "v1", auth });
        const raw = Buffer.from(`To: ${params.to}\r\n` +
            `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=\r\n` +
            `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
            params.body)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
        await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
        });
        return true;
    }
    catch (error) {
        console.error("Gmail 送信エラー:", error);
        return false;
    }
}
//# sourceMappingURL=mail.js.map