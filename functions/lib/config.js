"use strict";
/**
 * 環境変数・定数定義
 *
 * 外部APIキー: ゼロ。
 * 全て GCP プロジェクト内のサービスアカウント認証。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGION = exports.SHEETS_JOURNAL_ID = exports.ADMIN_EMAIL = exports.RETENTION_DAYS = exports.MAX_MESSAGES_PER_SESSION = exports.MAX_MESSAGE_LENGTH = exports.RAG_DISTANCE_THRESHOLD = exports.RAG_TOP_K = exports.EMBEDDING_DIMENSION = exports.GEMINI_EMBEDDING_MODEL = exports.GEMINI_MODEL = void 0;
/** Gemini モデル設定 */
exports.GEMINI_MODEL = "gemini-2.5-flash";
exports.GEMINI_EMBEDDING_MODEL = "text-embedding-004";
exports.EMBEDDING_DIMENSION = 768;
/** RAG 設定 */
exports.RAG_TOP_K = 5; // Vector Search で取得する上位件数
exports.RAG_DISTANCE_THRESHOLD = 0.3; // 類似度閾値
/** チャット制限 */
exports.MAX_MESSAGE_LENGTH = 2000;
exports.MAX_MESSAGES_PER_SESSION = 100;
/** データ保持期限 */
exports.RETENTION_DAYS = 365 * 2; // 2年
/** Admin メールアドレス（エスカレーション通知先） */
exports.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@yah.mobi";
/** Google Sheets 仕訳帳 ID */
exports.SHEETS_JOURNAL_ID = process.env.SHEETS_JOURNAL_ID || "";
/** Firebase リージョン */
exports.REGION = "asia-northeast1"; // 東京
//# sourceMappingURL=config.js.map