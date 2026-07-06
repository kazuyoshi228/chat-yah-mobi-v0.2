"use strict";
/**
 * yah.mobile チャットサポート — Cloud Functions エントリポイント（codebase: chat）
 *
 * 設計思想: シンプル・モダン・ミニマル・堅牢・安全
 * Cloud Functions: 4関数のみ
 * 外部APIキー: ゼロ / Google サービス依存: 4つのみ (Gemini, Firestore Vector, Gmail, Sheets)
 * 返金・QR 再取得は販売側で完結（chat 非関与）。顧客データは (default) を read-only で直接参照。
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
exports.dataRetentionPurge = exports.onRagDocumentWritten = exports.onSessionEnded = exports.onVisitorMessageCreated = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// ── Firestore トリガー (3関数) ──
var onVisitorMessageCreated_1 = require("./triggers/onVisitorMessageCreated");
Object.defineProperty(exports, "onVisitorMessageCreated", { enumerable: true, get: function () { return onVisitorMessageCreated_1.onVisitorMessageCreated; } });
var onSessionEnded_1 = require("./triggers/onSessionEnded");
Object.defineProperty(exports, "onSessionEnded", { enumerable: true, get: function () { return onSessionEnded_1.onSessionEnded; } });
var onRagDocumentWritten_1 = require("./triggers/onRagDocumentWritten");
Object.defineProperty(exports, "onRagDocumentWritten", { enumerable: true, get: function () { return onRagDocumentWritten_1.onRagDocumentWritten; } });
// ── Scheduled 関数 (1関数) ──
var dataRetention_1 = require("./scheduled/dataRetention");
Object.defineProperty(exports, "dataRetentionPurge", { enumerable: true, get: function () { return dataRetention_1.dataRetentionPurge; } });
//# sourceMappingURL=index.js.map