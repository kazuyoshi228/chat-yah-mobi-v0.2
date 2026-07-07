"use strict";
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
exports.claimSession = void 0;
/**
 * claimSession — 匿名セッションを、ログイン後の本人アカウントに付け替える（会話継続）
 *
 * 背景: 訪問者は最初「匿名(uid_anon)」でチャット開始。既存顧客がログインすると
 *       uid が uid_real に変わり、進行中セッション（visitorId=uid_anon）のままだと
 *       個別参照（注文/eSIM）が効かない。本 Callable がセッションの所有者を
 *       安全に付け替え、同一 sessionId のまま会話を継続できるようにする。
 *
 * 🔒 セキュリティ:
 *   - anonIdToken を verifyIdToken して uid_anon を得る（＝匿名アカウントを保有していた証明）
 *   - セッションの現所有者が uid_anon であることを確認（他人のセッションは乗っ取れない=IDOR防止）
 *   - その上で visitorId を呼び出し元（uid_real）へ付け替える
 */
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db_1 = require("../db");
const config_1 = require("../config");
exports.claimSession = (0, https_1.onCall)({ region: config_1.REGION }, async (request) => {
    const uidReal = request.auth?.uid;
    if (!uidReal) {
        throw new https_1.HttpsError("unauthenticated", "ログインが必要です。");
    }
    const sessionId = request.data?.sessionId?.trim();
    const anonIdToken = request.data?.anonIdToken;
    if (!sessionId || !anonIdToken) {
        throw new https_1.HttpsError("invalid-argument", "sessionId と anonIdToken が必要です。");
    }
    // 匿名トークン検証 → uid_anon
    let anonUid;
    try {
        const decoded = await admin.auth().verifyIdToken(anonIdToken);
        anonUid = decoded.uid;
    }
    catch {
        throw new https_1.HttpsError("permission-denied", "匿名トークンが無効です。");
    }
    // 既に同一 uid（新規昇格ケース等）なら付け替え不要
    if (anonUid === uidReal) {
        return { migrated: false };
    }
    const ref = db_1.chatDb.doc(`chat_sessions/${sessionId}`);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "セッションが見つかりません。");
    }
    if (snap.data()?.visitorId !== anonUid) {
        throw new https_1.HttpsError("permission-denied", "このセッションの所有者ではありません。");
    }
    await ref.update({ visitorId: uidReal });
    return { migrated: true };
});
//# sourceMappingURL=claimSession.js.map