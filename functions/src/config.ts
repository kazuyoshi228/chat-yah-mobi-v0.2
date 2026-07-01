/**
 * 環境変数・定数定義
 *
 * 外部APIキー: ゼロ。
 * 全て GCP プロジェクト内のサービスアカウント認証。
 */

/** Gemini モデル設定 */
export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSION = 768;

/** RAG 設定 */
export const RAG_TOP_K = 5; // Vector Search で取得する上位件数
export const RAG_DISTANCE_THRESHOLD = 0.3; // 類似度閾値

/** チャット制限 */
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGES_PER_SESSION = 100;

/** データ保持期限 */
export const RETENTION_DAYS = 365 * 2; // 2年

/** Admin メールアドレス（エスカレーション通知先） */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@yah.mobi";

/** Google Sheets 仕訳帳 ID */
export const SHEETS_JOURNAL_ID = process.env.SHEETS_JOURNAL_ID || "";

/** Firebase リージョン */
export const REGION = "asia-northeast1"; // 東京
